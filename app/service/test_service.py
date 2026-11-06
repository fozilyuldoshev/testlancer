import uuid
from typing import Optional, Any
from project.db import db
from project.json import json
from project.log import log


class TestService:
    @staticmethod
    def _is_int(val: Any) -> bool:
        try:
            int(val)
            return True
        except (ValueError, TypeError):
            return False

    async def get_test_record(self, identifier: Any) -> Optional[dict]:
        try:
            if self._is_int(identifier):
                row = await db.fetchrow("SELECT * FROM tests WHERE id = $1", int(identifier))
            else:
                row = await db.fetchrow("SELECT * FROM tests WHERE uuid = $1", str(identifier))
            return dict(row) if row else None
        except Exception:
            log.exception(f"Error getting test record: {identifier}")
            return None

    async def get_teacher_stats(self, teacher_user_id: int) -> dict:
        try:
            total_tests = await db.fetchval(
                "SELECT COUNT(*) FROM tests WHERE user_id = $1", teacher_user_id
            ) or 0
            
            total_submissions = await db.fetchval(
                """
                SELECT COUNT(s.id) 
                FROM submissions s 
                JOIN tests t ON s.test_id = t.id 
                WHERE t.user_id = $1
                """,
                teacher_user_id
            ) or 0
            
            active_tests = await db.fetchval(
                "SELECT COUNT(*) FROM tests WHERE user_id = $1 AND status = 'Active'", teacher_user_id
            ) or 0

            return {
                "total_tests": int(total_tests),
                "total_submissions": int(total_submissions),
                "active_tests": int(active_tests)
            }
        except Exception:
            log.exception("Error getting teacher stats")
            return {"total_tests": 0, "total_submissions": 0, "active_tests": 0}

    async def get_teacher_tests(self, teacher_user_id: int) -> list:
        try:
            rows = await db.fetch(
                """
                SELECT 
                    t.id, t.uuid, t.user_id, t.title, t.subject, t.description, 
                    t.duration, t.passing_score, t.status, t.created_at, t.updated_at,
                    COALESCE(q.q_count, 0) AS questions_count,
                    COALESCE(s.s_count, 0) AS submissions_count,
                    ROUND(COALESCE(s.avg_percentage, 0)::numeric, 1) AS avg_score
                FROM tests t
                LEFT JOIN (
                    SELECT test_id, COUNT(id) AS q_count 
                    FROM questions 
                    GROUP BY test_id
                ) q ON q.test_id = t.id
                LEFT JOIN (
                    SELECT test_id, COUNT(id) AS s_count, AVG(percentage) AS avg_percentage 
                    FROM submissions 
                    GROUP BY test_id
                ) s ON s.test_id = t.id
                WHERE t.user_id = $1
                ORDER BY t.created_at DESC
                """,
                teacher_user_id
            )
            result = []
            for r in rows:
                item = dict(r)
                item["created_at_str"] = item["created_at"].strftime("%b %d, %Y") if item.get("created_at") else ""
                result.append(item)
            return result
        except Exception:
            log.exception("Error getting teacher tests")
            return []

    async def get_test_details(self, identifier: Any, include_correct: bool = True) -> Optional[dict]:
        try:
            test = await self.get_test_record(identifier)
            if not test:
                return None

            test_id = test["id"]
            question_rows = await db.fetch(
                "SELECT * FROM questions WHERE test_id = $1 ORDER BY order_num ASC, id ASC",
                test_id
            )

            questions = []
            for q in question_rows:
                q_dict = dict(q)
                opt_rows = await db.fetch(
                    "SELECT id, question_id, text, is_correct, order_num FROM options WHERE question_id = $1 ORDER BY order_num ASC, id ASC",
                    q_dict["id"]
                )
                options = []
                for o in opt_rows:
                    o_dict = dict(o)
                    if not include_correct:
                        o_dict.pop("is_correct", None)
                    options.append(o_dict)

                q_dict["options"] = options
                questions.append(q_dict)

            test["questions"] = questions
            test["questions_count"] = len(questions)
            test["created_at_str"] = test["created_at"].strftime("%b %d, %Y") if test.get("created_at") else ""
            return test
        except Exception:
            log.exception(f"Error fetching test details: {identifier}")
            return None

    async def create_test(self, teacher_user_id: int, data: dict) -> Optional[dict]:
        try:
            test_uuid = uuid.uuid4().hex
            title = data.get("title", "Untitled Test").strip()
            subject = data.get("subject", "General").strip()
            description = data.get("description", "").strip()
            duration = int(data.get("duration", 30))
            passing_score = int(data.get("passing_score", 70))
            status = data.get("status", "Active").strip()

            test_row = await db.fetchrow(
                """
                INSERT INTO tests (uuid, user_id, title, subject, description, duration, passing_score, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
                """,
                test_uuid, teacher_user_id, title, subject, description, duration, passing_score, status
            )
            if not test_row:
                return None

            test_id = test_row["id"]
            questions = data.get("questions", [])

            for q_idx, q in enumerate(questions):
                q_uuid = uuid.uuid4().hex
                q_text = q.get("text", f"Question {q_idx + 1}").strip()
                q_points = int(q.get("points", 1))
                q_order = q_idx + 1

                q_row = await db.fetchrow(
                    """
                    INSERT INTO questions (uuid, test_id, text, points, order_num)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING id
                    """,
                    q_uuid, test_id, q_text, q_points, q_order
                )
                if not q_row:
                    continue

                q_id = q_row["id"]
                options = q.get("options", [])
                for o_idx, opt in enumerate(options):
                    if isinstance(opt, str):
                        opt_text = opt.strip()
                        opt_correct = (o_idx == 0)
                    else:
                        opt_text = opt.get("text", "").strip()
                        opt_correct = bool(opt.get("is_correct", False))

                    await db.execute(
                        """
                        INSERT INTO options (question_id, text, is_correct, order_num)
                        VALUES ($1, $2, $3, $4)
                        """,
                        q_id, opt_text, opt_correct, o_idx + 1
                    )

            return await self.get_test_details(test_id, include_correct=True)
        except Exception:
            log.exception("Error creating test")
            return None

    async def update_test(self, identifier: Any, teacher_user_id: int, data: dict) -> Optional[dict]:
        try:
            test = await self.get_test_record(identifier)
            if not test:
                return None
            if test["user_id"] != teacher_user_id:
                # Permission check
                return None

            test_id = test["id"]
            title = data.get("title", test["title"]).strip()
            subject = data.get("subject", test["subject"]).strip()
            description = data.get("description", test["description"] or "").strip()
            duration = int(data.get("duration", test["duration"]))
            passing_score = int(data.get("passing_score", test["passing_score"]))
            status = data.get("status", test["status"]).strip()

            await db.execute(
                """
                UPDATE tests 
                SET title = $1, subject = $2, description = $3, duration = $4, 
                    passing_score = $5, status = $6, updated_at = CURRENT_TIMESTAMP
                WHERE id = $7
                """,
                title, subject, description, duration, passing_score, status, test_id
            )

            # If questions are provided, replace them
            questions = data.get("questions")
            if questions is not None:
                # Delete existing options & questions
                await db.execute(
                    "DELETE FROM options WHERE question_id IN (SELECT id FROM questions WHERE test_id = $1)",
                    test_id
                )
                await db.execute("DELETE FROM questions WHERE test_id = $1", test_id)

                for q_idx, q in enumerate(questions):
                    q_uuid = uuid.uuid4().hex
                    q_text = q.get("text", f"Question {q_idx + 1}").strip()
                    q_points = int(q.get("points", 1))
                    q_order = q_idx + 1

                    q_row = await db.fetchrow(
                        """
                        INSERT INTO questions (uuid, test_id, text, points, order_num)
                        VALUES ($1, $2, $3, $4, $5)
                        RETURNING id
                        """,
                        q_uuid, test_id, q_text, q_points, q_order
                    )
                    if not q_row:
                        continue

                    q_id = q_row["id"]
                    options = q.get("options", [])
                    for o_idx, opt in enumerate(options):
                        if isinstance(opt, str):
                            opt_text = opt.strip()
                            opt_correct = (o_idx == 0)
                        else:
                            opt_text = opt.get("text", "").strip()
                            opt_correct = bool(opt.get("is_correct", False))

                        await db.execute(
                            """
                            INSERT INTO options (question_id, text, is_correct, order_num)
                            VALUES ($1, $2, $3, $4)
                            """,
                            q_id, opt_text, opt_correct, o_idx + 1
                        )

            return await self.get_test_details(test_id, include_correct=True)
        except Exception:
            log.exception(f"Error updating test: {identifier}")
            return None

    async def delete_test(self, identifier: Any, teacher_user_id: int) -> bool:
        try:
            test = await self.get_test_record(identifier)
            if not test:
                return False
            if test["user_id"] != teacher_user_id:
                return False

            test_id = test["id"]
            # Clean up test related rows
            await db.execute("DELETE FROM submissions WHERE test_id = $1", test_id)
            await db.execute(
                "DELETE FROM options WHERE question_id IN (SELECT id FROM questions WHERE test_id = $1)",
                test_id
            )
            await db.execute("DELETE FROM questions WHERE test_id = $1", test_id)
            await db.execute("DELETE FROM tests WHERE id = $1", test_id)
            return True
        except Exception:
            log.exception(f"Error deleting test: {identifier}")
            return False

    async def get_test_submissions(self, identifier: Any, teacher_user_id: int) -> list:
        try:
            test = await self.get_test_record(identifier)
            if not test:
                return []
            if test["user_id"] != teacher_user_id:
                return []

            rows = await db.fetch(
                """
                SELECT 
                    s.id, s.uuid, s.score, s.total_points, s.percentage, s.time_spent, s.passed, s.created_at,
                    u.name AS student_name, u.email AS student_email, u.avatar AS student_avatar
                FROM submissions s
                JOIN users u ON s.user_id = u.id
                WHERE s.test_id = $1
                ORDER BY s.created_at DESC
                """,
                test["id"]
            )
            result = []
            for r in rows:
                item = dict(r)
                item["created_at_str"] = item["created_at"].strftime("%b %d, %Y %H:%M") if item.get("created_at") else ""
                mins = item["time_spent"] // 60
                secs = item["time_spent"] % 60
                item["time_spent_str"] = f"{mins}m {secs}s"
                result.append(item)
            return result
        except Exception:
            log.exception("Error getting test submissions")
            return []

    async def get_student_stats(self, student_user_id: int) -> dict:
        try:
            available_tests = await db.fetchval("SELECT COUNT(*) FROM tests WHERE status = 'Active'") or 0
            
            completed_tests = await db.fetchval(
                "SELECT COUNT(DISTINCT test_id) FROM submissions WHERE user_id = $1",
                student_user_id
            ) or 0
            
            avg_score = await db.fetchval(
                "SELECT AVG(percentage) FROM submissions WHERE user_id = $1",
                student_user_id
            ) or 0.0

            # Rank calculation based on total earned points across passed/highest submissions
            leaderboard = await self.get_leaderboard(limit=500)
            student_rank = "-"
            for idx, entry in enumerate(leaderboard):
                if entry.get("user_id") == student_user_id:
                    student_rank = f"#{idx + 1}"
                    break

            return {
                "available_tests": int(available_tests),
                "completed_tests": int(completed_tests),
                "avg_score": round(float(avg_score), 1),
                "rank": student_rank
            }
        except Exception:
            log.exception("Error getting student stats")
            return {"available_tests": 0, "completed_tests": 0, "avg_score": 0.0, "rank": "-"}

    async def get_student_tests(self, student_user_id: int) -> list:
        try:
            rows = await db.fetch(
                """
                SELECT 
                    t.id, t.uuid, t.title, t.subject, t.description, t.duration, t.passing_score, t.status, t.created_at,
                    u.name AS teacher_name,
                    COALESCE(q.q_count, 0) AS questions_count,
                    sub.latest_score,
                    sub.latest_percentage,
                    sub.latest_passed,
                    sub.attempt_count
                FROM tests t
                JOIN users u ON t.user_id = u.id
                LEFT JOIN (
                    SELECT test_id, COUNT(id) AS q_count 
                    FROM questions 
                    GROUP BY test_id
                ) q ON q.test_id = t.id
                LEFT JOIN (
                    SELECT 
                        test_id,
                        COUNT(id) AS attempt_count,
                        (ARRAY_AGG(score ORDER BY created_at DESC))[1] AS latest_score,
                        ROUND((ARRAY_AGG(percentage ORDER BY created_at DESC))[1]::numeric, 1) AS latest_percentage,
                        (ARRAY_AGG(passed ORDER BY created_at DESC))[1] AS latest_passed
                    FROM submissions
                    WHERE user_id = $1
                    GROUP BY test_id
                ) sub ON sub.test_id = t.id
                WHERE t.status = 'Active'
                ORDER BY t.created_at DESC
                """,
                student_user_id
            )
            result = []
            for r in rows:
                item = dict(r)
                item["created_at_str"] = item["created_at"].strftime("%b %d, %Y") if item.get("created_at") else ""
                item["has_taken"] = item["attempt_count"] is not None and item["attempt_count"] > 0
                result.append(item)
            return result
        except Exception:
            log.exception("Error getting student tests")
            return []

    async def submit_test(self, identifier: Any, student_user_id: int, answers: dict, time_spent: int) -> Optional[dict]:
        try:
            test = await self.get_test_details(identifier, include_correct=True)
            if not test:
                return None

            test_id = test["id"]
            questions = test.get("questions", [])

            total_points = 0
            earned_points = 0
            correct_count = 0
            incorrect_count = 0

            # Map answers: answers dict can have question_id or question_uuid as key, and option_id as value
            for q in questions:
                q_id = q["id"]
                q_uuid = q["uuid"]
                q_pts = q.get("points", 1)
                total_points += q_pts

                # Check student's chosen option
                user_selected = answers.get(str(q_id)) or answers.get(q_uuid) or answers.get(q_id)
                if user_selected is not None:
                    try:
                        user_selected = int(user_selected)
                    except (ValueError, TypeError):
                        user_selected = str(user_selected)

                correct_option_id = None
                for opt in q.get("options", []):
                    if opt.get("is_correct"):
                        correct_option_id = opt.get("id")
                        break

                if correct_option_id is not None and user_selected == correct_option_id:
                    earned_points += q_pts
                    correct_count += 1
                else:
                    incorrect_count += 1

            total_questions = len(questions)
            percentage = round((earned_points / total_points * 100), 1) if total_points > 0 else 0.0
            passed = percentage >= test["passing_score"]

            sub_uuid = uuid.uuid4().hex
            answers_json = json.dumps(answers) or "{}"

            sub_row = await db.fetchrow(
                """
                INSERT INTO submissions (uuid, test_id, user_id, score, total_points, percentage, time_spent, answers, passed)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
                RETURNING *
                """,
                sub_uuid, test_id, student_user_id, earned_points, total_points, percentage, time_spent, answers_json, passed
            )

            mins = time_spent // 60
            secs = time_spent % 60
            time_spent_str = f"{mins:02d}:{secs:02d}"

            return {
                "submission_id": sub_row["id"] if sub_row else None,
                "submission_uuid": sub_uuid,
                "score": earned_points,
                "total_points": total_points,
                "percentage": percentage,
                "passing_score": test["passing_score"],
                "passed": passed,
                "correct_count": correct_count,
                "incorrect_count": incorrect_count,
                "total_questions": total_questions,
                "time_spent": time_spent,
                "time_spent_str": time_spent_str
            }
        except Exception:
            log.exception(f"Error submitting test: {identifier}")
            return None

    async def get_leaderboard(self, limit: int = 50) -> list:
        try:
            rows = await db.fetch(
                """
                SELECT 
                    u.id AS user_id,
                    u.name,
                    u.email,
                    u.avatar,
                    COUNT(s.id) AS tests_completed,
                    SUM(s.score) AS total_points,
                    ROUND(AVG(s.percentage)::numeric, 1) AS avg_percentage,
                    MAX(s.percentage) AS best_percentage
                FROM submissions s
                JOIN users u ON s.user_id = u.id
                WHERE u.role = 'student'
                GROUP BY u.id, u.name, u.email, u.avatar
                ORDER BY total_points DESC, avg_percentage DESC, tests_completed DESC
                LIMIT $1
                """,
                limit
            )
            result = []
            for rank, r in enumerate(rows, start=1):
                item = dict(r)
                item["rank"] = rank
                item["total_points"] = int(item["total_points"] or 0)
                item["tests_completed"] = int(item["tests_completed"] or 0)
                item["avg_percentage"] = float(item["avg_percentage"] or 0.0)
                item["best_percentage"] = float(item["best_percentage"] or 0.0)
                result.append(item)
            return result
        except Exception:
            log.exception("Error fetching leaderboard")
            return []


test_service = TestService()
