from typing import Any, Dict
from starlette.requests import Request as StarletteRequest


class Request:
    def __init__(self, raw: StarletteRequest) -> None:
        self.raw = raw
        self.method = raw.method
        self.path = raw.url.path
        self.query = dict[str, str](raw.query_params)
        self.headers = dict[str, str](raw.headers)

    async def json(self) -> Dict[str, Any]:
        try:
            return await self.raw.json()
        except Exception:
            return {}

    async def form(self) -> Dict[str, Any]:
        try:
            form_data = await self.raw.form()
            return {key: form_data[key] for key in form_data.keys()}
        except Exception:
            return {}
