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

        # 匹配 WordPress 已有分类（精确匹配 → 模糊匹配）
        if category_name in cat_name_to_id:
            ctx.category_id = cat_name_to_id[category_name]
        else:
            # 模糊匹配：子串包含关系
            matched = None
            for wp_name, wp_id in cat_name_to_id.items():
                if wp_name in category_name or category_name in wp_name:
                    matched = (wp_name, wp_id)
                    break
            if matched:
                ctx.category_id = matched[1]
                logger.info(f"[AIAnalyze] 模糊匹配分类: '{category_name}' → '{matched[0]}'(ID={matched[1]})")
            else:
                # 选第一个非"未分类"的分类
                fallback = next(
                    ((n, i) for n, i in cat_name_to_id.items() if n != "未分类" and n.lower() != "uncategorized"),
                    None,
                )
                if fallback:
                    ctx.category_id = fallback[1]
                    logger.warning(f"[AIAnalyze] 分类 '{category_name}' 无匹配，使用 '{fallback[0]}'")
                else:
                    ctx.category_id = None
                    logger.warning(f"[AIAnalyze] 分类 '{category_name}' 无匹配，无可用分类")

        ctx.tags = result["tags"]
        ctx.seo = result["seo"]

        logger.info(
            f"[AIAnalyze] 分类={category_name}(ID={ctx.category_id}) "
            f"标签={ctx.tags} SEO标题={ctx.seo.title}"
        )
        return ctx

    def supports(self, ctx: GameContext) -> bool:
        return bool(ctx.steam_data) and ctx.seo is None
