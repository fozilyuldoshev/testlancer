from app.controller.main_controller import main_controller
from project.route import Route

route = Route()

route.get("/", main_controller.home)
route.get("/login", main_controller.login)
route.get("/teacher", main_controller.teacher)
route.get("/student", main_controller.student)
route.get("/create-test", main_controller.create_test)
route.get("/take-test", main_controller.take_test)
