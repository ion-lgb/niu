"""WordPress REST API Client"""

from __future__ import annotations

import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class WordPressClient:
    """WordPress REST API 封装"""

    def __init__(
        self,
        base_url: str | None = None,
        username: str | None = None,
        app_password: str | None = None,
    ):
        self.base_url = (base_url or settings.wp_url).rstrip("/")
        self._auth = (
            username or settings.wp_username,
            app_password or settings.wp_app_password,
        )

    def _client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(auth=self._auth, timeout=30.0)

    async def create_post(
        self,
        title: str,
        content: str,
        status: str = "draft",
        categories: list[int] | None = None,
        tags: list[str] | None = None,
        meta: dict | None = None,
        featured_media: int | None = None,
    ) -> dict:
        """创建文章"""
        data: dict = {
            "title": title,
            "content": content,
            "status": status,
        }
        if categories:
            data["categories"] = categories
        if tags:
            # WP REST API 用 tag name 自动创建/匹配
            data["tags"] = await self._resolve_tag_ids(tags)
        if meta:
            data["meta"] = meta
        if featured_media:
            data["featured_media"] = featured_media

        async with self._client() as client:
            resp = await client.post(
                f"{self.base_url}/wp-json/wp/v2/posts", json=data
            )
            resp.raise_for_status()
            result = resp.json()

        logger.info(f"[WP] 文章创建 id={result.get('id')} title={title[:30]}")
        return result

    async def update_post(self, post_id: int, **kwargs) -> dict:
        """更新文章"""
        async with self._client() as client:
            resp = await client.post(
                f"{self.base_url}/wp-json/wp/v2/posts/{post_id}", json=kwargs
            )
            resp.raise_for_status()
            return resp.json()

    async def set_post_meta(self, post_id: int, meta: dict) -> dict:
        """写入文章 meta 字段"""
        return await self.update_post(post_id, meta=meta)

    async def upload_media(
        self, image_bytes: bytes, filename: str, mime_type: str = "image/jpeg"
    ) -> dict:
        """上传图片到媒体库"""
        headers = {
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": mime_type,
        }
        async with self._client() as client:
            resp = await client.post(
                f"{self.base_url}/wp-json/wp/v2/media",
                content=image_bytes,
                headers=headers,
            )
            resp.raise_for_status()
            result = resp.json()

        logger.info(f"[WP] 媒体上传 id={result.get('id')} file={filename}")
        return result

    async def search_media(self, search: str) -> dict | None:
        """搜索媒体库（用于去重）"""
        async with self._client() as client:
            resp = await client.get(
                f"{self.base_url}/wp-json/wp/v2/media",
                params={"search": search, "per_page": 1},
            )
            resp.raise_for_status()
            items = resp.json()
        return items[0] if items else None

    async def get_categories(self) -> list[dict]:
        """获取所有文章分类"""
        async with self._client() as client:
            resp = await client.get(
                f"{self.base_url}/wp-json/wp/v2/categories",
                params={"per_page": 100},
            )
            resp.raise_for_status()
            return resp.json()

    async def _resolve_tag_ids(self, tag_names: list[str]) -> list[int]:
        """将标签名转为 tag ID（不存在则创建）"""
        ids = []
        async with self._client() as client:
            for name in tag_names:
                # 先搜索
                resp = await client.get(
                    f"{self.base_url}/wp-json/wp/v2/tags",
                    params={"search": name, "per_page": 1},
                )
                resp.raise_for_status()
                existing = resp.json()
                if existing and existing[0].get("name") == name:
                    ids.append(existing[0]["id"])
                else:
                    # 创建
                    resp = await client.post(
                        f"{self.base_url}/wp-json/wp/v2/tags",
                        json={"name": name},
                    )
                    if resp.status_code in (200, 201):
                        ids.append(resp.json()["id"])
        return ids

    async def check_connection(self) -> bool:
        """测试连接"""
        try:
            async with self._client() as client:
                resp = await client.get(
                    f"{self.base_url}/wp-json/wp/v2/posts",
                    params={"per_page": 1},
                )
                return resp.status_code == 200
        except Exception:
            return False
