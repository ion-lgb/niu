"""应用配置管理"""

from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """所有配置通过环境变量或 .env 文件加载"""

    # --- FastAPI ---
    app_title: str = "Steam Collector"
    debug: bool = False

    # --- 认证 ---
    auth_username: str = "admin"
    auth_password: str = ""          # SC_AUTH_PASSWORD
    jwt_secret: str = ""             # SC_JWT_SECRET
    jwt_expire_hours: int = 24

    # --- CORS ---
    cors_origins: str = "http://localhost:3000"  # SC_CORS_ORIGINS，逗号分隔

    # --- AI ---
    ai_provider: str = "deepseek"
    ai_model: str = "deepseek-chat"
    ai_api_key: str = ""
    ai_base_url: Optional[str] = None

    # --- WordPress ---
    wp_url: str = ""
    wp_username: str = ""
    wp_app_password: str = ""

    # --- Steam ---
    steam_request_delay: float = 3.0
    steam_country_code: str = "CN"
    steam_language: str = "schinese"

    # --- Database ---
    database_url: str = "sqlite+aiosqlite:///./data/collector.db"

    # --- 采集默认设置 ---
    default_post_status: str = "draft"
    enable_ai_rewrite: bool = True
    enable_ai_analyze: bool = True
    rewrite_style: str = "resource_site"
    max_image_concurrency: int = 5
    image_download_timeout: int = 30
    default_category_id: int = 1

    model_config = {
        "env_file": ["data/.env", ".env"],  # Docker 持久化优先，本地开发回退
        "env_prefix": "SC_",
    }


settings = Settings()
