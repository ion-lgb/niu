"""SSE 事件总线 + 事件流端点"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

from fastapi import APIRouter, Depends
from starlette.responses import StreamingResponse

from app.api.auth import get_current_user_from_query

logger = logging.getLogger(__name__)
router = APIRouter()

# ---- 全局事件总线 ----

_subscribers: list[asyncio.Queue] = []


def publish(event: dict[str, Any]):
    """向所有订阅者发布事件"""
    for q in _subscribers:
        try:
            q.put_nowait(event)
        except asyncio.QueueFull:
            pass  # 丢弃溢出事件


def subscribe() -> asyncio.Queue:
    """订阅事件流"""
    q: asyncio.Queue = asyncio.Queue(maxsize=50)
    _subscribers.append(q)
    return q


def unsubscribe(q: asyncio.Queue):
    """取消订阅"""
    if q in _subscribers:
        _subscribers.remove(q)


# ---- SSE 端点 ----

@router.get("/stream")
async def event_stream(_user: str = Depends(get_current_user_from_query)):
    """SSE 事件流"""
    q = subscribe()

    async def generate():
        try:
            while True:
                try:
                    event = await asyncio.wait_for(q.get(), timeout=30)
                    data = json.dumps(event, ensure_ascii=False)
                    yield f"data: {data}\n\n"
                except asyncio.TimeoutError:
                    # 发送心跳保持连接
                    yield ": heartbeat\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            unsubscribe(q)

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
