import uuid
import httpx
from typing import Optional, Any
from project.config import config
from project.db import db
from project.json import json
from project.log import log
from project.request import Request
from project.secret import secret


class AuthService:
    SESSION_COOKIE_NAME = "auth_session"
    SESSION_MAX_AGE = 60 * 60 * 24 * 7  # 7 days

    @staticmethod
    def get_google_auth_url(state: str) -> str:
        base_url = "https://accounts.google.com/o/oauth2/v2/auth"
        params = {
            "client_id": config.google_client_id,
            "redirect_uri": config.google_redirect_uri,
            "response_type": "code",
            "scope": "openid email profile",
            "access_type": "offline",
            "prompt": "select_account",
            "state": state
        }
        query_string = "&".join(f"{k}={v}" for k, v in params.items())
        return f"{base_url}?{query_string}"

    @staticmethod
    async def exchange_google_code(code: str) -> Optional[dict]:
        token_url = "https://oauth2.googleapis.com/token"
        userinfo_url = "https://www.googleapis.com/oauth2/v2/userinfo"

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                token_res = await client.post(
                    token_url,
                    data={
                        "code": code,
                        "client_id": config.google_client_id,
                        "client_secret": config.google_client_secret,
                        "redirect_uri": config.google_redirect_uri,
                        "grant_type": "authorization_code",
                    }
                )
                if token_res.status_code != 200:
                    log.error(f"Google token exchange failed: {token_res.text}")
                    return None

                token_data = token_res.json()
                access_token = token_data.get("access_token")
                if not access_token:
                    return None

                user_res = await client.get(
                    userinfo_url,
                    headers={"Authorization": f"Bearer {access_token}"}
                )
                if user_res.status_code != 200:
                    log.error(f"Google userinfo request failed: {user_res.text}")
                    return None

                return user_res.json()
        except Exception:
            log.exception("Error during Google OAuth exchange")
            return None

    @staticmethod
    def determine_role(email: str) -> str:
        return "teacher" if config.is_teacher_email(email) else "student"

    async def find_or_create_user(self, email: str, name: Optional[str] = None, avatar: Optional[str] = None) -> Optional[dict]:
        email = email.strip().lower()
        role = self.determine_role(email)
        display_name = name.strip() if name and name.strip() else email.split("@")[0].title()
        avatar_url = avatar or f"https://api.dicebear.com/7.x/avataaars/svg?seed={email}"

        for attempt in range(2):
            try:
                existing = await db.fetchrow("SELECT * FROM users WHERE LOWER(email) = $1", email)
                if existing:
                    # Update role and profile information if changed
                    row = await db.fetchrow(
                        """
                        UPDATE users 
                        SET name = $1, avatar = COALESCE($2, avatar), role = $3, updated_at = CURRENT_TIMESTAMP 
                        WHERE id = $4 
                        RETURNING *
                        """,
                        display_name,
                        avatar_url,
                        role,
                        existing["id"]
                    )
                    return dict(row) if row else dict(existing)
                else:
                    user_uuid = uuid.uuid4().hex
                    row = await db.fetchrow(
                        """
                        INSERT INTO users (uuid, email, name, avatar, role) 
                        VALUES ($1, $2, $3, $4, $5) 
                        RETURNING *
                        """,
                        user_uuid,
                        email,
                        display_name,
                        avatar_url,
                        role
                    )
                    return dict(row) if row else None
            except Exception as e:
                log.exception(f"Error finding/creating user for {email} on attempt {attempt + 1}")
                if attempt == 0:
                    # Auto-heal schema if missing columns
                    log.warning("Applying missing columns to users table...")
                    await db.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255) DEFAULT 'User' NOT NULL")
                    await db.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT")
                    await db.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(32) DEFAULT 'student' NOT NULL")
                    await db.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
                else:
                    return None
        return None

    @staticmethod
    def create_session_token(user: dict) -> Optional[str]:
        payload = {
            "id": user.get("id"),
            "uuid": user.get("uuid"),
            "email": user.get("email"),
            "name": user.get("name"),
            "avatar": user.get("avatar"),
            "role": user.get("role", "student"),
        }
        json_str = json.dumps(payload)
        if not json_str:
            return None
        return secret.encrypt(json_str)

    @staticmethod
    def get_user_from_request(request: Request) -> Optional[dict]:
        token = request.cookies.get(AuthService.SESSION_COOKIE_NAME)
        if not token:
            auth_header = request.headers.get("authorization", "")
            if auth_header.startswith("Bearer "):
                token = auth_header[7:].strip()

        if not token:
            return None

        decrypted = secret.decrypt(token)
        if not decrypted:
            return None

        user_data = json.loads(decrypted)
        if not isinstance(user_data, dict):
            return None

        # Dynamically refresh role based on current .env teacher list
        email = user_data.get("email", "")
        if email:
            user_data["role"] = "teacher" if config.is_teacher_email(email) else "student"

        return user_data


auth_service = AuthService()
