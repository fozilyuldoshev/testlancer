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

        return response.redirect("/login?error=oauth_not_configured")

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
