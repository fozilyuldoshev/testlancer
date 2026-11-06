import os
from pathlib import Path
from dotenv import load_dotenv


class Config:
    def __init__(self) -> None:
        load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")
        self.host = os.getenv("HOST", "0.0.0.0")
        self.port = os.getenv("PORT", "8000")
        self.secret_key = os.getenv("SECRET_KEY")
        self.redis_url = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")
        self.redis_password = os.getenv("REDIS_PASSWORD", "")
        self.db_host = os.getenv("DB_HOST", "postgres")
        self.db_port = os.getenv("DB_PORT", "5432")
        self.db_user = os.getenv("DB_USER", "botrender")
        self.db_password = os.getenv("DB_PASSWORD", "")
        self.db_name = os.getenv("DB_NAME", "botrender")

        # Google OAuth configuration
        self.google_client_id = os.getenv("GOOGLE_CLIENT_ID", "")
        self.google_client_secret = os.getenv("GOOGLE_CLIENT_SECRET", "")
        self.google_redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/google/callback")

        # Teacher email configuration
        teacher_emails_raw = os.getenv("TEACHER_EMAILS") or os.getenv("TEACHER_EMAIL") or ""
        self.teacher_emails = [e.strip().lower() for e in teacher_emails_raw.split(",") if e.strip()]

    @property
    def teacher_emails_list(self) -> list:
        raw = os.getenv("TEACHER_EMAILS") or os.getenv("TEACHER_EMAIL") or ""
        return [e.strip().lower() for e in raw.split(",") if e.strip()]

    def is_teacher_email(self, email: str) -> bool:
        if not email:
            return False
        clean_email = email.strip().lower()
        return clean_email in self.teacher_emails_list or clean_email in self.teacher_emails


config = Config()
