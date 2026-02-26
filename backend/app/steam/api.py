"""Steam API 封装 - 搜索和获取游戏详情"""

from __future__ import annotations

import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.auth import get_current_user
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

STORE_SEARCH_URL = "https://store.steampowered.com/api/storesearch/"
APP_DETAILS_URL = "https://store.steampowered.com/api/appdetails"


async def search_games(query: str, page_size: int = 10) -> list[dict]:
    """搜索 Steam 游戏"""
    params = {
        "term": query,
        "cc": settings.steam_country_code,
        "l": settings.steam_language,
        "pagesize": page_size,
    }
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(STORE_SEARCH_URL, params=params)
        resp.raise_for_status()
        data = resp.json()
    return data.get("items", [])


async def get_app_details(app_id: int) -> dict | None:
    """获取 Steam 游戏详情"""
    params = {
        "appids": str(app_id),
        "cc": settings.steam_country_code,
        "l": settings.steam_language,
    }
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(APP_DETAILS_URL, params=params)
        resp.raise_for_status()
        data = resp.json()

    app_data = data.get(str(app_id), {})
    if not app_data.get("success"):
        return None
    return app_data.get("data")


# ---- 路由 ----

@router.get("/search")
async def api_search(q: str = Query(..., min_length=1), limit: int = Query(10, le=25), _user: str = Depends(get_current_user)):
    """搜索 Steam 游戏"""
    try:
        items = await search_games(q, page_size=limit)
    except httpx.HTTPError as e:
        raise HTTPException(502, f"Steam API 请求失败: {e}")
    return {"items": items, "total": len(items)}


@router.get("/app/{app_id}")
async def api_app_details(app_id: int, _user: str = Depends(get_current_user)):
    """获取 Steam 游戏详情"""
    try:
        data = await get_app_details(app_id)
    except httpx.HTTPError as e:
        raise HTTPException(502, f"Steam API 请求失败: {e}")
    if data is None:
        raise HTTPException(404, f"未找到游戏 app_id={app_id}")
    return data
