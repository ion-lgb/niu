"""B2 主题 SEO 字段写入

基于 b2/Modules/Settings/Seo.php 源码的字段映射：
- zrz_seo_title
- zrz_seo_keywords
- zrz_seo_description
"""

import logging

from app.core.context import SEOData
from app.wordpress.client import WordPressClient

logger = logging.getLogger(__name__)

# B2 主题 SEO meta key（从源码提取）
SEO_META_KEYS = {
    "title": "zrz_seo_title",
    "keywords": "zrz_seo_keywords",
    "description": "zrz_seo_description",
}


async def write_b2_seo(wp_client: WordPressClient, post_id: int, seo: SEOData):
    """将 SEO 数据写入 B2 主题的 meta 字段"""
    meta = {
        SEO_META_KEYS["title"]: seo.title,
        SEO_META_KEYS["keywords"]: seo.keywords,
        SEO_META_KEYS["description"]: seo.description,
    }
    await wp_client.set_post_meta(post_id, meta)
    logger.info(f"[B2 SEO] 写入完成 post_id={post_id} title={seo.title[:30]}")
