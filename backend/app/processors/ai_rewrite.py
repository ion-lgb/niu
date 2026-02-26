"""AIRewrite Processor - 调用 AI 改写游戏描述"""

import logging

from app.ai.rewriter import AIRewriter
from app.core.context import GameContext

logger = logging.getLogger(__name__)


class AIRewriteProcessor:
    def __init__(self, style: str = "resource_site"):
        self.style = style
        self.rewriter = AIRewriter()

    async def process(self, ctx: GameContext) -> GameContext:
        ctx.rewritten_content = await self.rewriter.rewrite(ctx.steam_data, self.style)
        logger.info(f"[AIRewrite] 改写完成 | 风格={self.style} | 字数={len(ctx.rewritten_content)}")
        return ctx

    def supports(self, ctx: GameContext) -> bool:
        return bool(ctx.steam_data) and ctx.rewritten_content is None
