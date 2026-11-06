from project.request import Request
from project.response import Response
from app.service.auth_service import auth_service
from app.service.test_service import test_service


class TestController:
    @staticmethod
    def _require_auth(request: Request):
        return auth_service.get_user_from_request(request)

    @staticmethod
    def _require_teacher(request: Request):
        user = auth_service.get_user_from_request(request)
        if not user or user.get("role") != "teacher":
            return None
        return user

    # --- TEACHER APIS ---

    @staticmethod
    async def teacher_stats(request: Request, response: Response):
        user = TestController._require_teacher(request)
        if not user:
            return response.json({"error": "Unauthorized: Teacher access required"}, status=403)

        stats = await test_service.get_teacher_stats(user["id"])
        return response.json({"stats": stats})

    @staticmethod
    async def teacher_tests(request: Request, response: Response):
        user = TestController._require_teacher(request)
        if not user:
            return response.json({"error": "Unauthorized: Teacher access required"}, status=403)

        tests = await test_service.get_teacher_tests(user["id"])
        return response.json({"tests": tests})

    @staticmethod
    async def teacher_get_test(request: Request, response: Response):
        user = TestController._require_teacher(request)
        if not user:
            return response.json({"error": "Unauthorized: Teacher access required"}, status=403)

        test_id = request.params.get("id") or request.query.get("id")
        if not test_id:
            return response.json({"error": "Missing test id"}, status=400)

        test = await test_service.get_test_details(test_id, include_correct=True)
        if not test:
            return response.json({"error": "Test not found"}, status=404)

        return response.json({"test": test})

    @staticmethod
    async def teacher_create_test(request: Request, response: Response):
        user = TestController._require_teacher(request)
        if not user:
            return response.json({"error": "Unauthorized: Teacher access required"}, status=403)

        data = await request.json()
        if not data or not data.get("title"):
            return response.json({"error": "Test title is required"}, status=400)

        test = await test_service.create_test(user["id"], data)
        if not test:
            return response.json({"error": "Failed to create test"}, status=500)

        return response.json({"success": True, "test": test}, status=201)

    @staticmethod
    async def teacher_update_test(request: Request, response: Response):
        user = TestController._require_teacher(request)
        if not user:
            return response.json({"error": "Unauthorized: Teacher access required"}, status=403)

        test_id = request.params.get("id") or request.query.get("id")
        if not test_id:
            return response.json({"error": "Missing test id"}, status=400)

        data = await request.json()
        test = await test_service.update_test(test_id, user["id"], data)
        if not test:
            return response.json({"error": "Failed to update test or test not found"}, status=404)

        return response.json({"success": True, "test": test})

    @staticmethod
    async def teacher_delete_test(request: Request, response: Response):
        user = TestController._require_teacher(request)
        if not user:
            return response.json({"error": "Unauthorized: Teacher access required"}, status=403)

        test_id = request.params.get("id") or request.query.get("id")
        if not test_id:
            return response.json({"error": "Missing test id"}, status=400)

        success = await test_service.delete_test(test_id, user["id"])
        if not success:
            return response.json({"error": "Failed to delete test or test not found"}, status=404)

        return response.json({"success": True, "message": "Test deleted successfully"})

    @staticmethod
    async def teacher_test_submissions(request: Request, response: Response):
        user = TestController._require_teacher(request)
        if not user:
            return response.json({"error": "Unauthorized: Teacher access required"}, status=403)

        test_id = request.params.get("id") or request.query.get("id")
        if not test_id:
            return response.json({"error": "Missing test id"}, status=400)

        submissions = await test_service.get_test_submissions(test_id, user["id"])
        return response.json({"submissions": submissions})

    # --- STUDENT & COMMON APIS ---

    @staticmethod
    async def student_stats(request: Request, response: Response):
        user = TestController._require_auth(request)
        if not user:
            return response.json({"error": "Authentication required"}, status=401)

        stats = await test_service.get_student_stats(user["id"])
        return response.json({"stats": stats})

    @staticmethod
    async def student_tests(request: Request, response: Response):
        user = TestController._require_auth(request)
        if not user:
            return response.json({"error": "Authentication required"}, status=401)

        tests = await test_service.get_student_tests(user["id"])
        return response.json({"tests": tests})

    @staticmethod
    async def student_get_test(request: Request, response: Response):
        user = TestController._require_auth(request)
        if not user:
            return response.json({"error": "Authentication required"}, status=401)

        test_id = request.params.get("id") or request.query.get("id")
        if not test_id:
            return response.json({"error": "Missing test id"}, status=400)

        # Do NOT include correct answer flags for students taking the test
        test = await test_service.get_test_details(test_id, include_correct=False)
        if not test:
            return response.json({"error": "Test not found"}, status=404)

        return response.json({"test": test})

    @staticmethod
    async def student_submit_test(request: Request, response: Response):
        user = TestController._require_auth(request)
        if not user:
            return response.json({"error": "Authentication required"}, status=401)

        test_id = request.params.get("id") or request.query.get("id")
        if not test_id:
            return response.json({"error": "Missing test id"}, status=400)

        data = await request.json()
        answers = data.get("answers", {})
        time_spent = int(data.get("time_spent", 0))

        result = await test_service.submit_test(test_id, user["id"], answers, time_spent)
        if not result:
            return response.json({"error": "Failed to evaluate and save test submission"}, status=500)

        return response.json({"success": True, "result": result})

    @staticmethod
    async def leaderboard(request: Request, response: Response):
        limit = int(request.query.get("limit", 50))
        rankings = await test_service.get_leaderboard(limit=limit)
        return response.json({"leaderboard": rankings})


test_controller = TestController()
