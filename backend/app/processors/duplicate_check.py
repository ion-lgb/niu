"""DuplicateCheck Processor - 重复检测

通过 version_hash 判断是否已采集、是否有变化。
"""

from __future__ import annotations

import hashlib
import logging

from app.core.context import GameContext
from app.db.engine import async_session
from app.db import crud

logger = logging.getLogger(__name__)


def compute_version_hash(steam_data: dict) -> str:
    """计算版本哈希：name + short_description + price + screenshots_count"""
    parts = [
        steam_data.get("name", ""),
        steam_data.get("short_description", ""),
        str(steam_data.get("price_overview", {}).get("final", 0)),
        str(len(steam_data.get("screenshots", []))),
    ]
    raw = "|".join(parts)
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


class DuplicateCheckProcessor:
    async def process(self, ctx: GameContext) -> GameContext:
        version_hash = compute_version_hash(ctx.steam_data)
        logger.info(f"[DuplicateCheck] app_id={ctx.app_id} hash={version_hash}")

        # 查询数据库
        async with async_session() as session:
            existing = await crud.find_by_version_hash(session, version_hash)

        if existing:
            if existing.post_id:
                # 内容未变化，跳过
                logger.info(f"[DuplicateCheck] 已存在且未变化 → skip (record_id={existing.id})")
                ctx.action = "skip"
                ctx.post_id = existing.post_id
            else:
                # 之前失败了，重新采集
                logger.info(f"[DuplicateCheck] 之前失败，重试 → create")
                ctx.action = "create"
        else:
            # 全新或有变化
            ctx.action = "create"

        return ctx

    def supports(self, ctx: GameContext) -> bool:
        return bool(ctx.steam_data)
