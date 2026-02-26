"""AI Analyzer - 一次调用完成分类+标签+SEO"""

from __future__ import annotations

import json
import logging

from app.ai.client import AIClient
from app.ai.prompts import ANALYZER_SYSTEM, ANALYZER_PROMPT
from app.core.context import SEOData

logger = logging.getLogger(__name__)


class AIAnalyzer:
    def __init__(self, ai_client: AIClient | None = None):
        self.client = ai_client or AIClient()

    async def analyze(
        self,
        game_data: dict,
        existing_categories: list[str] | None = None,
    ) -> dict:
        """一次 AI 调用返回 {category, tags, seo}"""
        categories = existing_categories or ["uncategorized"]

        prompt = ANALYZER_PROMPT.format(
            game_name=game_data.get("name", ""),
            game_description=game_data.get("short_description", ""),
            developer=", ".join(game_data.get("developers", [])),
            steam_tags=", ".join(
                g.get("description", "") for g in game_data.get("genres", [])
            ),
            existing_categories="\n".join(f"- {c}" for c in categories),
        )

        raw = await self.client.chat(
            prompt=prompt,
            system=ANALYZER_SYSTEM,
            json_mode=True,
            temperature=0.3,
        )

        try:
            result = json.loads(raw)
        except json.JSONDecodeError:
            logger.error(f"[AIAnalyzer] JSON 解析失败: {raw[:200]}")
            return self._fallback(game_data)

        return {
            "category": result.get("category", "uncategorized"),
            "tags": result.get("tags", []),
            "seo": SEOData(**result.get("seo", {})),
        }

    def _fallback(self, game_data: dict) -> dict:
        """AI 失败时的降级策略"""
        name = game_data.get("name", "")
        desc = game_data.get("short_description", "")[:160]
        tags = [g.get("description", "") for g in game_data.get("genres", [])][:5]

        return {
            "category": "uncategorized",
            "tags": tags,
            "seo": SEOData(
                title=f"{name}下载|中文版|免安装绿色版",
                description=desc,
                keywords=f"{name}下载,{name}破解版,{name}中文版",
            ),
        }
