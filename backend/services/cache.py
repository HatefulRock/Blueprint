import os
import json
import time
from typing import Optional

REDIS_URL = os.getenv("REDIS_URL")

# Minimal Redis wrapper with TTL; fallback to in-process dict
try:
    if REDIS_URL:
        import redis

        _redis = redis.from_url(REDIS_URL)
    else:
        _redis = None
except Exception:
    _redis = None


class RedisCache:
    def __init__(self, client):
        self.client = client

    def get(self, key: str) -> Optional[dict]:
        raw = self.client.get(key)
        if raw is None:
            return None
        try:
            # redis returns bytes
            if isinstance(raw, bytes):
                raw = raw.decode("utf-8")
            return json.loads(raw)
        except Exception:
            return None

    def set(self, key: str, value: dict, ttl: int = 3600):
        raw = json.dumps(value)
        # setex ensures TTL
        self.client.setex(key, ttl, raw)

    def delete(self, key: str):
        try:
            self.client.delete(key)
        except Exception:
            pass


class InMemoryCache:
    def __init__(self):
        # store: key -> (expire_ts, value)
        self.store = {}

    def get(self, key: str) -> Optional[dict]:
        now = time.time()
        v = self.store.get(key)
        if not v:
            return None
        expire_ts, value = v
        if expire_ts and expire_ts < now:
            # expired
            del self.store[key]
            return None
        return value

    def set(self, key: str, value: dict, ttl: int = 3600):
        expire = time.time() + ttl if ttl else None
        self.store[key] = (expire, value)

    def delete(self, key: str):
        if key in self.store:
            del self.store[key]


def make_dict_key(term: str, target_language: str, native_language: Optional[str]):
    nl = native_language or ""
    return f"dict:{target_language}:{nl}:{term.lower()}"


if _redis:
    cache = RedisCache(_redis)
else:
    cache = InMemoryCache()
