import base64
import hashlib
from typing import Optional
from cryptography.fernet import Fernet, InvalidToken
from project.config import config
from project.log import log


class Secret:
    def __init__(self) -> None:
        try:
            key = config.secret_key
            if not key:
                # Deterministic or fallback key for development if not provided
                key = Fernet.generate_key().decode()
            elif len(key) != 44 or not key.endswith("="):
                # Ensure 32-byte urlsafe base64 key
                digest = hashlib.sha256(key.encode()).digest()
                key = base64.urlsafe_b64encode(digest).decode()
            self.fernet = Fernet(key.encode() if isinstance(key, str) else key)
        except Exception:
            log.exception("Secret initialization error, generating ephemeral fallback key")
            self.fernet = Fernet(Fernet.generate_key())

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
