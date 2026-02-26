from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.auth import get_current_user
from app.core import GameContext, Pipeline
from app.steam.api import get_app_details
from app.db.engine import async_session
from app.db import crud

logger = logging.getLogger(__name__)
router = APIRouter()


class CollectRequest(BaseModel):
    app_id: int
    enable_rewrite: bool = True
    enable_analyze: bool = True
    rewrite_style: str = "resource_site"
    post_status: str = "draft"


class CollectResponse(BaseModel):
    app_id: int
    action: str
    post_id: Optional[int] = None
    error: Optional[str] = None
    record_id: Optional[int] = None


def _build_pipeline(req: CollectRequest) -> Pipeline:
    """根据请求参数构建 Pipeline"""
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

    if req.enable_analyze:
        pipeline.pipe(AIAnalyzeProcessor())
    if req.enable_rewrite:
        pipeline.pipe(AIRewriteProcessor(style=req.rewrite_style))

    pipeline.pipe(ImageDownloadProcessor())
    pipeline.pipe(ContentBuildProcessor())
    pipeline.pipe(PostPublishProcessor(status=req.post_status))

    return pipeline


@router.post("/collect", response_model=CollectResponse)
async def collect_game(req: CollectRequest, _user: str = Depends(get_current_user)):
    """采集单个游戏（含数据库记录跟踪）"""

    # 创建数据库记录
    async with async_session() as session:
        record = await crud.create_record(
            session,
            app_id=req.app_id,
            options=req.model_dump(),
        )
        record_id = record.id

    # 标记运行中
    async with async_session() as session:
        await crud.update_record_status(session, record_id, status="running")

    try:
        ctx = GameContext(app_id=req.app_id)
        pipeline = _build_pipeline(req)
        ctx = await pipeline.run(ctx)

        # 更新成功
        async with async_session() as session:
            await crud.update_record_status(
                session,
                record_id,
                status="completed",
                action=ctx.action,
                post_id=ctx.post_id,
                seo_data=ctx.seo.model_dump() if ctx.seo else None,
                tags=ctx.tags,
                category_id=ctx.category_id,
            )

        return CollectResponse(
            app_id=ctx.app_id,
            action=ctx.action,
            post_id=ctx.post_id,
            error=ctx.error,
            record_id=record_id,
        )

    except Exception as e:
        # 更新失败
        async with async_session() as session:
            await crud.update_record_status(
                session, record_id, status="failed", error=str(e)
            )
        logger.error(f"[Collect] 采集失败 app_id={req.app_id}: {e}")
        return CollectResponse(
            app_id=req.app_id,
            action="skip",
            error=str(e),
            record_id=record_id,
        )


@router.post("/collect/preview")
async def preview_game(req: CollectRequest, _user: str = Depends(get_current_user)):
    """预览采集结果（不发布）"""
    # 只执行到内容构建，不发布
    steam_data = await get_app_details(req.app_id)
    if steam_data is None:
        raise HTTPException(404, f"未找到游戏 app_id={req.app_id}")

    ctx = GameContext(app_id=req.app_id, steam_data=steam_data)

    # 只运行分析和改写
    if req.enable_analyze:
        from app.processors.ai_analyze import AIAnalyzeProcessor
        processor = AIAnalyzeProcessor()
        if processor.supports(ctx):
            ctx = await processor.process(ctx)

    if req.enable_rewrite:
        from app.processors.ai_rewrite import AIRewriteProcessor
        processor = AIRewriteProcessor(style=req.rewrite_style)
        if processor.supports(ctx):
            ctx = await processor.process(ctx)

    return {
        "app_id": ctx.app_id,
        "game_name": steam_data.get("name"),
        "rewritten_content": ctx.rewritten_content,
        "category_id": ctx.category_id,
        "tags": ctx.tags,
        "seo": ctx.seo.model_dump() if ctx.seo else None,
    }
