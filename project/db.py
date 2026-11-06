import asyncpg
from typing import Any, Optional, List
from project.config import config
from project.log import log


class DB:
    def __init__(self) -> None:
        self.db = None

    async def connect(self) -> None:
        try:
            if not self.db:
                self.db = await asyncpg.create_pool(
                    host=config.db_host,
                    port=config.db_port,
                    user=config.db_user,
                    password=config.db_password,
                    database=config.db_name,
                    min_size=1
                )
        except Exception:
            log.exception(f"DB connect error")
            raise

    async def close(self) -> None:
        try:
            if self.db:
                await self.db.close()
        except Exception:
            log.exception(f"DB close error")
        finally:
            self.db = None

    async def execute(self, query: str, *args) -> bool:
        if not self.db:
            log.error(f"DB Execute error: Postgres not connected")
            return False
        try:
            async with self.db.acquire() as connect:
                await connect.execute(query, *args)
                return True
        except Exception:
            log.exception(f"DB Execute Error | Query: {query} | Args: {args}")
            return False

    async def fetchrow(self, query: str, *args) -> Optional[Any]:
        if not self.db:
            log.error(f"DB FetchRow error: Postgres not connected")
            return None
        try:
            async with self.db.acquire() as connect:
                return await connect.fetchrow(query, *args)
        except Exception:
            log.exception(f"DB FetchRow Error | Query: {query} | Args: {args}")
            return None

    async def fetchval(self, query: str, *args) -> Optional[Any]:
        if not self.db:
            log.error(f"DB FetchVal error: Postgres not connected")
            return None
        try:
            async with self.db.acquire() as connect:
                return await connect.fetchval(query, *args)
        except Exception:
            log.exception(f"DB FetchVal Error | Query: {query} | Args: {args}")
            return None

    async def fetch(self, query: str, *args) -> List[Any]:
        if not self.db:
            log.error(f"DB Fetch error: Postgres not connected")
            return []
        try:
            async with self.db.acquire() as connect:
                return await connect.fetch(query, *args)
        except Exception:
            log.exception(f"DB Fetch Error | Query: {query} | Args: {args}")
            return []


db = DB()
