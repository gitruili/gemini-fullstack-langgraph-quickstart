from typing import List, Optional
from pydantic import BaseModel, Field


class SearchQueryList(BaseModel):
    query: List[str] = Field(
        description="A list of search queries to be used for web research."
    )
    rationale: str = Field(
        description="A brief explanation of why these queries are relevant to the research topic."
    )


class Reflection(BaseModel):
    is_sufficient: bool = Field(
        description="Whether the provided summaries are sufficient to answer the user's question."
    )
    knowledge_gap: str = Field(
        description="A description of what information is missing or needs clarification."
    )
    follow_up_queries: List[str] = Field(
        description="A list of follow-up queries to address the knowledge gap."
    )


class XiaoHongShuPublishRequest(BaseModel):
    """小红书发布请求模型"""
    images: List[str] = Field(
        description="List of base64 encoded PNG images to be published"
    )
    title: str = Field(
        description="Title of the XiaoHongShu note (笔记标题)"
    )
    content: str = Field(
        description="Content/description of the XiaoHongShu note (笔记内容)"
    )
    tags: Optional[List[str]] = Field(
        default=None,
        description="Optional list of tags for the note (标签)"
    )
    location: Optional[str] = Field(
        default=None,
        description="Optional location for the note (地理位置)"
    )
    headless: bool = Field(
        default=True,
        description="Whether to run browser in headless mode"
    )
    debug: bool = Field(
        default=False,
        description="Enable debug mode for troubleshooting"
    )


class XiaoHongShuPublishResponse(BaseModel):
    """小红书发布结果模型"""
    success: bool = Field(
        description="Whether the publishing was successful"
    )
    message: str = Field(
        description="Success or error message"
    )
    title: Optional[str] = Field(
        default=None,
        description="Published note title"
    )
    images_count: Optional[int] = Field(
        default=None,
        description="Number of images successfully published"
    )
    error: Optional[str] = Field(
        default=None,
        description="Error message if publishing failed"
    )
