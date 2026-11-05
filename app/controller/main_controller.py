from project.request import Request
from project.response import Response


class MainController:
    @staticmethod
    async def home(request: Request, response: Response):
        context = {
            "title": "Testlancer",
            "welcome": "Welcome to Testlancer",
        }
        return response.html("index", context)


main_controller = MainController()
