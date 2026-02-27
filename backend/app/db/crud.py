"""数据库 CRUD 操作"""

from __future__ import annotations

from typing import Optional, List

from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import CollectRecord


async def create_record(
    session: AsyncSession,
    app_id: int,
    game_name: str = "",
    options: Optional[dict] = None,
) -> CollectRecord:
    """创建新的采集记录"""
    record = CollectRecord(
        app_id=app_id,
        game_name=game_name,
        status="pending",
        options=options,
    )
    session.add(record)
    await session.commit()
    await session.refresh(record)
    return record


async def update_record_status(
    session: AsyncSession,
    record_id: int,
    status: str,
    error: Optional[str] = None,
    post_id: Optional[int] = None,
    action: Optional[str] = None,
    seo_data: Optional[dict] = None,
    tags: Optional[dict] = None,
    category_id: Optional[int] = None,
    version_hash: Optional[str] = None,
) -> None:
    """更新采集记录状态和结果"""
    values = {"status": status}
    if error is not None:
        values["error"] = error
    if post_id is not None:
        values["post_id"] = post_id
    if action is not None:
        values["action"] = action
    if seo_data is not None:
        values["seo_data"] = seo_data
    if tags is not None:
        values["tags"] = tags
    if category_id is not None:
        values["category_id"] = category_id
    if version_hash is not None:
        values["version_hash"] = version_hash

    stmt = update(CollectRecord).where(CollectRecord.id == record_id).values(**values)
    await session.execute(stmt)
    await session.commit()


async def get_record(session: AsyncSession, record_id: int) -> Optional[CollectRecord]:
    """按 ID 查询单条记录"""
    result = await session.execute(
        select(CollectRecord).where(CollectRecord.id == record_id)
    )
    return result.scalar_one_or_none()


async def get_records_by_app_id(
    session: AsyncSession, app_id: int
) -> List[CollectRecord]:
    """按 app_id 查询所有记录"""
    result = await session.execute(
        select(CollectRecord).where(CollectRecord.app_id == app_id).order_by(CollectRecord.created_at.desc())
    )
    return list(result.scalars().all())


async def list_records(
    session: AsyncSession,
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> List[CollectRecord]:
    """列出采集记录（分页 + 可选状态过滤）"""
    stmt = select(CollectRecord).order_by(CollectRecord.created_at.desc())
    if status:
        stmt = stmt.where(CollectRecord.status == status)
    stmt = stmt.limit(limit).offset(offset)
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def count_records(session: AsyncSession, status: Optional[str] = None) -> int:
    """统计记录数"""
    from sqlalchemy import func
    stmt = select(func.count(CollectRecord.id))
    if status:
        stmt = stmt.where(CollectRecord.status == status)
    result = await session.execute(stmt)
    return result.scalar() or 0


async def find_by_version_hash(
    session: AsyncSession, version_hash: str
) -> Optional[CollectRecord]:
    """通过版本哈希去重"""
    result = await session.execute(
        select(CollectRecord).where(CollectRecord.version_hash == version_hash)
    )
    return result.scalar_one_or_none()


async def delete_record(session: AsyncSession, record_id: int) -> bool:
    """删除采集记录"""
    stmt = delete(CollectRecord).where(CollectRecord.id == record_id)
    result = await session.execute(stmt)
    await session.commit()
    return result.rowcount > 0


async def get_next_pending(session: AsyncSession) -> Optional[CollectRecord]:
    """获取下一个待处理任务（按创建时间排序）"""
    result = await session.execute(
        select(CollectRecord)
        .where(CollectRecord.status == "pending")
        .order_by(CollectRecord.created_at.asc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def update_record_game_name(
    session: AsyncSession, record_id: int, game_name: str
) -> None:
    """更新记录的游戏名称"""
    stmt = update(CollectRecord).where(CollectRecord.id == record_id).values(game_name=game_name)
    await session.execute(stmt)
    await session.commit()


async def daily_stats(session: AsyncSession, days: int = 7) -> list[dict]:
    """近 N 天每日采集统计（按日期 + 状态分组）"""
    import datetime
    from sqlalchemy import func

    since = datetime.datetime.now() - datetime.timedelta(days=days)
    stmt = (
        select(
            func.date(CollectRecord.created_at).label("date"),
            CollectRecord.status,
            func.count(CollectRecord.id).label("count"),
        )
        .where(CollectRecord.created_at.isnot(None))
        .where(CollectRecord.created_at >= since)
        .group_by("date", CollectRecord.status)
        .order_by("date")
    )
    result = await session.execute(stmt)
    return [
        {"date": str(row.date), "status": row.status, "count": row.count}
        for row in result.all()
    ]


async def recent_activity(session: AsyncSession, limit: int = 10) -> list[CollectRecord]:
    """最近 N 条记录"""
    stmt = select(CollectRecord).order_by(CollectRecord.updated_at.desc()).limit(limit)
    result = await session.execute(stmt)
    return list(result.scalars().all())
