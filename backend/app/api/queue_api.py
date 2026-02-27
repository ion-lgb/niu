"""队列管理 API"""

from __future__ import annotations

from typing import Optional, List

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.auth import get_current_user
from app.queue.manager import enqueue_collect, enqueue_batch


router = APIRouter()


class EnqueueRequest(BaseModel):
    app_id: int
    options: Optional[dict] = None


class BatchEnqueueRequest(BaseModel):
    app_ids: List[int]
    options: Optional[dict] = None


@router.post("/enqueue")
async def enqueue(req: EnqueueRequest, _user: str = Depends(get_current_user)):
    """将单个采集任务加入队列"""
    record_id = await enqueue_collect(req.app_id, req.options)
    return {"record_id": record_id, "app_id": req.app_id}


@router.post("/enqueue/batch")
async def batch_enqueue(req: BatchEnqueueRequest, _user: str = Depends(get_current_user)):
    """批量入队"""
    record_ids = await enqueue_batch(req.app_ids, req.options)
    return {
        "count": len(record_ids),
        "jobs": [
            {"app_id": app_id, "record_id": rid}
            for app_id, rid in zip(req.app_ids, record_ids)
        ],
    }
