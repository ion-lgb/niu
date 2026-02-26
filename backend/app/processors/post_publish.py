"""PostPublish Processor - 发布文章到 WordPress + 写入 B2 SEO"""

from __future__ import annotations

import logging

from app.core.context import GameContext
from app.core.events import event_bus
from app.wordpress.client import WordPressClient
from app.wordpress.seo import write_b2_seo

logger = logging.getLogger(__name__)


class PostPublishProcessor:
    def __init__(self, status: str = "draft"):
        self.status = status

    async def process(self, ctx: GameContext) -> GameContext:
        wp = WordPressClient()

        # 1. 创建文章
        post = await wp.create_post(
            title=ctx.steam_data.get("name", ""),
            content=ctx.block_content or "",
            status=self.status,
            categories=[ctx.category_id] if ctx.category_id else [],
            tags=ctx.tags or [],
            featured_media=ctx.image_ids[0] if ctx.image_ids else None,
        )
        ctx.post_id = post["id"]

        # 2. 写入 B2 SEO Meta
        if ctx.seo:
            await write_b2_seo(wp, ctx.post_id, ctx.seo)

        logger.info(
            f"[PostPublish] 文章发布完成 | app_id={ctx.app_id} | "
            f"status={self.status} | post_id={ctx.post_id}"
        )

        # 3. 触发事件（B2 扩展监听）
        await event_bus.emit(
            "post_published",
            post_id=ctx.post_id,
            context=ctx,
        )

        return ctx

    def supports(self, ctx: GameContext) -> bool:
        return bool(ctx.block_content)
