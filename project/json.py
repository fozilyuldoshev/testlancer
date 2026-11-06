import orjson
from decimal import Decimal
from typing import Any, Union
from project.log import log


def custom_default(obj):
    if isinstance(obj, Decimal):
        return str(obj)
    raise TypeError


class JSON:
    @staticmethod
    def dumps(value: Any) -> Union[str, Any]:
        if not isinstance(value, (dict, list)):
            return value
        try:
            return orjson.dumps(value, default=custom_default).decode()
        except Exception:
            log.exception("JSON dumps error")
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
            log.exception("JSON loads error")
            return None


json = JSON()
