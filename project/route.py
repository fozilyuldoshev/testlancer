import importlib
from typing import Any, Callable, List
from starlette.routing import Route as StarletteRoute, Mount
from starlette.requests import Request as StarletteRequest
from starlette.responses import Response as StarletteResponse, PlainTextResponse
from starlette.staticfiles import StaticFiles
from project.request import Request
from project.response import Response
from project.log import log


class Route:
    def __init__(self) -> None:
        self.routes: List[Any] = []
        try:
            self.routes.append(Mount("/static", app=StaticFiles(directory="static"), name="static"))
        except Exception:
            pass

    def get(self, path: str, handler: Callable) -> None:
        self._add("GET", path, handler)

    def post(self, path: str, handler: Callable) -> None:
        self._add("POST", path, handler)

    def _add(self, method: str, path: str, handler: Callable) -> None:
        async def wrapper(raw: StarletteRequest) -> StarletteResponse:
            try:
                request = Request(raw)
                response = Response()
                return await handler(request, response)
            except Exception:
                log.exception(f"Route execution error ({method} {path})")
                return PlainTextResponse("Internal Server Error", status_code=500)

        self.routes.append(StarletteRoute(path, endpoint=wrapper, methods=[method]))

    @staticmethod
    def compile() -> List[Any]:
        try:
            module = importlib.import_module("app.route.web")
            route: 'Route' = getattr(module, "route")
            return route.routes
        except Exception:
            log.exception(f"Route compile error")
            return []
