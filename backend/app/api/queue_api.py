"""队列管理 API"""

from __future__ import annotations

from typing import Optional, List

from fastapi import APIRouter
from pydantic import BaseModel

from app.queue.manager import enqueue_collect, enqueue_batch

router = APIRouter()


class EnqueueRequest(BaseModel):
    app_id: int
    options: Optional[dict] = None


class BatchEnqueueRequest(BaseModel):
    app_ids: List[int]
    options: Optional[dict] = None


@router.post("/enqueue")
async def enqueue(req: EnqueueRequest):
    """将单个采集任务加入队列"""
    job_id = await enqueue_collect(req.app_id, req.options)
    return {"job_id": job_id, "app_id": req.app_id}


@router.post("/enqueue/batch")
async def batch_enqueue(req: BatchEnqueueRequest):
    """批量入队"""
    job_ids = await enqueue_batch(req.app_ids, req.options)
    return {
        "count": len(job_ids),
        "jobs": [
            {"app_id": app_id, "job_id": jid}
            for app_id, jid in zip(req.app_ids, job_ids)
        ],
    }
