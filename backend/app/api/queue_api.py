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


class RecordIdRequest(BaseModel):
    record_id: int


@router.post("/enqueue")
async def enqueue(req: EnqueueRequest, _user: str = Depends(get_current_user)):
    """将单个采集任务加入队列（waiting 状态）"""
    try:
        record_id = await enqueue_collect(req.app_id, req.options)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return {"record_id": record_id, "app_id": req.app_id}


@router.post("/enqueue/batch")
async def batch_enqueue(req: BatchEnqueueRequest, _user: str = Depends(get_current_user)):
    """批量入队（waiting 状态），跳过已存在的"""
    results = []
    skipped = []
    for app_id in req.app_ids:
        try:
            rid = await enqueue_collect(app_id, req.options)
            results.append({"app_id": app_id, "record_id": rid})
        except ValueError:
            skipped.append(app_id)
    return {
        "count": len(results),
        "jobs": results,
        "skipped": skipped,
    }


@router.post("/start")
async def start_task(req: RecordIdRequest, _user: str = Depends(get_current_user)):
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


@router.post("/retry")
async def retry_task(req: RecordIdRequest, _user: str = Depends(get_current_user)):
    """重试失败任务（failed → pending）"""
    from app.db.engine import async_session
    from app.db import crud

    async with async_session() as session:
        ok = await crud.retry_record(session, req.record_id)
    if not ok:
        raise HTTPException(status_code=404, detail="任务未找到或状态不是 failed")
    return {"message": "ok", "record_id": req.record_id}


@router.post("/retry/all")
async def retry_all_tasks(_user: str = Depends(get_current_user)):
    """重试所有失败任务（所有 failed → pending）"""
    from app.db.engine import async_session
    from app.db import crud

    async with async_session() as session:
        count = await crud.retry_all_failed(session)
    return {"message": "ok", "retried": count}
