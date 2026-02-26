"""Pipeline - 可配置的处理管道

每个处理步骤实现 Processor 协议，Pipeline 按注册顺序依次执行。
supports() 返回 False 的 Processor 会被跳过。
任何 Processor 将 ctx.action 设为 "skip" 时，Pipeline 提前终止。
"""

from __future__ import annotations

import logging
from typing import Protocol, runtime_checkable

from app.core.context import GameContext

logger = logging.getLogger(__name__)


@runtime_checkable
class Processor(Protocol):
    """处理器协议 - 所有 Pipeline 步骤必须实现"""

    async def process(self, ctx: GameContext) -> GameContext:
        """处理上下文，返回修改后的上下文"""
        ...

    def supports(self, ctx: GameContext) -> bool:
        """是否支持处理当前上下文（返回 False 则跳过）"""
        ...


class Pipeline:
    """可配置的处理管道"""

    def __init__(self):
        self._processors: list[Processor] = []

    def pipe(self, processor: Processor) -> "Pipeline":
        """注册一个处理器"""
        self._processors.append(processor)
        return self

    async def run(self, ctx: GameContext) -> GameContext:
        """按顺序执行所有 Processor"""
        for p in self._processors:
            name = type(p).__name__
            if not p.supports(ctx):
                logger.debug(f"[Pipeline] 跳过 {name}（不支持当前上下文）")
                continue

            logger.info(f"[Pipeline] 执行 {name} | app_id={ctx.app_id}")
            try:
                ctx = await p.process(ctx)
            except Exception as e:
                logger.error(f"[Pipeline] {name} 失败: {e}")
                ctx.error = f"{name}: {e}"
                ctx.action = "skip"

            if ctx.action == "skip":
                logger.info(f"[Pipeline] 提前终止 | action=skip | app_id={ctx.app_id}")
                break

        return ctx

    def __len__(self) -> int:
        return len(self._processors)
