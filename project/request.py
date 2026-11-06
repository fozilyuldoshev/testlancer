from typing import Any, Optional
from starlette.requests import Request as StarletteRequest


class Request:
    def __init__(self, raw: StarletteRequest) -> None:
        self.raw = raw
        self.method = raw.method if hasattr(raw, "method") else "GET"
        try:
            self.path = raw.url.path
        except Exception:
            self.path = "/"
        try:
            self.query = dict(raw.query_params)
        except Exception:
            self.query = {}
        try:
            self.headers = dict(raw.headers)
        except Exception:
            self.headers = {}
        try:
            self.cookies = dict(raw.cookies)
        except Exception:
            self.cookies = {}
        try:
            self.params = dict(raw.path_params)
        except Exception:
            self.params = {}
        self.user: Optional[Any] = None

    async def json(self) -> Any:
        try:
            return await self.raw.json()
        except Exception:
            return {}

    async def form(self) -> Any:
        try:
            form_data = await self.raw.form()
            return {key: form_data[key] for key in form_data.keys()}
        except Exception:
            return {}
