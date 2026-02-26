"""ARQ 任务队列管理

提供两种运行模式：
1. 有 Redis 时：使用 ARQ 异步任务队列
2. 无 Redis 时：降级为同步执行（开发环境友好）
"""

from __future__ import annotations

import logging
from typing import Optional, List

from app.config import settings

logger = logging.getLogger(__name__)


async def collect_game_task(ctx: dict, app_id: int, options: Optional[dict] = None):
    """ARQ 任务函数 - 采集单个游戏

    ctx 由 ARQ 自动注入，包含 Redis 连接等信息
    """
    from app.core import GameContext, Pipeline
    from app.db.engine import async_session
    from app.db import crud

    logger.info(f"[队列] 开始采集 app_id={app_id}")

    # 创建数据库记录
    async with async_session() as session:
        record = await crud.create_record(session, app_id=app_id, options=options)
        record_id = record.id

    # 更新为 running
    async with async_session() as session:
        await crud.update_record_status(session, record_id, status="running")

    try:
        # 构建 Pipeline
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

        logger.info(f"[队列] 采集完成 app_id={app_id} action={game_ctx.action}")

        # 发布事件到 SSE
        from app.api.events import publish
        publish({
            "type": "task_done",
            "app_id": app_id,
            "game_name": game_ctx.steam_data.get("name", "") if game_ctx.steam_data else "",
            "action": game_ctx.action,
            "post_id": game_ctx.post_id,
        })

        return {"app_id": app_id, "action": game_ctx.action, "post_id": game_ctx.post_id}

    except Exception as e:
        logger.error(f"[队列] 采集失败 app_id={app_id}: {e}")
        async with async_session() as session:
            await crud.update_record_status(
                session, record_id, status="failed", error=str(e)
            )

        # 发布失败事件
        from app.api.events import publish
        publish({
            "type": "task_fail",
            "app_id": app_id,
            "error": str(e)[:200],
        })

        raise


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


async def enqueue_collect(app_id: int, options: Optional[dict] = None) -> str:
    """将采集任务加入队列

    返回：job_id 或 'sync' (降级模式)
    """
    try:
        from arq import create_pool
        from arq.connections import RedisSettings

        pool = await create_pool(RedisSettings.from_dsn(settings.redis_url))
        job = await pool.enqueue_job("collect_game_task", app_id, options)
        logger.info(f"[队列] 已入队 app_id={app_id} job_id={job.job_id}")
        return job.job_id
    except Exception as e:
        # Redis 不可用 → 降级同步执行
        logger.warning(f"[队列] Redis 不可用，降级同步执行: {e}")
        await collect_game_task({}, app_id, options)
        return "sync"


async def enqueue_batch(
    app_ids: List[int], options: Optional[dict] = None
) -> List[str]:
    """批量入队"""
    job_ids = []
    for app_id in app_ids:
        job_id = await enqueue_collect(app_id, options)
        job_ids.append(job_id)
    return job_ids


# ARQ Worker 配置（由 arq 命令行工具使用）
class WorkerSettings:
    """arq worker 启动时读取此配置

    使用方式: arq app.queue.manager.WorkerSettings
    """
    functions = [collect_game_task]
    max_jobs = 3
    job_timeout = 300  # 5 分钟超时

    @staticmethod
    def redis_settings():
        from arq.connections import RedisSettings
        return RedisSettings.from_dsn(settings.redis_url)
