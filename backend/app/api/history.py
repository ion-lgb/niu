"""采集历史记录 API"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.engine import get_session
from app.db import crud

router = APIRouter()


@router.get("/records")
async def list_records(
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    session: AsyncSession = Depends(get_session),
):
    """列出采集记录"""
    records = await crud.list_records(session, status=status, limit=limit, offset=offset)
    total = await crud.count_records(session, status=status)

    return {
        "total": total,
        "items": [
            {
                "id": r.id,
                "app_id": r.app_id,
                "game_name": r.game_name,
                "action": r.action,
                "status": r.status,
                "post_id": r.post_id,
                "error": r.error,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "updated_at": r.updated_at.isoformat() if r.updated_at else None,
            }
            for r in records
        ],
    }


@router.get("/records/stats")
async def record_stats(session: AsyncSession = Depends(get_session)):
    """采集统计"""
    total = await crud.count_records(session)
    completed = await crud.count_records(session, status="completed")
    running = await crud.count_records(session, status="running")
    failed = await crud.count_records(session, status="failed")
    pending = await crud.count_records(session, status="pending")

    return {
        "total": total,
        "completed": completed,
        "running": running,
        "failed": failed,
        "pending": pending,
    }


@router.get("/records/{record_id}")
async def get_record(record_id: int, session: AsyncSession = Depends(get_session)):
    """获取单条记录详情"""
    record = await crud.get_record(session, record_id)
    if record is None:
        from fastapi import HTTPException
        raise HTTPException(404, f"记录 {record_id} 不存在")

    return {
        "id": record.id,
        "app_id": record.app_id,
        "game_name": record.game_name,
        "action": record.action,
        "status": record.status,
        "post_id": record.post_id,
        "error": record.error,
        "options": record.options,
        "seo_data": record.seo_data,
        "tags": record.tags,
        "category_id": record.category_id,
        "created_at": record.created_at.isoformat() if record.created_at else None,
        "updated_at": record.updated_at.isoformat() if record.updated_at else None,
    }
