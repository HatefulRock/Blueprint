from fastapi import APIRouter, HTTPException
from typing import Optional
from ..services.queue import redis_client

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/{job_id}")
def get_job_status(job_id: str):
    """Return simple job status info using RQ job metadata stored in Redis.
    Falls back to a stub response if Redis is not present.
    """
    if not redis_client:
        return {
            "job_id": job_id,
            "status": "no-redis",
            "message": "Redis not configured; job ran synchronously",
        }

    try:
        from rq.job import Job

        job = Job.fetch(job_id, connection=redis_client)
        return {
            "job_id": job.get_id(),
            "status": job.get_status(),
            "result": job.result,
            "started_at": getattr(job, "started_at", None),
            "ended_at": getattr(job, "ended_at", None),
        }
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))
