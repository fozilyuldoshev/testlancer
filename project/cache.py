import asyncio
from typing import Any, Optional
from redis import asyncio as aioredis
from project.config import config
from project.log import log
from project.json import json


class Cache:
    def __init__(self) -> None:
        self.redis: Optional[aioredis.Redis] = None

    async def connect(self) -> None:
        try:
            if not self.redis:
                self.redis = aioredis.from_url(
                    config.redis_url,
                    password=config.redis_password,
                    decode_responses=True,
                    socket_timeout=10.0,
                    socket_connect_timeout=5.0
                )
                if self.redis is not None:
                    await self.redis.ping()
                else:
                    log.error("Cache connect error: Returned none")
                    raise
        except Exception:
            log.exception(f"Cache connect error")
            raise

    async def close(self) -> None:
        try:
            if self.redis:
                await self.redis.close()
        except Exception:
            log.error(f"Cache close error")
        finally:
            self.redis = None

    async def set(self, key: str, value: Any, expire: Optional[int] = None) -> bool:
        if not self.redis:
            log.error(f"Cache SET error: Redis not connected")
            return False
        try:
            result = json.dumps(value)
            if not result:
                return False
            else:
                await self.redis.set(key, result, ex=expire)
                return True
        except Exception:
            log.exception(f"Cache SET error (key: {key})")
            return False

    async def get(self, key: str) -> Optional[Any]:
        if not self.redis:
            log.error(f"Cache GET error: Redis not connected")
            return None
        try:
            value = await self.redis.get(key)
            result = json.loads(value)
            return result
        except Exception:
            log.exception(f"Cache GET error (key: {key})")
            return None

    async def delete(self, key: str) -> bool:
        if not self.redis:
            log.error(f"Cache DELETE error: Redis not connected")
            return False
        try:
            await self.redis.delete(key)
            return True
        except Exception:
            log.exception(f"Cache DELETE error (key: {key})")
            return False

    async def lpush(self, name: str, value: Any) -> Optional[int]:
        if not self.redis:
            log.error(f"Cache LPUSH error: Redis not connected")
            return None
        try:
            result = json.dumps(value)
            if not result:
                return None
            else:
                return await self.redis.lpush(name, result)
        except Exception:
            log.exception(f"Cache LPUSH error (queue: {name})")
            return None

    async def brpop(self, name: str, timeout: int = 5) -> Optional[Any]:
        if not self.redis:
            log.error(f"Cache BRPOP error: Redis not connected")
            return None
        try:
            brpop = await self.redis.brpop(name, timeout=timeout)
            if not brpop:
                return None
            result = json.loads(brpop[1])
            return result
        except (asyncio.TimeoutError, aioredis.TimeoutError):
            return None
        except Exception:
            log.exception(f"Cache BRPOP error (queue: {name})")
            return None


cache = Cache()
