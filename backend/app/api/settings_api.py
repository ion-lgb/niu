"""设置 API - 读取和更新配置、连接测试"""

import logging
import os
from pathlib import Path
from typing import Optional

import httpx
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.auth import get_current_user
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

# .env 文件路径：优先 data/ 目录（Docker 持久化），回退到项目根目录
_app_root = Path(__file__).resolve().parent.parent.parent
_data_env = _app_root / "data" / ".env"
_root_env = _app_root / ".env"


def _get_env_path() -> Path:
    """动态获取 .env 路径：优先 data/ 持久化目录"""
    return _data_env if _data_env.exists() else _root_env


class SettingsResponse(BaseModel):
    ai_provider: str
    ai_model: str
    ai_api_key: str = ""
    ai_base_url: str = ""
    wp_url: str
    wp_username: str
    wp_app_password: str = ""
    steam_request_delay: float
    default_post_status: str
    enable_ai_rewrite: bool
    enable_ai_analyze: bool
    rewrite_style: str


class UpdateSettingsRequest(BaseModel):
    ai_provider: Optional[str] = None
    ai_model: Optional[str] = None
    ai_api_key: Optional[str] = None
    ai_base_url: Optional[str] = None
    wp_url: Optional[str] = None
    wp_username: Optional[str] = None
    wp_app_password: Optional[str] = None
    default_post_status: Optional[str] = None
    enable_ai_rewrite: Optional[bool] = None
    enable_ai_analyze: Optional[bool] = None
    rewrite_style: Optional[str] = None


# 允许通过 API 修改的字段白名单
_ALLOWED_FIELDS = {
    "ai_provider", "ai_model", "ai_api_key", "ai_base_url",
    "wp_url", "wp_username", "wp_app_password",
    "default_post_status", "enable_ai_rewrite", "enable_ai_analyze", "rewrite_style",
}


def _read_env() -> dict:
    """读取 .env 文件为 dict"""
    env = {}
    env_path = _get_env_path()
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, _, value = line.partition("=")
                env[key.strip()] = value.strip()
    return env


def _write_env(env: dict):
    """将 dict 写入 .env 文件"""
    lines = [f"{k}={v}" for k, v in sorted(env.items())]
    _get_env_path().write_text("\n".join(lines) + "\n")


def _reload_settings(env: dict):
    """重载 settings 单例的字段"""
    prefix = "SC_"
    for key, value in env.items():
        field = key.lower().removeprefix(prefix.lower())
        if hasattr(settings, field):
            current = getattr(settings, field)
            # 类型转换
            if isinstance(current, bool):
                setattr(settings, field, value.lower() in ("true", "1", "yes"))
            elif isinstance(current, int):
                try:
                    setattr(settings, field, int(value))
                except ValueError:
                    pass
            elif isinstance(current, float):
                try:
                    setattr(settings, field, float(value))
                except ValueError:
                    pass
            else:
                setattr(settings, field, value)


@router.get("", response_model=SettingsResponse)
async def get_settings(_user: str = Depends(get_current_user)):
    return SettingsResponse(
        ai_provider=settings.ai_provider,
        ai_model=settings.ai_model,
        ai_api_key=_mask_key(settings.ai_api_key),
        ai_base_url=settings.ai_base_url or "",
        wp_url=settings.wp_url,
        wp_username=settings.wp_username,
        wp_app_password=_mask_key(settings.wp_app_password),
        steam_request_delay=settings.steam_request_delay,
        default_post_status=settings.default_post_status,
        enable_ai_rewrite=settings.enable_ai_rewrite,
        enable_ai_analyze=settings.enable_ai_analyze,
        rewrite_style=settings.rewrite_style,
    )


def _mask_key(value: str) -> str:
    """敏感字段脱敏：只显示前 4 和后 4 位"""
    if not value or len(value) <= 8:
        return "*" * len(value) if value else ""
    return value[:4] + "*" * (len(value) - 8) + value[-4:]


@router.put("")
async def update_settings(req: UpdateSettingsRequest, _user: str = Depends(get_current_user)):
    """更新设置并持久化到 .env"""
    env = _read_env()
    updated = []

    for field_name, value in req.model_dump(exclude_none=True).items():
        if field_name not in _ALLOWED_FIELDS:
            continue
        env_key = f"SC_{field_name.upper()}"
        env[env_key] = str(value).lower() if isinstance(value, bool) else str(value)
        # 同步更新内存中的 settings 对象
        setattr(settings, field_name, value)
        updated.append(field_name)

    _write_env(env)
    logger.info(f"[设置] 已更新并保存: {updated}")
    return {"ok": True, "updated": updated}


@router.post("/test-wp")
async def test_wordpress(_user: str = Depends(get_current_user)):
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
async def test_ai(_user: str = Depends(get_current_user)):
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
