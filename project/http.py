import uvicorn
from typing import Any
from contextlib import asynccontextmanager
from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import Response
from starlette.routing import Route
from project.cache import cache
from project.config import config
from project.db import db
from project.log import log
from project.migrate import migrate


class HTTP:
    def __init__(self) -> None:
        self.app = Starlette(
            routes=[],
            exception_handlers={
                500: self.error,
                Exception: self.error,
            },
            lifespan=self.lifespan,
        )

    @staticmethod
    async def error(request: Request, e: Exception) -> Response:
        log.error(f"HTTP Starlette error (path: {request.url.path})", exc_info=e)
        return Response(status_code=503)

    @asynccontextmanager
    async def lifespan(self, _app: Starlette) -> Any:
        try:
            await cache.connect()
            await db.connect()
            await migrate.run()
            yield
        finally:
            await db.close()
            await cache.close()

    def run(self) -> None:
        try:
            uvicorn.run(app=self.app, host=config.host, port=int(config.port))
        except KeyboardInterrupt:
            pass
        except Exception:
            log.exception(f"HTTP run error")


http = HTTP()
