import uuid
from project.config import config
from project.request import Request
from project.response import Response
from project.log import log
from app.service.auth_service import auth_service


class AuthController:
    @staticmethod
    async def google_login(request: Request, response: Response):
        state = uuid.uuid4().hex
        
        # If Google Client ID is configured, redirect to Google OAuth
        if config.google_client_id and config.google_client_id.strip():
            auth_url = auth_service.get_google_auth_url(state)
            redirect = response.redirect(auth_url)
            redirect.set_cookie("oauth_state", state, max_age=300, httponly=True, samesite="lax")
            return redirect

        # If Google credentials are not yet configured in .env, redirect to convenient local login prompt
        # with guidance on setting up GOOGLE_CLIENT_ID or using local dev login
        return response.redirect("/login?dev_mode=true")

    @staticmethod
    async def google_callback(request: Request, response: Response):
        code = request.query.get("code")
        if not code:
            return response.redirect("/login?error=no_code")

        google_user = await auth_service.exchange_google_code(code)
        if not google_user or not google_user.get("email"):
            return response.redirect("/login?error=oauth_failed")

        email = google_user.get("email")
        name = google_user.get("name") or google_user.get("given_name") or email.split("@")[0].title()
        avatar = google_user.get("picture")

        user = await auth_service.find_or_create_user(email=email, name=name, avatar=avatar)
        if not user:
            return response.redirect("/login?error=user_creation_failed")

        token = auth_service.create_session_token(user)
        if not token:
            return response.redirect("/login?error=session_error")

        target_url = "/teacher" if user.get("role") == "teacher" else "/student"
        redirect = response.redirect(target_url)
        redirect.set_cookie(
            auth_service.SESSION_COOKIE_NAME,
            token,
            max_age=auth_service.SESSION_MAX_AGE,
            httponly=True,
            samesite="lax",
            path="/"
        )
        return redirect

    @staticmethod
    async def dev_login(request: Request, response: Response):
        # Allow instant developer testing when Google OAuth credentials are being setup
        data = await request.json() if request.method == "POST" else request.query
        email = data.get("email")
        role_hint = data.get("role")

        if not email:
            if role_hint == "teacher" and config.teacher_emails:
                email = config.teacher_emails[0]
            elif role_hint == "teacher":
                email = "teacher@gmail.com"
            else:
                email = "alex.johnson@student.edu"

        name = data.get("name")
        avatar = data.get("avatar")

        user = await auth_service.find_or_create_user(email=email, name=name, avatar=avatar)
        if not user:
            return response.json({"error": "Failed to create user"}, status=500)

        token = auth_service.create_session_token(user)
        target_url = "/teacher" if user.get("role") == "teacher" else "/student"

        if request.headers.get("accept", "").startswith("application/json") and request.method == "POST":
            json_resp = response.json({"success": True, "user": user, "redirect": target_url})
            json_resp.set_cookie(
                auth_service.SESSION_COOKIE_NAME,
                token,
                max_age=auth_service.SESSION_MAX_AGE,
                httponly=True,
                samesite="lax",
                path="/"
            )
            return json_resp

        redirect = response.redirect(target_url)
        redirect.set_cookie(
            auth_service.SESSION_COOKIE_NAME,
            token,
            max_age=auth_service.SESSION_MAX_AGE,
            httponly=True,
            samesite="lax",
            path="/"
        )
        return redirect

    @staticmethod
    async def logout(request: Request, response: Response):
        redirect = response.redirect("/login")
        redirect.delete_cookie(auth_service.SESSION_COOKIE_NAME, path="/")
        return redirect

    @staticmethod
    async def me(request: Request, response: Response):
        user = auth_service.get_user_from_request(request)
        if not user:
            return response.json({"authenticated": False, "user": None}, status=401)
        return response.json({"authenticated": True, "user": user})


auth_controller = AuthController()
