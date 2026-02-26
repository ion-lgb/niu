"""AI Rewriter - 资源站风格内容改写"""

from __future__ import annotations

import logging
import re

from app.ai.client import AIClient
from app.ai.prompts import REWRITER_SYSTEM, REWRITE_TEMPLATES

logger = logging.getLogger(__name__)


class AIRewriter:
    def __init__(self, ai_client: AIClient | None = None):
        self.client = ai_client or AIClient()

    async def rewrite(self, game_data: dict, style: str = "resource_site") -> str:
        """改写游戏描述"""
        template = REWRITE_TEMPLATES.get(style, REWRITE_TEMPLATES["resource_site"])
        original = game_data.get("detailed_description", "")
        # 去除 HTML 标签
        original_clean = re.sub(r"<[^>]+>", "", original)

        prompt = template.format(
            game_name=game_data.get("name", ""),
            original_description=original_clean[:3000],  # 限制输入长度
        )

        content = await self.client.chat(
            prompt=prompt,
            system=REWRITER_SYSTEM,
            temperature=0.8,
        )
        return content.strip()
