"""SteamFetch Processor - 从 Steam API 获取游戏数据"""

from app.core.context import GameContext
from app.steam.api import get_app_details


class SteamFetchProcessor:
    async def process(self, ctx: GameContext) -> GameContext:
        data = await get_app_details(ctx.app_id)
        if data is None:
            ctx.error = f"Steam API 未找到游戏 app_id={ctx.app_id}"
            ctx.action = "skip"
            return ctx
        ctx.steam_data = data
        return ctx

    def supports(self, ctx: GameContext) -> bool:
        return not ctx.steam_data  # 如果已有数据则跳过
