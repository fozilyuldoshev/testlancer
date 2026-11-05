import jinja2
from typing import Any, Dict, Optional
from starlette.responses import PlainTextResponse, HTMLResponse
from starlette.responses import Response as StarletteResponse
from project.json import json


class Response:
    def __init__(self) -> None:
        try:
            self.env = jinja2.Environment(loader=jinja2.FileSystemLoader("templates"))
        except Exception:
            self.env = None

    @staticmethod
    def text(content: str, status: int = 200) -> PlainTextResponse:
        return PlainTextResponse(content, status_code=status)

    @staticmethod
    def json(data: Any, status: int = 200) -> StarletteResponse:
        content = json.dumps(data)
        if not content:
            return StarletteResponse(media_type="application/json", status_code=404)
        return StarletteResponse(
            content=content,
            media_type="application/json",
            status_code=status
        )

    def html(self, name: str, context: Optional[Dict[str, Any]] = None, status: int = 200) -> HTMLResponse:
        if not self.env:
            return HTMLResponse("Jinja2 error", status_code=500)
        context = context or {}
        try:
            template = self.env.get_template(f"{name}.html")
            html = template.render(**context)
            return HTMLResponse(html, status_code=status)
        except jinja2.TemplateNotFound:
            return HTMLResponse(status_code=404)
