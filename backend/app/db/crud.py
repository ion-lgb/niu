"""数据库 CRUD 操作"""

from __future__ import annotations

from typing import Optional, List

from sqlalchemy import select, update
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
