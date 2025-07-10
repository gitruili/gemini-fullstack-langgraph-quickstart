"""
小红书发布工具
为LangGraph Agent提供小红书自动发布功能
"""

import asyncio
from typing import Dict, Any
from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field

from .xiaohongshu_publisher import publish_to_xiaohongshu
from .tools_and_schemas import XiaoHongShuPublishRequest, XiaoHongShuPublishResponse


class XiaoHongShuPublishTool(BaseTool):
    """小红书发布工具"""
    
    name: str = "xiaohongshu_publisher"
    description: str = (
        "发布图文内容到小红书平台。需要提供base64编码的图片列表、标题和内容。"
        "这个工具会自动启动浏览器，处理登录流程，并发布内容到小红书。"
        "Use this tool to publish generated infographic images to XiaoHongShu (Little Red Book) platform."
    )
    
    def _run(self, **kwargs) -> Dict[str, Any]:
        """同步运行接口（实际调用异步方法）"""
        return asyncio.run(self._arun(**kwargs))
    
    async def _arun(self, **kwargs) -> Dict[str, Any]:
        """异步运行发布任务"""
        try:
            # 验证输入参数
            request = XiaoHongShuPublishRequest(**kwargs)
            
            # 调用发布函数
            result = await publish_to_xiaohongshu(
                images=request.images,
                title=request.title,
                content=request.content,
                tags=request.tags,
                location=request.location,
                headless=request.headless,
                debug=request.debug
            )
            
            # 格式化返回结果
            response = XiaoHongShuPublishResponse(**result)
            return response.dict()
            
        except Exception as e:
            return {
                "success": False,
                "message": f"发布失败: {str(e)}",
                "error": str(e)
            }


# 创建工具实例
xiaohongshu_publish_tool = XiaoHongShuPublishTool()


# 辅助函数：从ZIP文件中提取图片base64
def extract_images_from_zip(zip_data: bytes) -> list:
    """
    从ZIP文件中提取PNG图片并转换为base64
    
    Args:
        zip_data: ZIP文件的二进制数据
        
    Returns:
        base64编码的图片列表
    """
    import zipfile
    import io
    import base64
    
    images = []
    
    try:
        with zipfile.ZipFile(io.BytesIO(zip_data), 'r') as zip_file:
            for file_name in zip_file.namelist():
                if file_name.lower().endswith('.png'):
                    with zip_file.open(file_name) as image_file:
                        image_data = image_file.read()
                        # 转换为base64
                        image_base64 = base64.b64encode(image_data).decode('utf-8')
                        images.append(image_base64)
        
        # 按文件名排序确保页面顺序正确
        return images
        
    except Exception as e:
        print(f"❌ 提取图片失败: {e}")
        return []


# 智能内容生成函数
def generate_xiaohongshu_content(original_content: str, title: str = None) -> Dict[str, Any]:
    """
    根据原始内容生成适合小红书的标题和内容
    
    Args:
        original_content: 原始AI回答内容
        title: 可选的自定义标题
        
    Returns:
        包含标题、内容和标签的字典
    """
    import re
    
    # 提取关键信息
    lines = original_content.split('\n')
    content_lines = [line.strip() for line in lines if line.strip()]
    
    # 生成标题（如果没有提供）
    if not title:
        if content_lines:
            # 使用第一行作为基础标题
            first_line = content_lines[0]
            # 移除markdown符号
            clean_title = re.sub(r'[#*`]', '', first_line).strip()
            title = clean_title[:30] + "..." if len(clean_title) > 30 else clean_title
        else:
            title = "AI生成的信息图表"
    
    # 生成内容描述
    content_preview = '\n'.join(content_lines[:5])  # 取前5行
    if len(content_lines) > 5:
        content_preview += "\n\n📊 更多精彩内容请看图片!"
    
    # 生成相关标签
    tags = ["AI", "信息图表", "数据可视化", "科技"]
    
    # 根据内容添加特定标签
    content_lower = original_content.lower()
    if any(word in content_lower for word in ['商业', '营销', '市场']):
        tags.extend(["商业分析", "营销"])
    if any(word in content_lower for word in ['科技', '技术', 'ai', '人工智能']):
        tags.extend(["科技前沿", "人工智能"])
    if any(word in content_lower for word in ['教育', '学习', '知识']):
        tags.extend(["知识分享", "学习"])
    
    return {
        "title": title,
        "content": content_preview,
        "tags": list(set(tags))  # 去重
    } 