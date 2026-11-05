from typing import Optional
from cryptography.fernet import Fernet, InvalidToken
from project.config import config
from project.log import log


class Secret:
    def __init__(self) -> None:
        try:
            self.fernet = Fernet(config.secret_key)
        except Exception:
            log.exception(f"Secret error")

    def encrypt(self, text: str) -> Optional[str]:
        if not self.fernet:
            log.error(f"Secret encrypt error: Fernet not connected")
            return None
        try:
            return self.fernet.encrypt(text.encode()).decode()
        except Exception:
            log.exception(f"Secret encrypt error")
            return None

    def decrypt(self, text: str) -> Optional[str]:
        if not self.fernet:
            log.error(f"Secret decrypt error: Fernet not connected")
            return None
        try:
            return self.fernet.decrypt(text.encode()).decode()
        except InvalidToken:
            return None
        except Exception:
            log.exception(f"Secret decrypt error")
            return None


secret = Secret()
