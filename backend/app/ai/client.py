"""AI Client - litellm 统一封装

所有 AI 模块通过此 Client 调用 LLM，不直接使用 litellm。
"""

from __future__ import annotations

import logging

import litellm
from litellm import acompletion

from app.config import settings

logger = logging.getLogger(__name__)

# 关闭 litellm 自身日志（太啰嗦）
litellm.suppress_debug_info = True


class AIClient:
    """统一 AI 调用层"""

    def __init__(
        self,
        provider: str | None = None,
        model: str | None = None,
        api_key: str | None = None,
        base_url: str | None = None,
    ):
        self.provider = provider or settings.ai_provider
        self.model = model or settings.ai_model
        self.api_key = api_key or settings.ai_api_key
        self.base_url = base_url or settings.ai_base_url

        # litellm 格式: provider/model
        self._model_id = f"{self.provider}/{self.model}"

    async def chat(
        self,
        prompt: str,
        system: str = "",
        json_mode: bool = False,
        temperature: float = 0.7,
    ) -> str:
        """发送聊天请求，返回文本"""
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        kwargs = {
            "model": self._model_id,
            "messages": messages,
            "temperature": temperature,
            "api_key": self.api_key,
        }

        if self.base_url:
            kwargs["api_base"] = self.base_url

        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}

        logger.info(f"[AIClient] 调用 {self._model_id} | json={json_mode}")
        response = await acompletion(**kwargs)
        content = response.choices[0].message.content
        logger.debug(f"[AIClient] 响应长度: {len(content)} 字符")
        return content
