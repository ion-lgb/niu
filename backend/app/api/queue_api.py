"""队列管理 API"""

from __future__ import annotations

from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
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


class StartRequest(BaseModel):
    record_id: int


@router.post("/enqueue")
async def enqueue(req: EnqueueRequest, _user: str = Depends(get_current_user)):
    """将单个采集任务加入队列（waiting 状态）"""
    record_id = await enqueue_collect(req.app_id, req.options)
    return {"record_id": record_id, "app_id": req.app_id}


@router.post("/enqueue/batch")
async def batch_enqueue(req: BatchEnqueueRequest, _user: str = Depends(get_current_user)):
    """批量入队（waiting 状态）"""
    record_ids = await enqueue_batch(req.app_ids, req.options)
    return {
        "count": len(record_ids),
        "jobs": [
            {"app_id": app_id, "record_id": rid}
            for app_id, rid in zip(req.app_ids, record_ids)
        ],
    }


@router.post("/start")
async def start_task(req: StartRequest, _user: str = Depends(get_current_user)):
    """确认开始采集（waiting → pending）"""
    from app.db.engine import async_session
    from app.db import crud

    async with async_session() as session:
        ok = await crud.start_record(session, req.record_id)
    if not ok:
        raise HTTPException(status_code=404, detail="任务未找到或状态不是 waiting")
    return {"message": "ok", "record_id": req.record_id}


@router.post("/start/all")
async def start_all_tasks(_user: str = Depends(get_current_user)):
    """全部开始采集（所有 waiting → pending）"""
    from app.db.engine import async_session
    from app.db import crud

    async with async_session() as session:
        count = await crud.start_all_waiting(session)
    return {"message": "ok", "started": count}
