from project.request import Request
from project.response import Response
from app.service.auth_service import auth_service


class MainController:
    @staticmethod
    async def home(request: Request, response: Response):
        user = auth_service.get_user_from_request(request)
        if user:
            if user.get("role") == "teacher":
                return response.redirect("/teacher")
            return response.redirect("/student")
        return response.redirect("/login")

    @staticmethod
    async def login(request: Request, response: Response):
        user = auth_service.get_user_from_request(request)
        if user:
            if user.get("role") == "teacher":
                return response.redirect("/teacher")
            return response.redirect("/student")
        return response.html("login", {"title": "Login - Testlancer"})

    @staticmethod
    async def teacher(request: Request, response: Response):
        user = auth_service.get_user_from_request(request)
        if not user:
            return response.redirect("/login")
        if user.get("role") != "teacher":
            return response.redirect("/student")
        return response.html("teacher", {"title": "Teacher Dashboard - Testlancer", "user": user})

    @staticmethod
    async def student(request: Request, response: Response):
        user = auth_service.get_user_from_request(request)
        if not user:
            return response.redirect("/login")
        return response.html("student", {"title": "Student Dashboard - Testlancer", "user": user})

    @staticmethod
    async def create_test(request: Request, response: Response):
        user = auth_service.get_user_from_request(request)
        if not user:
            return response.redirect("/login")
        if user.get("role") != "teacher":
            return response.redirect("/student")
        return response.html("create-test", {"title": "Create Test - Testlancer", "user": user})

    @staticmethod
    async def take_test(request: Request, response: Response):
        user = auth_service.get_user_from_request(request)
        if not user:
            return response.redirect("/login")
        return response.html("take-test", {"title": "Take Test - Testlancer", "user": user})


main_controller = MainController()
