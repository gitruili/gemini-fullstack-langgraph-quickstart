# 小红书自动发布功能使用指南

## 📱 功能概述

这个功能可以将AI生成的信息图表自动发布到小红书平台，包括：

- 🖼️ 多页图片自动上传
- 📝 智能标题和内容生成
- 🏷️ 自动标签添加
- 🤖 无头浏览器自动化操作
- 📊 实时发布状态监控

## 🚀 快速开始

### 1. 环境要求

确保已经安装了必要的依赖：

```bash
cd backend
pip install playwright beautifulsoup4 aiofiles
playwright install chromium
```

### 2. 启动后端服务

```bash
cd backend
python -m src.agent.app  # 或者使用LangGraph相关命令
```

### 3. 使用方式

#### 方式一：通过前端界面

1. 在聊天界面生成信息图表
2. 点击"生成HTML"按钮
3. 点击"📱 发布到小红书"按钮
4. 扫描二维码登录小红书
5. 等待自动发布完成

#### 方式二：直接调用API

```python
import requests

# 发布请求
response = requests.post('http://localhost:8000/api/xiaohongshu/publish', json={
    "images": ["base64_image_1", "base64_image_2"],  # base64编码的图片
    "title": "AI生成的精彩内容",
    "content": "这是一个AI生成的信息图表，包含了丰富的内容...",
    "tags": ["AI", "信息图表", "科技"],
    "headless": False,  # 显示浏览器以便登录
    "debug": True
})

task_id = response.json()['task_id']

# 查询发布状态
status = requests.get(f'http://localhost:8000/api/xiaohongshu/status/{task_id}')
print(status.json())
```

## 🔧 API 接口文档

### 发布内容到小红书

**POST** `/api/xiaohongshu/publish`

```json
{
  "images": ["base64_string_1", "base64_string_2"],
  "title": "笔记标题",
  "content": "笔记内容",
  "tags": ["标签1", "标签2"],
  "location": "地理位置（可选）",
  "headless": true,
  "debug": false
}
```

**响应：**
```json
{
  "task_id": "xhs_1234567890",
  "status": "pending",
  "message": "发布任务已启动"
}
```

### 查询发布状态

**GET** `/api/xiaohongshu/status/{task_id}`

**响应：**
```json
{
  "status": "completed",
  "message": "发布成功",
  "title": "笔记标题",
  "images_count": 3,
  "created_at": "2024-01-01T00:00:00",
  "completed_at": "2024-01-01T00:01:00"
}
```

### 生成小红书内容

**POST** `/api/xiaohongshu/generate-content`

```json
{
  "original_content": "原始AI回答内容",
  "title": "自定义标题（可选）"
}
```

**响应：**
```json
{
  "title": "生成的标题",
  "content": "适合小红书的内容",
  "tags": ["AI", "信息图表", "科技"]
}
```

## ⚙️ 配置选项

### 发布参数说明

- `images`: 图片的base64编码列表，建议尺寸448×597像素
- `title`: 小红书笔记标题，建议不超过30个字符
- `content`: 笔记内容描述
- `tags`: 标签列表，有助于内容发现
- `location`: 地理位置标签（可选）
- `headless`: 是否无头模式运行浏览器
  - `false`: 显示浏览器界面，便于手动登录
  - `true`: 后台运行，需要已登录状态
- `debug`: 是否开启调试模式，显示详细日志

### 浏览器配置

系统会自动配置浏览器的反检测措施：
- 设置真实的User-Agent
- 隐藏webdriver标识
- 模拟真实用户行为（随机延迟等）

## 🔐 登录说明

### 首次使用

1. 设置 `headless: false` 显示浏览器
2. 系统会自动打开小红书登录页面
3. 使用小红书App扫描二维码登录
4. 登录成功后会自动继续发布流程

### 保持登录状态

- 浏览器会保存登录状态
- 建议定期重新登录以保持账户安全
- 如果登录失效，系统会自动跳转到登录页面

## 📝 内容优化建议

### 标题优化

- 控制在20-30个字符以内
- 使用吸引人的词汇
- 突出关键信息

### 内容描述

- 简洁明了，突出重点
- 适当使用emoji增加趣味性
- 包含图片说明引导用户查看

### 标签选择

- 使用相关度高的标签
- 结合热门话题标签
- 建议3-8个标签

## 🛠️ 故障排除

### 常见问题

1. **浏览器启动失败**
   ```bash
   # 重新安装浏览器
   playwright install chromium
   ```

2. **登录超时**
   - 检查网络连接
   - 尝试刷新登录页面
   - 确保小红书App正常工作

3. **图片上传失败**
   - 检查图片格式是否为PNG
   - 确认图片大小合理（建议<5MB）
   - 验证base64编码是否正确

4. **发布被拒绝**
   - 检查内容是否符合小红书社区规范
   - 避免敏感词汇和违规内容
   - 确保图片内容清晰可读

### 调试模式

设置 `debug: true` 查看详细日志：

```python
{
  "debug": true,  # 开启调试模式
  "headless": false  # 显示浏览器便于观察
}
```

## 🔒 注意事项

### 使用限制

- 遵守小红书平台的使用条款
- 避免频繁发布，防止被限制
- 确保发布内容的原创性和合规性

### 安全建议

- 不要在公共环境下使用登录功能
- 定期更换密码保护账户安全
- 谨慎处理包含个人信息的内容

### 性能考虑

- 大量图片上传可能需要较长时间
- 建议在网络状况良好时使用
- 可以通过任务ID查询发布进度

## 📞 技术支持

如果遇到问题，可以：

1. 查看详细错误日志
2. 运行测试脚本验证功能
3. 检查网络和环境配置
4. 参考API文档确认请求格式

## 🧪 测试功能

运行测试脚本验证功能：

```bash
cd backend
python test_xiaohongshu.py
```

测试包括：
- 内容生成功能测试
- 浏览器启动测试
- 登录流程测试
- 发布功能测试 