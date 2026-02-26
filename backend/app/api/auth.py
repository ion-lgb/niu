"""认证模块 - JWT 登录 + 令牌校验 + 登录限速"""

import time
import logging
from collections import defaultdict
from datetime import datetime, timedelta, timezone

import jwt
import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

# ---- 登录限速 ----

_login_attempts: dict[str, list[float]] = defaultdict(list)
_RATE_LIMIT = 5        # 每窗口最大尝试次数
_RATE_WINDOW = 60      # 窗口大小（秒）


def _check_rate_limit(ip: str):
    """检查登录限速，超限抛 429"""
    now = time.time()
    attempts = _login_attempts[ip]
    # 清除过期记录
    _login_attempts[ip] = [t for t in attempts if now - t < _RATE_WINDOW]
    if len(_login_attempts[ip]) >= _RATE_LIMIT:
        raise HTTPException(429, "登录尝试过于频繁，请稍后再试")
    _login_attempts[ip].append(now)


# ---- 密码校验 ----

# 启动时预哈希密码（避免每次登录都做 bcrypt）
_password_hash: str = ""


def init_auth():
    """初始化认证模块，预哈希管理员密码。应在应用启动时调用。"""
    global _password_hash
    if not settings.auth_password:
        raise RuntimeError("SC_AUTH_PASSWORD 未设置，拒绝启动！请在 .env 中设置。")
    if not settings.jwt_secret:
        raise RuntimeError("SC_JWT_SECRET 未设置，拒绝启动！请在 .env 中设置。")
    _password_hash = bcrypt.hashpw(
        settings.auth_password.encode("utf-8"), bcrypt.gensalt()
    )
    logger.info("[认证] 认证模块已初始化")


# ---- JWT 工具 ----

def _create_token(username: str) -> str:
    """创建 JWT token"""
    payload = {
        "sub": username,
        "exp": datetime.now(timezone.utc) + timedelta(hours=settings.jwt_expire_hours),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def _decode_token(token: str) -> dict:
    """解码并校验 JWT token"""
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "令牌已过期，请重新登录")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "无效令牌")


# ---- 依赖注入 ----

_bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
) -> str:
    """FastAPI 依赖：从 Authorization 头中提取并校验 JWT。
    返回用户名字符串。
    """
    if credentials is None:
        raise HTTPException(401, "未提供认证令牌", headers={"WWW-Authenticate": "Bearer"})
    payload = _decode_token(credentials.credentials)
    return payload.get("sub", "unknown")


async def get_current_user_from_query(token: str = Query(..., alias="token")) -> str:
    """从查询参数中提取 token（用于 SSE 等不支持自定义头的场景）"""
    payload = _decode_token(token)
    return payload.get("sub", "unknown")


# ---- 登录端点 ----

class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    token: str
    token_type: str = "bearer"
    expires_in: int


@router.post("/login", response_model=LoginResponse)
async def login(req: LoginRequest, request: Request):
    """用户登录，返回 JWT token"""
    client_ip = request.client.host if request.client else "unknown"
    _check_rate_limit(client_ip)

    if req.username != settings.auth_username or not bcrypt.checkpw(
        req.password.encode("utf-8"), _password_hash
    ):
        logger.warning(f"[认证] 登录失败: {req.username} from {client_ip}")
        raise HTTPException(401, "用户名或密码错误")

    token = _create_token(req.username)
    logger.info(f"[认证] 登录成功: {req.username} from {client_ip}")

    return LoginResponse(
        token=token,
        expires_in=settings.jwt_expire_hours * 3600,
    )
