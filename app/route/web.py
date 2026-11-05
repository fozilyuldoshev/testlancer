from app.controller.main_controller import main_controller
from project.route import Route

route = Route()

route.get("/", main_controller.home)
