"""ImageDownload Processor - 并发下载图片到 WordPress 媒体库"""

from __future__ import annotations

import asyncio
import hashlib
import logging

import httpx

from app.core.context import GameContext
from app.config import settings
from app.wordpress.client import WordPressClient

logger = logging.getLogger(__name__)


class ImageDownloadProcessor:
    async def process(self, ctx: GameContext) -> GameContext:
        urls = self._collect_image_urls(ctx.steam_data)
        if not urls:
            ctx.image_ids = []
            return ctx

        wp = WordPressClient()
        sem = asyncio.Semaphore(settings.max_image_concurrency)
        tasks = [self._download_and_upload(url, ctx.app_id, i, sem, wp) for i, url in enumerate(urls)]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        ctx.image_ids = [r for r in results if isinstance(r, int) and r > 0]
        failed = sum(1 for r in results if isinstance(r, Exception))
        if failed:
            logger.warning(f"[ImageDownload] {failed}/{len(urls)} 张图片处理失败")

        return ctx

    def supports(self, ctx: GameContext) -> bool:
        return bool(ctx.steam_data) and ctx.image_ids is None

    def _collect_image_urls(self, steam_data: dict) -> list:
        """收集头图和截图 URL"""
        urls = []
        header = steam_data.get("header_image")
        if header:
            urls.append(header)
        for ss in steam_data.get("screenshots", []):
            full = ss.get("path_full")
            if full:
                urls.append(full)
        return urls[:11]  # 头图 + 最多10张截图

    async def _download_and_upload(
        self, url: str, app_id: int, index: int, sem: asyncio.Semaphore, wp: WordPressClient
    ) -> int:
        """下载单张图片并上传到 WP 媒体库"""
        async with sem:
            url_hash = hashlib.md5(url.encode()).hexdigest()[:8]
            filename = f"steam_{app_id}_{index}_{url_hash}.jpg"

            # 查重：搜索同名媒体
            existing = await wp.search_media(filename)
            if existing:
                media_id = existing.get("id", 0)
                logger.info(f"[ImageDownload] 已存在 {filename} → media_id={media_id}")
                return media_id

            # 下载
            async with httpx.AsyncClient(timeout=settings.image_download_timeout) as client:
                resp = await client.get(url)
                resp.raise_for_status()

            # 上传到 WP
            result = await wp.upload_media(resp.content, filename)
            media_id = result.get("id", 0)
            logger.info(f"[ImageDownload] 上传完成 {filename} → media_id={media_id}")
            return media_id
