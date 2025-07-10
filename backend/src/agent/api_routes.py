"""
API路由定义
为小红书发布功能提供HTTP API接口
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from typing import List, Dict, Any, Optional
import asyncio
import json
from datetime import datetime

from .xiaohongshu_tool import xiaohongshu_publish_tool, generate_xiaohongshu_content, extract_images_from_zip
from .tools_and_schemas import XiaoHongShuPublishRequest, XiaoHongShuPublishResponse

# 创建路由器
router = APIRouter(prefix="/api", tags=["xiaohongshu"])

# 存储发布任务状态
publish_tasks = {}


@router.post("/xiaohongshu/publish", response_model=Dict[str, Any])
async def publish_to_xiaohongshu(
    request: XiaoHongShuPublishRequest,
    background_tasks: BackgroundTasks
):
    """
    发布内容到小红书
    
    Args:
        request: 发布请求参数
        background_tasks: 后台任务处理器
        
    Returns:
        发布任务ID和状态
    """
    try:
        # 生成任务ID
        task_id = f"xhs_{int(datetime.now().timestamp())}"
        
        # 初始化任务状态
        publish_tasks[task_id] = {
            "status": "pending",
            "message": "任务已创建，等待处理...",
            "created_at": datetime.now().isoformat(),
            "title": request.title,
            "images_count": len(request.images)
        }
        
        # 添加后台任务
        background_tasks.add_task(
            execute_publish_task, 
            task_id, 
            request
        )
        
        return {
            "task_id": task_id,
            "status": "pending",
            "message": "发布任务已启动，请稍后查询状态"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建发布任务失败: {str(e)}")


@router.get("/xiaohongshu/status/{task_id}")
async def get_publish_status(task_id: str):
    """
    查询发布任务状态
    
    Args:
        task_id: 任务ID
        
    Returns:
        任务状态信息
    """
    if task_id not in publish_tasks:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    return publish_tasks[task_id]


@router.post("/xiaohongshu/generate-content")
async def generate_content_for_xiaohongshu(
    original_content: str,
    title: Optional[str] = None
):
    """
    根据原始内容生成适合小红书的标题和内容
    
    Args:
        original_content: 原始AI回答内容
        title: 可选的自定义标题
        
    Returns:
        生成的标题、内容和标签
    """
    try:
        result = generate_xiaohongshu_content(original_content, title)
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"内容生成失败: {str(e)}")


@router.post("/xiaohongshu/extract-images")
async def extract_images_from_zip_file(
    zip_data: bytes
):
    """
    从ZIP文件中提取图片并转换为base64
    
    Args:
        zip_data: ZIP文件的二进制数据
        
    Returns:
        base64编码的图片列表
    """
    try:
        images = extract_images_from_zip(zip_data)
        return {
            "images": images,
            "count": len(images),
            "message": f"成功提取 {len(images)} 张图片"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"图片提取失败: {str(e)}")


async def execute_publish_task(task_id: str, request: XiaoHongShuPublishRequest):
    """
    执行发布任务（后台任务）
    
    Args:
        task_id: 任务ID
        request: 发布请求
    """
    try:
        # 更新任务状态
        publish_tasks[task_id]["status"] = "running"
        publish_tasks[task_id]["message"] = "正在启动浏览器..."
        
        # 调用发布工具
        result = await xiaohongshu_publish_tool._arun(
            images=request.images,
            title=request.title,
            content=request.content,
            tags=request.tags,
            location=request.location,
            headless=request.headless,
            debug=request.debug
        )
        
        # 更新任务状态
        if result.get("success"):
            publish_tasks[task_id]["status"] = "completed"
            publish_tasks[task_id]["message"] = result.get("message", "发布成功")
            publish_tasks[task_id]["result"] = result
        else:
            publish_tasks[task_id]["status"] = "failed"
            publish_tasks[task_id]["message"] = result.get("error", "发布失败")
            publish_tasks[task_id]["error"] = result.get("error")
        
        publish_tasks[task_id]["completed_at"] = datetime.now().isoformat()
        
    except Exception as e:
        # 更新任务状态为失败
        publish_tasks[task_id]["status"] = "failed"
        publish_tasks[task_id]["message"] = f"发布过程出错: {str(e)}"
        publish_tasks[task_id]["error"] = str(e)
        publish_tasks[task_id]["completed_at"] = datetime.now().isoformat()


@router.delete("/xiaohongshu/tasks/{task_id}")
async def delete_publish_task(task_id: str):
    """
    删除发布任务记录
    
    Args:
        task_id: 任务ID
        
    Returns:
        删除结果
    """
    if task_id not in publish_tasks:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    del publish_tasks[task_id]
    return {"message": "任务记录已删除"}


@router.get("/xiaohongshu/tasks")
async def list_publish_tasks():
    """
    列出所有发布任务
    
    Returns:
        任务列表
    """
    return {
        "tasks": publish_tasks,
        "count": len(publish_tasks)
    } 