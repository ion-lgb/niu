"""GameContext - 采集流程的上下文对象

整个 Pipeline 中各 Processor 共享此对象，
每个 Processor 读取自己需要的字段、写入自己的产出。
"""

from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class SEOData(BaseModel):
    """SEO 元数据"""
    title: str = ""
    description: str = ""
    keywords: str = ""


class GameContext(BaseModel):
    """采集流程上下文 - Pipeline 中唯一的数据载体"""

    # ---- 输入 ----
    app_id: int
    steam_data: dict = Field(default_factory=dict)

    # ---- 各 Processor 产出 ----
    rewritten_content: Optional[str] = None
    category_id: Optional[int] = None
    tags: Optional[List[str]] = None
    seo: Optional[SEOData] = None
    image_ids: Optional[List[int]] = None
    block_content: Optional[str] = None

    # ---- 最终结果 ----
    post_id: Optional[int] = None
    action: Literal["create", "update", "skip"] = "create"
    error: Optional[str] = None
