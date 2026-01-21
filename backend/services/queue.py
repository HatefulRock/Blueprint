import os
from redis import Redis
from rq import Queue

REDIS_URL = os.getenv("REDIS_URL")

if not REDIS_URL:
    # Default to local redis
    REDIS_URL = "redis://localhost:6379/0"

_redis_client = Redis.from_url(REDIS_URL)
default_queue = Queue("default", connection=_redis_client)

# expose redis client for job status lookups
redis_client = _redis_client
