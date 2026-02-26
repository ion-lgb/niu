"""Steam Collector - FastAPI 入口"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings

logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期：启动时初始化数据库"""
    from app.db import init_db
    await init_db()
    logger.info("数据库表已初始化")
    yield


app = FastAPI(title=settings.app_title, debug=settings.debug, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---- 路由注册 ----

from app.steam.api import router as steam_router  # noqa: E402
from app.api.collect import router as collect_router  # noqa: E402
from app.api.settings_api import router as settings_router  # noqa: E402
from app.api.history import router as history_router  # noqa: E402
from app.api.queue_api import router as queue_router  # noqa: E402
from app.api.dashboard import router as dashboard_router  # noqa: E402
from app.api.events import router as events_router  # noqa: E402

app.include_router(steam_router, prefix="/api/steam", tags=["Steam"])
app.include_router(collect_router, prefix="/api", tags=["采集"])
app.include_router(settings_router, prefix="/api/settings", tags=["设置"])
app.include_router(history_router, prefix="/api/history", tags=["历史"])
app.include_router(queue_router, prefix="/api/queue", tags=["队列"])
app.include_router(dashboard_router, prefix="/api/dashboard", tags=["仪表盘"])
app.include_router(events_router, prefix="/api/events", tags=["事件"])


@app.get("/api/health")
async def health():
    return {"status": "ok"}
