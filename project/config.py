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


config = Config()
