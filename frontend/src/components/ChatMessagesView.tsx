import type React from "react";
import type { Message } from "@langchain/langgraph-sdk";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Copy, CopyCheck, FileText, X, Code } from "lucide-react";
import { InputForm } from "@/components/InputForm";
import { Button } from "@/components/ui/button";
import { useState, ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  ActivityTimeline,
  ProcessedEvent,
} from "@/components/ActivityTimeline"; // Assuming ActivityTimeline is in the same dir or adjust path

// Blueprint generation function
const generateBlueprint = (content: string): string => {
  const lines = content.split('\n').filter(line => line.trim());
  
  // Extract main topic from first few lines
  const firstParagraph = lines.slice(0, 5).join(' ');
  const mainTopic = firstParagraph.length > 100 ? firstParagraph.slice(0, 100) + '...' : firstParagraph;
  
  // Analyze content structure
  const headers = lines.filter(line => line.match(/^#{1,6}\s/));
  const listItems = lines.filter(line => line.match(/^[-*]\s/) || line.match(/^\d+\.\s/));
  const strongText = content.match(/\*\*(.*?)\*\*/g) || [];
  const numbers = content.match(/\d+[%]?/g) || [];
  
  // Content analysis patterns
  const contentLower = content.toLowerCase();
  const hasComparison = /vs|versus|compared?|differ|advantage|disadvantage|better|worse|before.*after|traditional.*modern/.test(contentLower);
  const hasNumbers = numbers.length > 3;
  const hasSteps = /step|process|method|how to|guide|first|second|third|then|next|finally/.test(contentLower);
  
  let blueprintPages: string[] = [];
  const totalPages = Math.max(headers.length + 1, 3); // +1 for hero page
  
  // Generate Hero Page
  const heroTitle = headers.length > 0 ? 
    headers[0].replace(/^#+\s*/, '') : 
    content.split('.')[0] || "AI 响应内容";
  
  const heroSubtitle = mainTopic.length > 50 ? 
    mainTopic.slice(0, 50).split(' ').slice(0, -1).join(' ') + '...' : 
    mainTopic;
  
  blueprintPages.push(`信息图 1 / ${totalPages}
页面类型：封面（Hero）
页面标题：《${heroTitle}》
核心内容与视觉构思

布局：全屏 Hero；中央居中栅格，宽 8 col。

背景：bg-gradient-to-br from-blue-600 via-indigo-500 to-purple-400，叠加 15% 透明度的数据纹理。

文案：
  主标题：${heroTitle}
  副标题："${heroSubtitle}"
  Icon 组：🔍 + 📊（居标题上方，用 text-5xl）

动效：标题用 animate-fade-in-up，背景纹理低速 animate-pulse。`);

  // Generate Overview Page
  const keyStats = numbers.slice(0, 3);
  const keyPoints = listItems.slice(0, 3).map(item => 
    item.replace(/^[-*\d.]\s*/, '').slice(0, 40)
  );
  
  blueprintPages.push(`信息图 2 / ${totalPages}
页面类型：概览（Executive Summary）
页面标题：核心要点总览
核心内容与视觉构思

布局：左右对分（6 col / 6 col）。左侧文字，右侧可视化图表。

左侧三行摘要（大字＋粗体）：
${keyPoints.length > 0 ? keyPoints.map(point => `  ${point}`).join('\n') : `  关键洞察与分析
  数据驱动的结论
  实用性建议指南`}

右侧视觉：${hasNumbers ? '数据仪表盘（' + keyStats.join('、') + '等关键指标）' : '概念图谱（中心主题辐射式展开）'}。

色彩：bg-slate-50，主色 text-indigo-600；图表使用 stroke-blue-400/60。`);

  // Generate content pages based on headers
  if (headers.length > 0) {
    headers.forEach((header, index) => {
      const pageNum = index + 3; // +2 for hero and overview
      if (pageNum > totalPages) return;
      
      const title = header.replace(/^#+\s*/, '');
      const headerIndex = lines.indexOf(header);
      const nextHeaderIndex = lines.findIndex((line, i) => i > headerIndex && line.match(/^#{1,6}\s/));
      const sectionContent = lines.slice(headerIndex + 1, nextHeaderIndex === -1 ? lines.length : nextHeaderIndex).join('\n');
      
      // Extract actual content
      const sectionPoints = sectionContent.split('\n')
        .filter(line => line.match(/^[-*]\s/) || line.match(/^\d+\.\s/))
        .slice(0, 4)
        .map(point => point.replace(/^[-*\d.]\s*/, '').slice(0, 50));
      
      const sectionNumbers = sectionContent.match(/\d+[%]?/g) || [];
      const sectionLower = sectionContent.toLowerCase();
      
      // Determine page type and design
      let pageType = '信息展示';
      let layout = '标准栅格布局（8 col）';
      let background = 'bg-white';
      let visual = '要点列表';
      
      if (hasComparison && (title.toLowerCase().includes('vs') || sectionLower.includes('compar') || sectionLower.includes('对比'))) {
        pageType = '核心要点对比';
        layout = '上下对比卡片布局';
        background = 'bg-gray-50';
        visual = `对比表格：
维度	方案A	方案B
${sectionPoints.length >= 2 ? sectionPoints.slice(0, 2).map((point, i) => `特点${i+1}	${point.split('').slice(0, 20).join('')}	优化方案`).join('\n') : '效率	传统方式	AI优化\n成本	高成本	成本降低'}`;
        
        blueprintPages.push(`信息图 ${pageNum} / ${totalPages}
页面类型：${pageType}
页面标题：${title}
核心内容与视觉构思

布局：${layout}

上半部分：bg-blue-100 标题：方案A 🔄
下半部分：bg-green-100 标题：方案B 🤖

${visual}

色彩：对比色突出差异，用 text-blue-600 和 text-green-600。`);
        
      } else if (hasSteps && sectionPoints.length > 2) {
        pageType = '流程步骤';
        layout = '垂直时间线布局';
        background = 'bg-gradient-to-b from-blue-50 to-indigo-100';
        
        blueprintPages.push(`信息图 ${pageNum} / ${totalPages}
页面类型：${pageType}
页面标题：${title}
核心内容与视觉构思

布局：${layout}

步骤卡片：
${sectionPoints.slice(0, 4).map((point, i) => `  步骤 ${i+1}：${point}
  图标：${['🎯', '⚡', '📈', '✅'][i]} + 连接线`).join('\n\n')}

背景：${background}，步骤卡片用 bg-white shadow-sm。
动效：步骤依次 animate-slide-in-right。`);
        
      } else if (hasNumbers && sectionNumbers.length > 2) {
        pageType = '数据展示';
        layout = '数据仪表盘布局（4x2 grid）';
        background = 'bg-gray-50';
        
        blueprintPages.push(`信息图 ${pageNum} / ${totalPages}
页面类型：${pageType}
页面标题：${title}
核心内容与视觉构思

布局：${layout}

关键指标卡片：
${sectionNumbers.slice(0, 4).map((num, i) => `  指标 ${i+1}：${num}
  描述：${sectionPoints[i] || '相关数据指标'}
  图标：📊 + 进度条可视化`).join('\n\n')}

背景：${background}，数据卡片用 bg-white border-l-4 border-blue-500。
色彩：数值用 text-2xl font-bold text-blue-600。`);
        
      } else {
        // Standard content page
        blueprintPages.push(`信息图 ${pageNum} / ${totalPages}
页面类型：内容详情
页面标题：${title}
核心内容与视觉构思

布局：标准内容布局（左侧 8 col 文字，右侧 4 col 视觉）

主要内容：
${sectionPoints.length > 0 ? sectionPoints.map((point, i) => `  • ${point}`).join('\n') : `  • 核心概念解释
  • 实际应用场景
  • 相关建议指南`}

右侧视觉：${sectionNumbers.length > 0 ? '数据图表展示' : '概念插图'}
图标：💡 + ${title.slice(0, 10)}相关图标

背景：bg-white，重点内容用 bg-yellow-50 highlight。`);
      }
    });
  } else {
    // No headers - create content-based pages
    const paragraphs = content.split('\n\n').filter(p => p.trim().length > 50);
    
    paragraphs.slice(0, Math.min(3, totalPages - 2)).forEach((paragraph, index) => {
      const pageNum = index + 3;
      const firstSentence = paragraph.split('.')[0] || `内容片段 ${index + 1}`;
      const paragraphPoints = paragraph.split('\n')
        .filter(line => line.match(/^[-*]\s/))
        .slice(0, 3)
        .map(point => point.replace(/^[-*]\s*/, ''));
      
      blueprintPages.push(`信息图 ${pageNum} / ${totalPages}
页面类型：内容分析
页面标题：${firstSentence.slice(0, 30)}
核心内容与视觉构思

布局：图文混排布局（2/3 文字 + 1/3 视觉）

核心内容：
${paragraphPoints.length > 0 ? paragraphPoints.map(point => `  • ${point.slice(0, 40)}`).join('\n') : `  • ${paragraph.slice(0, 100).split('.')[0]}
  • 相关分析要点
  • 实用指导建议`}

视觉元素：信息图表 + 图标 📋
背景：bg-slate-50，重点用 border-l-4 border-indigo-500 突出。`);
    });
  }
  
  return blueprintPages.join('\n\n');
};

// HTML/CSS generation function
const generateHTML = (content: string): string => {
  const blueprint = generateBlueprint(content);
  const lines = blueprint.split('\n');
  
  // Parse blueprint to extract page information
  const pages = [];
  let currentPage = null;
  
  for (const line of lines) {
    if (line.startsWith('信息图')) {
      if (currentPage) pages.push(currentPage);
      currentPage = { 
        title: '', 
        type: '', 
        content: [], 
        layout: '', 
        background: '',
        pageNum: line.match(/\d+/)?.[0] || '1'
      };
    } else if (line.startsWith('页面类型：')) {
      if (currentPage) currentPage.type = line.replace('页面类型：', '').trim();
    } else if (line.startsWith('页面标题：')) {
      if (currentPage) currentPage.title = line.replace('页面标题：', '').trim();
    } else if (line.includes('布局：')) {
      if (currentPage) currentPage.layout = line.replace(/.*布局：/, '').trim();
    } else if (line.includes('背景：')) {
      if (currentPage) currentPage.background = line.replace(/.*背景：/, '').trim();
    } else if (line.trim() && currentPage) {
      currentPage.content.push(line.trim());
    }
  }
  if (currentPage) pages.push(currentPage);
  
  // Generate HTML for first page (Hero or main content)
  const firstPage = pages[0];
  if (!firstPage) return generateFallbackHTML(content);
  
  return generatePageHTML(firstPage, content);
};

const generatePageHTML = (page: any, originalContent: string): string => {
  const { type, title, content, background, pageNum } = page;
  
  // Extract key content from original response
  const lines = originalContent.split('\n').filter(line => line.trim());
  const listItems = lines.filter(line => line.match(/^[-*]\s/) || line.match(/^\d+\.\s/))
    .slice(0, 6).map(item => item.replace(/^[-*\d.]\s*/, ''));
  const numbers = originalContent.match(/\d+[%]?/g) || [];
  const firstSentence = originalContent.split('.')[0] || title;
  
  if (type.includes('封面') || type.includes('Hero')) {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            width: 448px; 
            height: 597px; 
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #a855f7 100%);
            position: relative;
        }
        .hero-container {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            padding: 40px;
            position: relative;
        }
        .hero-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M30 30c0-11.046-8.954-20-20-20s-20 8.954-20 20 8.954 20 20 20 20-8.954 20-20m20 0c0-11.046-8.954-20-20-20s-20 8.954-20 20 8.954 20 20 20 20-8.954 20-20'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E") repeat;
            animation: pulse 4s ease-in-out infinite;
            opacity: 0.15;
        }
        .icons {
            font-size: 3rem;
            margin-bottom: 20px;
            animation: fadeInUp 1s ease-out;
        }
        .main-title {
            font-size: 2.5rem;
            font-weight: 900;
            color: white;
            margin-bottom: 16px;
            line-height: 1.2;
            animation: fadeInUp 1s ease-out 0.2s both;
        }
        .subtitle {
            font-size: 1.2rem;
            color: rgba(255, 255, 255, 0.9);
            font-weight: 500;
            max-width: 320px;
            animation: fadeInUp 1s ease-out 0.4s both;
        }
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        @keyframes pulse {
            0%, 100% { opacity: 0.15; }
            50% { opacity: 0.25; }
        }
    </style>
</head>
<body>
    <div class="hero-container">
        <div class="icons">🔍📊</div>
        <h1 class="main-title">${title.replace(/《|》/g, '')}</h1>
        <p class="subtitle">${firstSentence.slice(0, 60)}...</p>
    </div>
</body>
</html>`;
  }
  
  if (type.includes('对比') || type.includes('comparison')) {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            width: 448px; 
            height: 597px; 
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #f8fafc;
            padding: 20px;
        }
        .container {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
        }
        .header h1 {
            font-size: 1.8rem;
            color: #1e293b;
            margin-bottom: 8px;
        }
        .comparison-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }
        .comparison-card {
            flex: 1;
            border-radius: 12px;
            padding: 24px;
            position: relative;
            overflow: hidden;
        }
        .card-a {
            background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
            border: 2px solid #3b82f6;
        }
        .card-b {
            background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
            border: 2px solid #22c55e;
        }
        .card-title {
            font-size: 1.4rem;
            font-weight: 700;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .card-a .card-title { color: #1d4ed8; }
        .card-b .card-title { color: #15803d; }
        .feature-list {
            list-style: none;
        }
        .feature-list li {
            padding: 8px 0;
            border-bottom: 1px solid rgba(0,0,0,0.1);
            font-size: 0.9rem;
        }
        .feature-list li:last-child {
            border-bottom: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${title}</h1>
        </div>
        <div class="comparison-container">
                         <div class="comparison-card card-a">
                 <div class="card-title">传统方案 🔄</div>
                 <ul class="feature-list">
                     ${listItems.slice(0, 3).map(item => '<li>' + item.slice(0, 50) + '</li>').join('')}
                 </ul>
             </div>
             <div class="comparison-card card-b">
                 <div class="card-title">优化方案 🤖</div>
                 <ul class="feature-list">
                     ${listItems.slice(3, 6).map(item => '<li>' + item.slice(0, 50) + '</li>').join('')}
                 </ul>
             </div>
        </div>
    </div>
</body>
</html>`;
  }
  
  if (type.includes('数据') || type.includes('data')) {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            width: 448px; 
            height: 597px; 
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #f8fafc;
            padding: 20px;
        }
        .container {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
        }
        .header h1 {
            font-size: 1.8rem;
            color: #1e293b;
            margin-bottom: 8px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            flex: 1;
        }
        .stat-card {
            background: white;
            border-radius: 12px;
            padding: 20px;
            border-left: 4px solid #3b82f6;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        .stat-value {
            font-size: 2rem;
            font-weight: 900;
            color: #3b82f6;
            margin-bottom: 8px;
        }
        .stat-label {
            font-size: 0.9rem;
            color: #64748b;
            font-weight: 500;
        }
        .stat-icon {
            font-size: 1.5rem;
            margin-bottom: 12px;
        }
        .progress-bar {
            width: 100%;
            height: 8px;
            background: #e2e8f0;
            border-radius: 4px;
            margin-top: 8px;
            overflow: hidden;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #3b82f6, #1d4ed8);
            border-radius: 4px;
            animation: fillProgress 2s ease-out;
        }
        @keyframes fillProgress {
            from { width: 0%; }
            to { width: var(--progress); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${title}</h1>
        </div>
                 <div class="stats-grid">
             ${numbers.slice(0, 4).map((num, i) => {
               const progressValue = Math.min(parseInt(num) || 75, 100);
               return '<div class="stat-card">' +
                 '<div class="stat-icon">📊</div>' +
                 '<div class="stat-value">' + num + '</div>' +
                 '<div class="stat-label">' + (listItems[i]?.slice(0, 20) || '关键指标') + '</div>' +
                 '<div class="progress-bar">' +
                   '<div class="progress-fill" style="--progress: ' + progressValue + '%"></div>' +
                 '</div>' +
               '</div>';
             }).join('')}
         </div>
    </div>
</body>
</html>`;
  }
  
  // Default content layout
  return generateFallbackHTML(originalContent);
};

const generateFallbackHTML = (content: string): string => {
  const lines = content.split('\n').filter(line => line.trim());
  const listItems = lines.filter(line => line.match(/^[-*]\s/) || line.match(/^\d+\.\s/))
    .slice(0, 8).map(item => item.replace(/^[-*\d.]\s*/, ''));
  const title = content.split('\n')[0] || 'AI 响应内容';
  
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI 响应内容</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            width: 448px; 
            height: 597px; 
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #ffffff;
            padding: 24px;
        }
        .container {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
        }
        .header {
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 2px solid #e2e8f0;
        }
        .header h1 {
            font-size: 1.6rem;
            color: #1e293b;
            margin-bottom: 8px;
            line-height: 1.3;
        }
        .header .icon {
            font-size: 1.5rem;
            margin-bottom: 8px;
        }
        .content-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            flex: 1;
        }
        .content-item {
            background: #f8fafc;
            border-radius: 8px;
            padding: 16px;
            border-left: 4px solid #6366f1;
            font-size: 0.85rem;
            line-height: 1.4;
            color: #374151;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        .content-item .bullet {
            color: #6366f1;
            margin-right: 8px;
            font-weight: bold;
        }
        .highlight {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border-left-color: #f59e0b;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="icon">📋</div>
            <h1>${title.slice(0, 50)}</h1>
        </div>
                 <div class="content-grid">
             ${listItems.map((item, i) => {
               const isHighlight = i % 3 === 0 ? 'highlight' : '';
               return '<div class="content-item ' + isHighlight + '">' +
                 '<span class="bullet">•</span>' +
                 item.slice(0, 80) +
               '</div>';
             }).join('')}
         </div>
    </div>
</body>
</html>`;
};

// Markdown component props type from former ReportView
type MdComponentProps = {
  className?: string;
  children?: ReactNode;
  [key: string]: any;
};

// Markdown components (from former ReportView.tsx)
const mdComponents = {
  h1: ({ className, children, ...props }: MdComponentProps) => (
    <h1 className={cn("text-2xl font-bold mt-4 mb-2", className)} {...props}>
      {children}
    </h1>
  ),
  h2: ({ className, children, ...props }: MdComponentProps) => (
    <h2 className={cn("text-xl font-bold mt-3 mb-2", className)} {...props}>
      {children}
    </h2>
  ),
  h3: ({ className, children, ...props }: MdComponentProps) => (
    <h3 className={cn("text-lg font-bold mt-3 mb-1", className)} {...props}>
      {children}
    </h3>
  ),
  p: ({ className, children, ...props }: MdComponentProps) => (
    <p className={cn("mb-3 leading-7", className)} {...props}>
      {children}
    </p>
  ),
  a: ({ className, children, href, ...props }: MdComponentProps) => (
    <Badge className="text-xs mx-0.5">
      <a
        className={cn("text-blue-400 hover:text-blue-300 text-xs", className)}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </a>
    </Badge>
  ),
  ul: ({ className, children, ...props }: MdComponentProps) => (
    <ul className={cn("list-disc pl-6 mb-3", className)} {...props}>
      {children}
    </ul>
  ),
  ol: ({ className, children, ...props }: MdComponentProps) => (
    <ol className={cn("list-decimal pl-6 mb-3", className)} {...props}>
      {children}
    </ol>
  ),
  li: ({ className, children, ...props }: MdComponentProps) => (
    <li className={cn("mb-1", className)} {...props}>
      {children}
    </li>
  ),
  blockquote: ({ className, children, ...props }: MdComponentProps) => (
    <blockquote
      className={cn(
        "border-l-4 border-neutral-600 pl-4 italic my-3 text-sm",
        className
      )}
      {...props}
    >
      {children}
    </blockquote>
  ),
  code: ({ className, children, ...props }: MdComponentProps) => (
    <code
      className={cn(
        "bg-neutral-900 rounded px-1 py-0.5 font-mono text-xs",
        className
      )}
      {...props}
    >
      {children}
    </code>
  ),
  pre: ({ className, children, ...props }: MdComponentProps) => (
    <pre
      className={cn(
        "bg-neutral-900 p-3 rounded-lg overflow-x-auto font-mono text-xs my-3",
        className
      )}
      {...props}
    >
      {children}
    </pre>
  ),
  hr: ({ className, ...props }: MdComponentProps) => (
    <hr className={cn("border-neutral-600 my-4", className)} {...props} />
  ),
  table: ({ className, children, ...props }: MdComponentProps) => (
    <div className="my-3 overflow-x-auto">
      <table className={cn("border-collapse w-full", className)} {...props}>
        {children}
      </table>
    </div>
  ),
  th: ({ className, children, ...props }: MdComponentProps) => (
    <th
      className={cn(
        "border border-neutral-600 px-3 py-2 text-left font-bold",
        className
      )}
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ className, children, ...props }: MdComponentProps) => (
    <td
      className={cn("border border-neutral-600 px-3 py-2", className)}
      {...props}
    >
      {children}
    </td>
  ),
};

// Props for HumanMessageBubble
interface HumanMessageBubbleProps {
  message: Message;
  mdComponents: typeof mdComponents;
}

// HumanMessageBubble Component
const HumanMessageBubble: React.FC<HumanMessageBubbleProps> = ({
  message,
  mdComponents,
}) => {
  return (
    <div
      className={`text-white rounded-3xl break-words min-h-7 bg-neutral-700 max-w-[100%] sm:max-w-[90%] px-4 pt-3 rounded-br-lg`}
    >
      <ReactMarkdown components={mdComponents}>
        {typeof message.content === "string"
          ? message.content
          : JSON.stringify(message.content)}
      </ReactMarkdown>
    </div>
  );
};

// Props for AiMessageBubble
interface AiMessageBubbleProps {
  message: Message;
  historicalActivity: ProcessedEvent[] | undefined;
  liveActivity: ProcessedEvent[] | undefined;
  isLastMessage: boolean;
  isOverallLoading: boolean;
  mdComponents: typeof mdComponents;
  handleCopy: (text: string, messageId: string) => void;
  copiedMessageId: string | null;
}

// AiMessageBubble Component
const AiMessageBubble: React.FC<AiMessageBubbleProps> = ({
  message,
  historicalActivity,
  liveActivity,
  isLastMessage,
  isOverallLoading,
  mdComponents,
  handleCopy,
  copiedMessageId,
}) => {
  const [showBlueprint, setShowBlueprint] = useState(false);
  const [blueprint, setBlueprint] = useState<string>('');
  const [showHTML, setShowHTML] = useState(false);
  const [htmlCode, setHtmlCode] = useState<string>('');

  // Determine which activity events to show and if it's for a live loading message
  const activityForThisBubble =
    isLastMessage && isOverallLoading ? liveActivity : historicalActivity;
  const isLiveActivityForThisBubble = isLastMessage && isOverallLoading;

  const messageContent = typeof message.content === "string"
    ? message.content
    : JSON.stringify(message.content);

  const handleGenerateBlueprint = () => {
    console.log('Blueprint button clicked!'); // Debug log
    try {
      const generatedBlueprint = generateBlueprint(messageContent);
      console.log('Generated blueprint:', generatedBlueprint); // Debug log
      setBlueprint(generatedBlueprint);
      setShowBlueprint(true);
      console.log('Blueprint state updated, showBlueprint:', true); // Debug log
    } catch (error) {
      console.error('Error generating blueprint:', error);
      // Fallback blueprint
      setBlueprint(`信息图 1 / 1
页面类型：内容展示
页面标题：AI 响应内容
核心内容与视觉构思

布局：标准文档布局
主要元素：
  - 构思：简洁清晰的排版设计
  - 标题：响应内容 + 图标 📋
  - 视觉概念：现代化信息展示
内容重点：
  - 信息层次化展示
  - 用户体验优化`);
      setShowBlueprint(true);
    }
  };

  const handleGenerateHTML = () => {
    console.log('HTML button clicked!'); // Debug log
    try {
      const generatedHTML = generateHTML(messageContent);
      console.log('Generated HTML:', generatedHTML); // Debug log
      setHtmlCode(generatedHTML);
      setShowHTML(true);
      console.log('HTML state updated, showHTML:', true); // Debug log
    } catch (error) {
      console.error('Error generating HTML:', error);
      // Fallback HTML
      setHtmlCode(generateFallbackHTML(messageContent));
      setShowHTML(true);
    }
  };

  return (
    <div className={`relative break-words flex flex-col`}>
      {activityForThisBubble && activityForThisBubble.length > 0 && (
        <div className="mb-3 border-b border-neutral-700 pb-3 text-xs">
          <ActivityTimeline
            processedEvents={activityForThisBubble}
            isLoading={isLiveActivityForThisBubble}
          />
        </div>
      )}
      
      <ReactMarkdown components={mdComponents}>
        {messageContent}
      </ReactMarkdown>
      
      {showBlueprint && (
        <div className="mt-4 p-6 bg-blue-900/20 rounded-lg border-2 border-blue-500/30 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-blue-300 flex items-center gap-2">
              🎯 设计蓝图
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowBlueprint(false)}
              className="text-blue-400 hover:text-blue-200 hover:bg-blue-800/30"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="bg-neutral-800/50 p-4 rounded-md">
            <pre className="text-sm text-blue-100 whitespace-pre-wrap font-mono leading-relaxed">
              {blueprint || '蓝图生成中...'}
            </pre>
          </div>
        </div>
      )}

      {showHTML && (
        <div className="mt-4 p-6 bg-green-900/20 rounded-lg border-2 border-green-500/30 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-green-300 flex items-center gap-2">
              💻 HTML 代码
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHTML(false)}
              className="text-green-400 hover:text-green-200 hover:bg-green-800/30"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="bg-neutral-800/50 p-4 rounded-md max-h-96 overflow-y-auto">
            <pre className="text-sm text-green-100 whitespace-pre-wrap font-mono leading-relaxed">
              {htmlCode || 'HTML 代码生成中...'}
            </pre>
          </div>
        </div>
      )}
      
      <div className="flex gap-2 justify-end mt-4 mb-2">
        <Button
          variant="outline"
          size="sm"
          className="bg-neutral-700 hover:bg-neutral-600 text-neutral-200 border-neutral-500"
          onClick={() => handleCopy(messageContent, message.id!)}
        >
          {copiedMessageId === message.id ? "Copied" : "Copy"}
          {copiedMessageId === message.id ? (
            <CopyCheck className="ml-1 h-4 w-4" />
          ) : (
            <Copy className="ml-1 h-4 w-4" />
          )}
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          className="bg-blue-700 hover:bg-blue-600 text-blue-100 border-blue-500"
          onClick={handleGenerateBlueprint}
        >
          {showBlueprint ? "Hide Blueprint" : "Blueprint"}
          <FileText className="ml-1 h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="bg-green-700 hover:bg-green-600 text-green-100 border-green-500"
          onClick={handleGenerateHTML}
        >
          {showHTML ? "Hide HTML" : "HTML"}
          <Code className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

interface ChatMessagesViewProps {
  messages: Message[];
  isLoading: boolean;
  scrollAreaRef: React.RefObject<HTMLDivElement | null>;
  onSubmit: (inputValue: string, effort: string, model: string) => void;
  onCancel: () => void;
  liveActivityEvents: ProcessedEvent[];
  historicalActivities: Record<string, ProcessedEvent[]>;
}

export function ChatMessagesView({
  messages,
  isLoading,
  scrollAreaRef,
  onSubmit,
  onCancel,
  liveActivityEvents,
  historicalActivities,
}: ChatMessagesViewProps) {
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const handleCopy = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  // Remove handleSave function since auto-save is now handled in App.tsx

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 overflow-y-auto" ref={scrollAreaRef}>
        <div className="p-4 md:p-6 space-y-2 max-w-4xl mx-auto pt-16">
          {messages.map((message, index) => {
            const isLast = index === messages.length - 1;
            return (
              <div key={message.id || `msg-${index}`} className="space-y-3">
                <div
                  className={`flex items-start gap-3 ${
                    message.type === "human" ? "justify-end" : ""
                  }`}
                >
                  {message.type === "human" ? (
                    <HumanMessageBubble
                      message={message}
                      mdComponents={mdComponents}
                    />
                  ) : (
                    <AiMessageBubble
                      message={message}
                      historicalActivity={historicalActivities[message.id!]}
                      liveActivity={liveActivityEvents}
                      isLastMessage={isLast}
                      isOverallLoading={isLoading}
                      mdComponents={mdComponents}
                      handleCopy={handleCopy}
                      copiedMessageId={copiedMessageId}
                    />
                  )}
                </div>
              </div>
            );
          })}
          {isLoading &&
            (messages.length === 0 ||
              messages[messages.length - 1].type === "human") && (
              <div className="flex items-start gap-3 mt-3">
                <div className="relative group max-w-[85%] md:max-w-[80%] rounded-xl p-3 shadow-sm break-words bg-neutral-800 text-neutral-100 rounded-bl-none w-full min-h-[56px]">
                  {liveActivityEvents.length > 0 ? (
                    <div className="text-xs">
                      <ActivityTimeline
                        processedEvents={liveActivityEvents}
                        isLoading={true}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-start h-full">
                      <Loader2 className="h-5 w-5 animate-spin text-neutral-400 mr-2" />
                      <span>Processing...</span>
                    </div>
                  )}
                </div>
              </div>
            )}
        </div>
      </ScrollArea>
      <InputForm
        onSubmit={onSubmit}
        isLoading={isLoading}
        onCancel={onCancel}
        hasHistory={messages.length > 0}
      />
    </div>
  );
}
