"""采集历史数据模型"""

from __future__ import annotations

import datetime
from typing import Optional

from sqlalchemy import String, Integer, Text, DateTime, JSON, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.engine import Base


class CollectRecord(Base):
    """采集记录 - 每次采集操作创建一条"""

    __tablename__ = "collect_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    app_id: Mapped[int] = mapped_column(Integer, index=True, comment="Steam App ID")
    game_name: Mapped[str] = mapped_column(String(500), default="", comment="游戏名称")

    # 采集结果
    action: Mapped[str] = mapped_column(String(20), default="create", comment="create/update/skip")
    status: Mapped[str] = mapped_column(String(20), default="pending", comment="pending/running/completed/failed")
    post_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, comment="WordPress 文章 ID")
    error: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="错误信息")

    # 采集参数快照
    options: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True, comment="采集参数快照")

    # AI 产出快照
    seo_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True, comment="SEO 数据")
    tags: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True, comment="标签列表")
    category_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, comment="分类 ID")

    # 时间戳
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=func.now(), comment="创建时间"
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), comment="更新时间"
    )

    # 版本哈希（用于去重检测）
    version_hash: Mapped[Optional[str]] = mapped_column(
        String(64), nullable=True, index=True, comment="数据版本哈希"
    )

    def __repr__(self) -> str:
        return f"<CollectRecord id={self.id} app_id={self.app_id} status={self.status}>"
