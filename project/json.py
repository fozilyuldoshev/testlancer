import orjson
from typing import Any, Union
from project.log import log


class JSON:
    @staticmethod
    def dumps(value: Any) -> Union[str, Any]:
        if not isinstance(value, (dict, list)):
            return value
        try:
            return orjson.dumps(value).decode()
        except Exception:
            log.exception(f"JSON dumps error")
            return None

    @staticmethod
    def loads(value: Any) -> Any:
        if not isinstance(value, str):
            return value
        try:
            return orjson.loads(value)
        except (orjson.JSONDecodeError, TypeError):
            return value
        except Exception:
            log.exception(f"JSON loads error")
            return None


json = JSON()
