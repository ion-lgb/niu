"""EventBus - 轻量级异步事件总线

用于解耦核心流程与扩展模块（如 B2 主题集成）。
核心流程在关键节点 emit 事件，扩展模块注册回调。
"""

from __future__ import annotations

import logging
from collections import defaultdict
from typing import Any, Callable, Coroutine

logger = logging.getLogger(__name__)

HandlerFunc = Callable[..., Coroutine[Any, Any, None]]


class EventBus:
    """异步事件总线"""

    def __init__(self):
        self._handlers: dict[str, list[HandlerFunc]] = defaultdict(list)

    def on(self, event: str):
        """装饰器：注册事件处理器"""
        def decorator(fn: HandlerFunc) -> HandlerFunc:
            self._handlers[event].append(fn)
            return fn
        return decorator

    def register(self, event: str, handler: HandlerFunc):
        """显式注册事件处理器"""
        self._handlers[event].append(handler)

    async def emit(self, event: str, **kwargs):
        """触发事件，依次调用所有注册的处理器"""
        handlers = self._handlers.get(event, [])
        if not handlers:
            return

        logger.info(f"[EventBus] 触发 {event} | {len(handlers)} 个处理器")
        for handler in handlers:
            try:
                await handler(**kwargs)
            except Exception as e:
                logger.error(f"[EventBus] {event} 处理器 {handler.__name__} 失败: {e}")


# 全局事件总线实例
event_bus = EventBus()
