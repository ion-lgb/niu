"""数据库驱动的任务队列

使用 SQLite CollectRecord 表作为队列存储，后台 asyncio 协程作为消费者。
无需 Redis / ARQ，零额外开销。
"""

from __future__ import annotations

import asyncio
import logging
from typing import Optional, List

logger = logging.getLogger(__name__)

# 后台 Worker 单例
_worker_task: Optional[asyncio.Task] = None


async def collect_game_task(app_id: int, options: Optional[dict] = None, record_id: Optional[int] = None):
    """执行单个游戏采集（被后台 Worker 调用）"""
    from app.core import GameContext, Pipeline
    from app.db.engine import async_session
    from app.db import crud

    # 如果没有传入 record_id，创建记录
    if record_id is None:
        async with async_session() as session:
            record = await crud.create_record(session, app_id=app_id, options=options)
            record_id = record.id

    # 更新为 running
    async with async_session() as session:
        await crud.update_record_status(session, record_id, status="running")

    try:
        game_ctx = GameContext(app_id=app_id)
        pipeline = _build_pipeline_from_options(options or {})
        game_ctx = await pipeline.run(game_ctx)

        # 成功 → 更新记录
        async with async_session() as session:
            await crud.update_record_status(
                session,
                record_id,
                status="completed",
                action=game_ctx.action,
                post_id=game_ctx.post_id,
                seo_data=game_ctx.seo.model_dump() if game_ctx.seo else None,
                tags=game_ctx.tags,
                category_id=game_ctx.category_id,
            )

        # 更新游戏名到记录
        if game_ctx.steam_data:
            async with async_session() as session:
                await crud.update_record_game_name(
                    session, record_id, game_ctx.steam_data.get("name", "")
                )

        logger.info(f"[队列] 采集完成 app_id={app_id} action={game_ctx.action}")

        # SSE 通知
        from app.api.events import publish
        publish({
            "type": "task_done",
            "app_id": app_id,
            "game_name": game_ctx.steam_data.get("name", "") if game_ctx.steam_data else "",
            "action": game_ctx.action,
            "post_id": game_ctx.post_id,
        })

    except Exception as e:
        logger.error(f"[队列] 采集失败 app_id={app_id}: {e}")
        async with async_session() as session:
            await crud.update_record_status(
                session, record_id, status="failed", error=str(e)
            )

        from app.api.events import publish
        publish({
            "type": "task_fail",
            "app_id": app_id,
            "error": str(e)[:200],
        })


def _build_pipeline_from_options(options: dict):
    """根据选项构建 Pipeline"""
    from app.core import Pipeline
    from app.processors.steam_fetch import SteamFetchProcessor
    from app.processors.duplicate_check import DuplicateCheckProcessor
    from app.processors.ai_analyze import AIAnalyzeProcessor
    from app.processors.ai_rewrite import AIRewriteProcessor
    from app.processors.image_download import ImageDownloadProcessor
    from app.processors.content_build import ContentBuildProcessor
    from app.processors.post_publish import PostPublishProcessor

    pipeline = Pipeline()
    pipeline.pipe(SteamFetchProcessor())
    pipeline.pipe(DuplicateCheckProcessor())

    if options.get("enable_analyze", True):
        pipeline.pipe(AIAnalyzeProcessor())
    if options.get("enable_rewrite", True):
        pipeline.pipe(AIRewriteProcessor(style=options.get("rewrite_style", "resource_site")))

    pipeline.pipe(ImageDownloadProcessor())
    pipeline.pipe(ContentBuildProcessor())
    pipeline.pipe(PostPublishProcessor(status=options.get("post_status", "draft")))

    return pipeline


async def enqueue_collect(app_id: int, options: Optional[dict] = None) -> int:
    """将采集任务写入数据库队列，返回 record_id"""
    from app.db.engine import async_session
    from app.db import crud

    async with async_session() as session:
        record = await crud.create_record(session, app_id=app_id, options=options)
        record_id = record.id

    logger.info(f"[队列] 已入队 app_id={app_id} record_id={record_id}")
    return record_id


async def enqueue_batch(
    app_ids: List[int], options: Optional[dict] = None
) -> List[int]:
    """批量入队"""
    record_ids = []
    for app_id in app_ids:
        record_id = await enqueue_collect(app_id, options)
        record_ids.append(record_id)
    return record_ids


# ---- 后台 Worker ----

async def _worker_loop():
    """后台循环：轮询数据库中 pending 任务并执行"""
    from app.db.engine import async_session
    from app.db import crud

    logger.info("[Worker] 后台队列 Worker 已启动")

    while True:
        try:
            # 查找下一个 pending 任务
            async with async_session() as session:
                record = await crud.get_next_pending(session)

            if record:
                logger.info(f"[Worker] 开始处理 record_id={record.id} app_id={record.app_id}")
                await collect_game_task(
                    app_id=record.app_id,
                    options=record.options,
                    record_id=record.id,
                )
            else:
                # 没有待处理任务，等待 5 秒后再查
                await asyncio.sleep(5)

        except asyncio.CancelledError:
            logger.info("[Worker] 后台队列 Worker 已停止")
            break
        except Exception as e:
            logger.error(f"[Worker] 意外错误: {e}")
            await asyncio.sleep(5)


def start_worker():
    """启动后台 Worker（在 FastAPI lifespan 中调用）"""
    global _worker_task
    _worker_task = asyncio.create_task(_worker_loop())
    logger.info("[Worker] 后台 Worker 任务已创建")


def stop_worker():
    """停止后台 Worker"""
    global _worker_task
    if _worker_task and not _worker_task.done():
        _worker_task.cancel()
        logger.info("[Worker] 后台 Worker 任务已取消")
