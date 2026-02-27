"""AIAnalyze Processor - 调用 AI Analyzer 完成分类+标签+SEO"""

import logging

from app.ai.analyzer import AIAnalyzer
from app.core.context import GameContext
from app.wordpress.client import WordPressClient

logger = logging.getLogger(__name__)


class AIAnalyzeProcessor:
    def __init__(self):
        self.analyzer = AIAnalyzer()

    async def process(self, ctx: GameContext) -> GameContext:
        wp = WordPressClient()

        # 从 WordPress 获取已有分类列表
        wp_categories = await wp.get_categories()
        cat_name_to_id = {c["name"]: c["id"] for c in wp_categories}
        existing_categories = list(cat_name_to_id.keys())

        result = await self.analyzer.analyze(ctx.steam_data, existing_categories)
        category_name = result["category"]

        # 匹配或创建 WordPress 分类
        if category_name in cat_name_to_id:
            ctx.category_id = cat_name_to_id[category_name]
        else:
            # 分类不存在，自动创建
            new_cat = await wp.create_category(category_name)
            ctx.category_id = new_cat["id"]
            logger.info(f"[AIAnalyze] 自动创建分类: {category_name} → ID={ctx.category_id}")

        ctx.tags = result["tags"]
        ctx.seo = result["seo"]

        logger.info(
            f"[AIAnalyze] 分类={category_name}(ID={ctx.category_id}) "
            f"标签={ctx.tags} SEO标题={ctx.seo.title}"
        )
        return ctx

    def supports(self, ctx: GameContext) -> bool:
        return bool(ctx.steam_data) and ctx.seo is None
