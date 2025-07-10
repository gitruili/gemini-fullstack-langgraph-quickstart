"""
小红书发布功能测试脚本
"""

import asyncio
import base64
import json
from pathlib import Path

# Import our modules
import sys
sys.path.append('src')

from agent.xiaohongshu_publisher import publish_to_xiaohongshu
from agent.xiaohongshu_tool import generate_xiaohongshu_content


def create_sample_image_base64():
    """
    创建一个简单的测试图片（1x1像素PNG）
    """
    # 1x1 pixel white PNG in base64
    return "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="


async def test_xiaohongshu_publisher():
    """
    测试小红书发布器
    """
    print("🧪 开始测试小红书发布功能...")
    
    # 准备测试数据
    test_images = [create_sample_image_base64() for _ in range(3)]  # 3张测试图片
    
    test_content = """
    如何提高工作效率：5个实用技巧
    
    1. 使用番茄工作法
    专注工作25分钟，然后休息5分钟，这种方法可以显著提高专注力和工作效率。
    
    2. 优先处理重要任务
    每天开始工作前，列出最重要的3件事，优先完成这些任务。
    
    3. 减少干扰
    关闭不必要的通知，创造一个专注的工作环境。
    
    4. 使用工具辅助
    利用各种生产力工具，如任务管理软件、时间追踪应用等。
    
    5. 定期回顾和调整
    每周回顾工作效果，调整工作方法和计划。
    """
    
    # 测试内容生成
    print("\n📝 测试内容生成...")
    xhs_content = generate_xiaohongshu_content(test_content)
    print(f"生成的标题: {xhs_content['title']}")
    print(f"生成的内容: {xhs_content['content'][:100]}...")
    print(f"生成的标签: {xhs_content['tags']}")
    
    # 测试发布功能（需要人工登录）
    print("\n🚀 开始测试发布...")
    print("⚠️  注意：这将打开浏览器，需要手动扫码登录小红书！")
    
    user_input = input("是否继续测试发布功能？(y/N): ")
    if user_input.lower() != 'y':
        print("测试结束")
        return
    
    try:
        result = await publish_to_xiaohongshu(
            images=test_images,
            title=xhs_content['title'],
            content=xhs_content['content'],
            tags=xhs_content['tags'],
            headless=False,  # 显示浏览器以便登录
            debug=True
        )
        
        print("\n📊 发布结果:")
        print(json.dumps(result, indent=2, ensure_ascii=False))
        
        if result['success']:
            print("✅ 测试成功！")
        else:
            print("❌ 测试失败！")
            
    except Exception as e:
        print(f"❌ 测试过程中出错: {e}")


def test_content_generation():
    """
    测试内容生成功能
    """
    print("🧪 测试内容生成功能...")
    
    test_cases = [
        "人工智能如何改变我们的生活？AI技术正在各个领域发挥重要作用，从医疗诊断到自动驾驶，从语音识别到图像处理。",
        "2024年投资理财指南：股票、基金、房地产等投资渠道分析，风险评估和收益预期。",
        "健康饮食的重要性：均衡营养、适量运动、规律作息是保持身体健康的关键。"
    ]
    
    for i, content in enumerate(test_cases, 1):
        print(f"\n--- 测试案例 {i} ---")
        print(f"原始内容: {content}")
        
        result = generate_xiaohongshu_content(content)
        print(f"生成标题: {result['title']}")
        print(f"生成内容: {result['content']}")
        print(f"生成标签: {result['tags']}")


if __name__ == "__main__":
    print("🔧 小红书发布功能测试")
    print("=" * 50)
    
    # 测试内容生成
    test_content_generation()
    
    print("\n" + "=" * 50)
    
    # 测试发布功能
    asyncio.run(test_xiaohongshu_publisher()) 