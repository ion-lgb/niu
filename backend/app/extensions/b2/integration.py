"""B2 主题集成 - 通过事件总线解耦

监听 post_published 事件，执行：
1. 专题归类 (collection taxonomy)
2. 评分同步
3. 限免/大折扣公告
"""

import logging

from app.core.context import GameContext
from app.core.events import event_bus
from app.wordpress.client import WordPressClient

logger = logging.getLogger(__name__)


class B2Integration:
    """B2 主题集成（可选模块）"""

    def __init__(self, wp_client: WordPressClient):
        self.wp = wp_client
        # 注册事件处理器
        event_bus.register("post_published", self.on_post_published)

    async def on_post_published(self, post_id: int, context: GameContext, **kwargs):
        """文章发布后的 B2 集成处理"""
        if post_id is None:
            return

        await self._assign_collection(post_id, context)
        await self._check_announcement(post_id, context)

    async def _assign_collection(self, post_id: int, ctx: GameContext):
        """将游戏归类到 B2 专题 (collection taxonomy)

        通过 WP REST API:
        POST /wp-json/wp/v2/posts/{id} {"collection": [term_id]}
        """
        # TODO: 根据游戏类型匹配专题
        # collections = await self.wp.get(f"/wp-json/wp/v2/collection")
        # matched = match_collection(ctx.steam_data, collections)
        # if matched:
        #     await self.wp.update_post(post_id, collection=matched)
        logger.debug(f"[B2] 专题归类 post_id={post_id} (待实现)")

    async def _check_announcement(self, post_id: int, ctx: GameContext):
        """检测限免/大折扣 → 创建 B2 公告

        B2 公告 meta:
        - b2_gg_show: 0=所有人
        - b2_gg_days: 关闭后再弹出间隔天数
        - b2_gg_over: 过期天数
        """
        steam = ctx.steam_data
        price = steam.get("price_overview", {})
        discount = price.get("discount_percent", 0)
        is_free = steam.get("is_free", False)

        if not (is_free or discount >= 50):
            return

        name = steam.get("name", "")
        if is_free:
            title = f"🎮 限时免费！{name} 免费领取中"
        else:
            title = f"🔥 {name} 限时 {discount}% 折扣"

        # TODO: 创建 announcement post type
        # await self.wp.create_post(
        #     title=title,
        #     content=f"<p>{name} 目前正在限时优惠中，前往 Steam 了解详情。</p>",
        #     status="publish",
        #     post_type="announcement",
        #     meta={
        #         "b2_gg_show": 0,
        #         "b2_gg_days": 1,
        #         "b2_gg_over": 7,
        #     },
        # )
        logger.info(f"[B2] 公告触发 | {title}")
