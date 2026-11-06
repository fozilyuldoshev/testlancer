from project.request import Request
from project.response import Response


class MainController:
    @staticmethod
    async def home(request: Request, response: Response):
        return response.html("login", {"title": "Login - Testlancer"})

    @staticmethod
    async def login(request: Request, response: Response):
        return response.html("login", {"title": "Login - Testlancer"})

    @staticmethod
    async def teacher(request: Request, response: Response):
        return response.html("teacher", {"title": "Teacher Dashboard - Testlancer"})

    @staticmethod
    async def student(request: Request, response: Response):
        return response.html("student", {"title": "Student Dashboard - Testlancer"})

    @staticmethod
    async def create_test(request: Request, response: Response):
        return response.html("create-test", {"title": "Create Test - Testlancer"})

    @staticmethod
    async def take_test(request: Request, response: Response):
        return response.html("take-test", {"title": "Take Test - Testlancer"})


main_controller = MainController()
