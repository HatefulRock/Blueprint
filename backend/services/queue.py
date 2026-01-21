import os

try:
    from redis import Redis
    from rq import Queue
except Exception:
    Redis = None
    Queue = None

REDIS_URL = os.getenv("REDIS_URL")

if not REDIS_URL:
    # Default to local redis
    REDIS_URL = "redis://localhost:6379/0"

_redis_client = None
default_queue = None
redis_client = None

if Redis and Queue:
    _redis_client = Redis.from_url(REDIS_URL)
    default_queue = Queue("default", connection=_redis_client)
    redis_client = _redis_client
else:
    # Stub queue for environments without redis/rq (tests/local dev)
    class StubQueue:
        def enqueue(self, fn, *args, **kwargs):
            # Run synchronously as a fallback
            class Job:
                def __init__(self, id):
                    self._id = id

                def get_id(self):
                    return self._id

            try:
                res = fn(*args, **kwargs)
                return Job("stub-" + (str(res)[:8]))
            except Exception:
                return Job("stub-error")

    default_queue = StubQueue()
    redis_client = None
