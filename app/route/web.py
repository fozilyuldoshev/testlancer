from app.controller.main_controller import main_controller
from app.controller.auth_controller import auth_controller
from app.controller.test_controller import test_controller
from project.route import Route

route = Route()

# Page Views
route.get("/", main_controller.home)
route.get("/login", main_controller.login)
route.get("/teacher", main_controller.teacher)
route.get("/student", main_controller.student)
route.get("/create-test", main_controller.create_test)
route.get("/take-test", main_controller.take_test)

# Authentication Endpoints
route.get("/auth/google", auth_controller.google_login)
route.get("/auth/google/callback", auth_controller.google_callback)
route.get("/logout", auth_controller.logout)
route.post("/logout", auth_controller.logout)
route.get("/api/me", auth_controller.me)

# Teacher API Endpoints
route.get("/api/teacher/stats", test_controller.teacher_stats)
route.get("/api/teacher/tests", test_controller.teacher_tests)
route.get("/api/teacher/tests/{id}", test_controller.teacher_get_test)
route.post("/api/teacher/tests", test_controller.teacher_create_test)
route.put("/api/teacher/tests/{id}", test_controller.teacher_update_test)
route.post("/api/teacher/tests/{id}/update", test_controller.teacher_update_test)
route.delete("/api/teacher/tests/{id}", test_controller.teacher_delete_test)
route.post("/api/teacher/tests/{id}/delete", test_controller.teacher_delete_test)
route.get("/api/teacher/tests/{id}/submissions", test_controller.teacher_test_submissions)

# Student API Endpoints
route.get("/api/student/stats", test_controller.student_stats)
route.get("/api/student/tests", test_controller.student_tests)
route.get("/api/student/tests/{id}", test_controller.student_get_test)
route.post("/api/student/tests/{id}/submit", test_controller.student_submit_test)
route.get("/api/leaderboard", test_controller.leaderboard)
