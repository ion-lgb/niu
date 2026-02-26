"""Dashboard API - 趋势统计和活动时间线"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.engine import get_session
from app.db import crud

router = APIRouter()


@router.get("/trend")
async def dashboard_trend(days: int = 7, session: AsyncSession = Depends(get_session)):
    """近 N 天每日采集趋势"""
    rows = await crud.daily_stats(session, days=days)
    return {"items": rows}


@router.get("/activity")
async def dashboard_activity(limit: int = 10, session: AsyncSession = Depends(get_session)):
    """最近活动记录"""
    records = await crud.recent_activity(session, limit=limit)
    return {
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
