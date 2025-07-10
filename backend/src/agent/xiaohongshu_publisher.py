"""
小红书自动发布模块
使用Playwright无头浏览器自动发布图文笔记
"""

import asyncio
import base64
import os
import tempfile
from typing import List, Optional, Dict, Any
from pathlib import Path
import aiofiles
from playwright.async_api import async_playwright, Page, Browser, BrowserContext
import json
import time
import random


class XiaoHongShuPublisher:
    """小红书自动发布器"""
    
    def __init__(self, headless: bool = True, debug: bool = False):
        self.headless = headless
        self.debug = debug
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        
        # 小红书相关配置
        self.xiaohongshu_url = "https://creator.xiaohongshu.com"
        self.login_url = "https://creator.xiaohongshu.com/login"
        self.publish_url = "https://creator.xiaohongshu.com/publish/publish"
        
        # 用户代理和其他反检测配置
        self.user_agent = (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
    
    async def __aenter__(self):
        """异步上下文管理器入口"""
        await self.start_browser()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """异步上下文管理器出口"""
        await self.close_browser()
    
    async def start_browser(self):
        """启动浏览器"""
        try:
            self.playwright = await async_playwright().start()
            
            # 浏览器启动配置
            browser_options = {
                "headless": self.headless,
                "args": [
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-accelerated-2d-canvas",
                    "--no-first-run",
                    "--no-zygote",
                    "--disable-gpu"
                ]
            }
            
            self.browser = await self.playwright.chromium.launch(**browser_options)
            
            # 创建上下文以模拟真实用户
            self.context = await self.browser.new_context(
                user_agent=self.user_agent,
                viewport={"width": 1920, "height": 1080},
                locale="zh-CN",
                timezone_id="Asia/Shanghai"
            )
            
            # 创建页面
            self.page = await self.context.new_page()
            
            # 添加一些反检测措施
            await self.page.add_init_script("""
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined,
                });
                
                Object.defineProperty(navigator, 'plugins', {
                    get: () => [1, 2, 3, 4, 5],
                });
                
                Object.defineProperty(navigator, 'languages', {
                    get: () => ['zh-CN', 'zh', 'en'],
                });
            """)
            
            if self.debug:
                print("✅ 浏览器启动成功")
                
        except Exception as e:
            print(f"❌ 浏览器启动失败: {e}")
            raise
    
    async def close_browser(self):
        """关闭浏览器"""
        try:
            if self.context:
                await self.context.close()
            if self.browser:
                await self.browser.close()
            if hasattr(self, 'playwright'):
                await self.playwright.stop()
                
            if self.debug:
                print("✅ 浏览器关闭成功")
                
        except Exception as e:
            print(f"❌ 浏览器关闭失败: {e}")
    
    async def login_with_qr(self, timeout: int = 60) -> bool:
        """使用二维码登录小红书"""
        try:
            if not self.page:
                raise Exception("浏览器未启动")
            
            # 访问登录页面
            await self.page.goto(self.login_url, wait_until="networkidle")
            await self.random_delay(2, 4)
            
            # 等待二维码出现
            qr_selector = ".qrcode img, .qr-code img, [class*='qr'] img"
            await self.page.wait_for_selector(qr_selector, timeout=10000)
            
            print("🔍 请扫描二维码登录小红书...")
            print(f"⏰ 等待登录完成 (超时: {timeout}秒)")
            
            # 等待登录成功（检测页面跳转或特定元素）
            try:
                await self.page.wait_for_url("**/creator.xiaohongshu.com/**", timeout=timeout * 1000)
                print("✅ 登录成功!")
                return True
            except:
                # 尝试检测其他登录成功标志
                success_selectors = [
                    "[data-testid='header-avatar']",
                    ".avatar",
                    "[class*='user']",
                    ".header-user"
                ]
                
                for selector in success_selectors:
                    try:
                        await self.page.wait_for_selector(selector, timeout=5000)
                        print("✅ 检测到登录成功!")
                        return True
                    except:
                        continue
                
                print("❌ 登录超时或失败")
                return False
                
        except Exception as e:
            print(f"❌ 登录过程出错: {e}")
            return False
    
    async def publish_note(
        self, 
        images: List[str], 
        title: str, 
        content: str, 
        tags: List[str] = None,
        location: str = None
    ) -> Dict[str, Any]:
        """
        发布图文笔记
        
        Args:
            images: base64编码的图片列表
            title: 笔记标题
            content: 笔记内容
            tags: 标签列表
            location: 地理位置
            
        Returns:
            发布结果
        """
        try:
            if not self.page:
                raise Exception("浏览器未启动")
            
            print("📝 开始发布小红书笔记...")
            
            # 1. 访问发布页面
            await self.page.goto(self.publish_url, wait_until="networkidle")
            await self.random_delay(2, 4)
            
            # 2. 上传图片
            success = await self.upload_images(images)
            if not success:
                return {"success": False, "error": "图片上传失败"}
            
            # 3. 填写标题
            await self.fill_title(title)
            
            # 4. 填写内容
            await self.fill_content(content)
            
            # 5. 添加标签
            if tags:
                await self.add_tags(tags)
            
            # 6. 设置地理位置
            if location:
                await self.set_location(location)
            
            # 7. 发布
            publish_success = await self.submit_publish()
            
            if publish_success:
                print("✅ 笔记发布成功!")
                return {
                    "success": True, 
                    "message": "发布成功",
                    "title": title,
                    "images_count": len(images)
                }
            else:
                return {"success": False, "error": "发布提交失败"}
                
        except Exception as e:
            print(f"❌ 发布过程出错: {e}")
            return {"success": False, "error": str(e)}
    
    async def upload_images(self, images: List[str]) -> bool:
        """上传图片到小红书"""
        try:
            print(f"📷 开始上传 {len(images)} 张图片...")
            
            # 查找上传按钮或区域
            upload_selectors = [
                "input[type='file']",
                "[data-testid='upload-input']",
                ".upload-btn input",
                ".image-upload input"
            ]
            
            file_input = None
            for selector in upload_selectors:
                try:
                    file_input = await self.page.wait_for_selector(selector, timeout=5000)
                    break
                except:
                    continue
            
            if not file_input:
                print("❌ 未找到文件上传元素")
                return False
            
            # 将base64图片保存为临时文件
            temp_files = []
            for i, image_base64 in enumerate(images):
                try:
                    # 移除data:image/png;base64,前缀（如果有）
                    if image_base64.startswith('data:'):
                        image_base64 = image_base64.split(',')[1]
                    
                    # 解码base64
                    image_data = base64.b64decode(image_base64)
                    
                    # 创建临时文件
                    temp_file = tempfile.NamedTemporaryFile(suffix=f'_page_{i+1}.png', delete=False)
                    temp_file.write(image_data)
                    temp_file.close()
                    temp_files.append(temp_file.name)
                    
                except Exception as e:
                    print(f"❌ 处理第{i+1}张图片失败: {e}")
                    continue
            
            if not temp_files:
                print("❌ 没有有效的图片文件")
                return False
            
            # 上传文件
            await file_input.set_input_files(temp_files)
            
            # 等待上传完成
            await self.random_delay(3, 6)
            
            # 清理临时文件
            for temp_file in temp_files:
                try:
                    os.unlink(temp_file)
                except:
                    pass
            
            print(f"✅ 成功上传 {len(temp_files)} 张图片")
            return True
            
        except Exception as e:
            print(f"❌ 图片上传失败: {e}")
            return False
    
    async def fill_title(self, title: str):
        """填写标题"""
        try:
            title_selectors = [
                "input[placeholder*='标题']",
                "input[placeholder*='title']",
                ".title-input input",
                "[data-testid='title-input']"
            ]
            
            for selector in title_selectors:
                try:
                    title_input = await self.page.wait_for_selector(selector, timeout=3000)
                    await title_input.fill(title)
                    await self.random_delay(1, 2)
                    print(f"✅ 标题填写完成: {title}")
                    return
                except:
                    continue
            
            print("⚠️ 未找到标题输入框")
            
        except Exception as e:
            print(f"❌ 填写标题失败: {e}")
    
    async def fill_content(self, content: str):
        """填写内容"""
        try:
            content_selectors = [
                "textarea[placeholder*='内容']",
                "textarea[placeholder*='分享']",
                ".content-editor textarea",
                "[data-testid='content-editor']"
            ]
            
            for selector in content_selectors:
                try:
                    content_input = await self.page.wait_for_selector(selector, timeout=3000)
                    await content_input.fill(content)
                    await self.random_delay(1, 2)
                    print(f"✅ 内容填写完成 ({len(content)} 字符)")
                    return
                except:
                    continue
            
            print("⚠️ 未找到内容输入框")
            
        except Exception as e:
            print(f"❌ 填写内容失败: {e}")
    
    async def add_tags(self, tags: List[str]):
        """添加标签"""
        try:
            print(f"🏷️ 添加标签: {', '.join(tags)}")
            
            # 实现标签添加逻辑
            # 这部分需要根据小红书实际页面结构调整
            
        except Exception as e:
            print(f"❌ 添加标签失败: {e}")
    
    async def set_location(self, location: str):
        """设置地理位置"""
        try:
            print(f"📍 设置位置: {location}")
            
            # 实现位置设置逻辑
            # 这部分需要根据小红书实际页面结构调整
            
        except Exception as e:
            print(f"❌ 设置位置失败: {e}")
    
    async def submit_publish(self) -> bool:
        """提交发布"""
        try:
            publish_selectors = [
                "button[type='submit']",
                ".publish-btn",
                "[data-testid='publish-btn']",
                "button:has-text('发布')",
                "button:has-text('发表')"
            ]
            
            for selector in publish_selectors:
                try:
                    publish_btn = await self.page.wait_for_selector(selector, timeout=3000)
                    await publish_btn.click()
                    await self.random_delay(2, 4)
                    
                    # 等待发布完成
                    await self.page.wait_for_timeout(5000)
                    print("✅ 发布提交成功")
                    return True
                except:
                    continue
            
            print("❌ 未找到发布按钮")
            return False
            
        except Exception as e:
            print(f"❌ 发布提交失败: {e}")
            return False
    
    async def random_delay(self, min_seconds: float = 1, max_seconds: float = 3):
        """随机延迟，模拟人类操作"""
        delay = random.uniform(min_seconds, max_seconds)
        await asyncio.sleep(delay)


# 工具函数
async def publish_to_xiaohongshu(
    images: List[str], 
    title: str, 
    content: str, 
    tags: List[str] = None,
    location: str = None,
    headless: bool = True,
    debug: bool = False
) -> Dict[str, Any]:
    """
    发布到小红书的便捷函数
    
    Args:
        images: base64编码的图片列表
        title: 笔记标题
        content: 笔记内容
        tags: 标签列表
        location: 地理位置
        headless: 是否无头模式
        debug: 是否开启调试模式
        
    Returns:
        发布结果
    """
    async with XiaoHongShuPublisher(headless=headless, debug=debug) as publisher:
        # 首先需要登录
        login_success = await publisher.login_with_qr()
        if not login_success:
            return {"success": False, "error": "登录失败"}
        
        # 发布笔记
        return await publisher.publish_note(images, title, content, tags, location) 