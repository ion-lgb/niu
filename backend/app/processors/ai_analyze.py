"""AIAnalyze Processor - 调用 AI Analyzer 完成分类+标签+SEO"""

import logging

from app.ai.analyzer import AIAnalyzer
from app.core.context import GameContext

logger = logging.getLogger(__name__)


class AIAnalyzeProcessor:
    def __init__(self):
        self.analyzer = AIAnalyzer()

    async def process(self, ctx: GameContext) -> GameContext:
        # TODO: 从 WordPress 获取已有分类列表
        existing_categories = ["动作游戏", "角色扮演", "策略游戏", "模拟经营",
                               "冒险游戏", "射击游戏", "体育竞技", "独立游戏", "恐怖游戏"]

        result = await self.analyzer.analyze(ctx.steam_data, existing_categories)

        ctx.category_id = None  # TODO: 通过分类名查询 WP 获取 ID
        ctx.tags = result["tags"]
        ctx.seo = result["seo"]

        logger.info(
            f"[AIAnalyze] 分类={result['category']} "
            f"标签={ctx.tags} SEO标题={ctx.seo.title}"
        )
        return ctx

    def supports(self, ctx: GameContext) -> bool:
        return bool(ctx.steam_data) and ctx.seo is None
