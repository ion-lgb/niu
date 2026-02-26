"""设置 API - 读取和更新配置、连接测试"""

import logging

import httpx
from fastapi import APIRouter
from pydantic import BaseModel

from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


class SettingsResponse(BaseModel):
    ai_provider: str
    ai_model: str
    wp_url: str
    wp_username: str
    steam_request_delay: float
    default_post_status: str
    enable_ai_rewrite: bool
    enable_ai_analyze: bool
    rewrite_style: str


@router.get("", response_model=SettingsResponse)
async def get_settings():
    return SettingsResponse(
        ai_provider=settings.ai_provider,
        ai_model=settings.ai_model,
        wp_url=settings.wp_url,
        wp_username=settings.wp_username,
        steam_request_delay=settings.steam_request_delay,
        default_post_status=settings.default_post_status,
        enable_ai_rewrite=settings.enable_ai_rewrite,
        enable_ai_analyze=settings.enable_ai_analyze,
        rewrite_style=settings.rewrite_style,
    )


@router.post("/test-wp")
async def test_wordpress():
    """测试 WordPress 连接"""
    if not settings.wp_url:
        return {"ok": False, "error": "WordPress URL 未配置"}
    try:
        async with httpx.AsyncClient(
            auth=(settings.wp_username, settings.wp_app_password),
            timeout=10,
        ) as client:
            resp = await client.get(f"{settings.wp_url}/wp-json/wp/v2/posts?per_page=1")
            resp.raise_for_status()
        return {"ok": True}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@router.post("/test-ai")
async def test_ai():
    """测试 AI 连接"""
    if not settings.ai_api_key:
        return {"ok": False, "error": "AI API Key 未配置"}
    try:
        from app.ai.client import AIClient
        client = AIClient()
        result = await client.chat("回复OK", system="只回复OK两个字母")
        return {"ok": True, "response": result[:50]}
    except Exception as e:
        return {"ok": False, "error": str(e)}
