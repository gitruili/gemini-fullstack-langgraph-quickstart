import type React from "react";
import type { Message } from "@langchain/langgraph-sdk";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Copy, CopyCheck, FileText, X, Code, ExternalLink } from "lucide-react";
import { InputForm } from "@/components/InputForm";
import { Button } from "@/components/ui/button";
import { useState, ReactNode, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  ActivityTimeline,
  ProcessedEvent,
} from "@/components/ActivityTimeline"; // Assuming ActivityTimeline is in the same dir or adjust path
import * as htmlToImage from 'html-to-image';
import JSZip from 'jszip';
import { GoogleGenAI } from '@google/genai';

// Blueprint generation function
// API call to generate blueprint using GoogleGenAI
interface BlueprintResult {
  blueprint: string;
  xiaohongshu: {
    titles: string[];
    content: string;
  };
}

const callGeminiAPI = async (content: string): Promise<BlueprintResult> => {
  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!GEMINI_API_KEY) {
    throw new Error('VITE_GEMINI_API_KEY is not set in environment variables');
  }

  const prompt = `你是一个专业的信息图表设计师和小红书内容创作者。请根据以下内容生成详细的设计蓝图和小红书发布内容。

内容：
${content}

请按照以下格式生成多页信息图表的设计蓝图：

信息图 1 / [总页数]
页面类型：[封面页面/概览/对比/数据展示/内容详情/流程步骤]
页面标题：[具体标题]
核心内容与视觉构思

布局：[具体布局描述]
背景：[背景色彩和样式]
内容：[具体内容安排]
视觉元素：[图标、图表、动效等]
色彩：[色彩搭配方案]

要求：
1. 生成3-9页的完整设计蓝图
2. 第1页必须是封面页面（Hero Page）
3. 第2页必须是概览页面（Executive Summary）
4. 根据内容特点选择合适的页面类型（对比、数据展示、流程步骤等）
5. 每页都要有具体的布局、色彩、视觉元素描述
6. 适合448×597px的固定画布尺寸
7. 使用emoji图标和CSS渐变背景
8. 页面间要有逻辑连贯性

请根据内容的实际特点和信息量来确定页面数量和类型。

请以JSON格式返回结果：

{
  "blueprint": "完整的信息图设计蓝图内容",
  "xiaohongshu": {
    "titles": [
      "标题1：[吸引人的标题，带相关emoji]",
      "标题2：[另一个角度的标题，带相关emoji]", 
      "标题3：[第三个备选标题，带相关emoji]"
    ],
    "content": "[引人入胜的开头]\n\n[核心内容要点，用emoji和换行符格式化]\n\n[实用建议或总结]\n\n[相关话题标签]\n#标签1 #标签2 #标签3 #标签4 #标签5 #标签6 #标签7 #标签8 #标签9"
  }
}

注意：
1. 返回严格的JSON格式，不要包含任何其他文字
2. blueprint字段包含完整的信息图设计蓝图
3. xiaohongshu.titles包含3个备选标题
4. xiaohongshu.content包含完整的正文内容，包括hashtags
5. 小红书内容要求简洁有趣，符合平台调性，标题吸引点击，正文有价值且易读，标签要热门且相关。`;

  try {
    const ai = new GoogleGenAI({
      apiKey: GEMINI_API_KEY,
    });
    
    const config = {
      thinkingConfig: {
        thinkingBudget: -1,
      },
      responseMimeType: 'application/json',
      systemInstruction: [
        {
          text: `You are a professional infographic designer and Xiaohongshu content creator. You must respond in valid JSON format only. Do not include any explanation or additional text outside of the JSON structure. Return exactly the format requested in the prompt.`,
        }
      ],
    };
    
    const model = 'gemini-2.5-pro';
    const contents = [
      {
        role: 'user',
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ];

    const response = await ai.models.generateContentStream({
      model,
      config,
      contents,
    });
    
    let fullResponse = '';
    for await (const chunk of response) {
      if (chunk.text) {
        fullResponse += chunk.text;
      }
    }
    
    // Parse the response to separate blueprint and Xiaohongshu content
    return parseBlueprintResponse(fullResponse);
  } catch (error) {
    console.error('Error calling GoogleGenAI API:', error);
    // Fallback to a basic blueprint if API fails
    return generateFallbackBlueprint(content);
  }
};

// Parse the API response to separate blueprint and Xiaohongshu content
const parseBlueprintResponse = (response: string): BlueprintResult => {
  console.log('=== Parsing Response ===');
  console.log('Full response length:', response.length);
  console.log('Response preview:', response.substring(0, 500));
  
  try {
    // Try to parse as JSON first
    console.log('Attempting to parse as JSON...');
    
    // Clean up the response - remove any markdown code blocks
    let cleanedResponse = response.trim();
    
    // Remove markdown code blocks if present
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    console.log('Cleaned response preview:', cleanedResponse.substring(0, 300));
    
    // Parse JSON
    const jsonResult = JSON.parse(cleanedResponse);
    console.log('Successfully parsed JSON:', jsonResult);
    
    // Validate JSON structure
    if (jsonResult.blueprint && jsonResult.xiaohongshu) {
      console.log('Valid JSON structure found');
      return {
        blueprint: jsonResult.blueprint,
        xiaohongshu: {
          titles: jsonResult.xiaohongshu.titles || [],
          content: jsonResult.xiaohongshu.content || ''
        }
      };
    } else {
      console.log('Invalid JSON structure, missing required fields');
      throw new Error('Invalid JSON structure');
    }
    
  } catch (error) {
    console.log('JSON parsing failed:', error);
    console.log('Falling back to regex parsing...');
    
    // Fallback to regex parsing for non-JSON responses
    const parts = response.split('---');
    
    if (parts.length < 2) {
      console.log('No separator found, using entire response as blueprint');
      return {
        blueprint: response,
        xiaohongshu: {
          titles: [],
          content: ''
        }
      };
    }
    
    let blueprintPart = parts[0].trim();
    let xiaohongshoPart = parts.slice(1).join('---').trim();
    
    // Check if the blueprint part seems incomplete
    if (blueprintPart.length < 200 || !blueprintPart.includes('信息图')) {
      console.log('Blueprint part seems incomplete, checking for better split');
      
      const xiaohongshuStart = response.search(/小红书发布内容|【小红书标题】|Part 2.*小红书/i);
      if (xiaohongshuStart !== -1) {
        blueprintPart = response.substring(0, xiaohongshuStart).trim();
        xiaohongshoPart = response.substring(xiaohongshuStart).trim();
        console.log('Found better split at position:', xiaohongshuStart);
      }
    }
    
    // Extract titles with regex fallback
    const titlePatterns = [
      /标题\d+[：:]\s*(.*?)(?=\n|标题\d+[：:]|【小红书正文】|$)/g,
      /\*\s*\*\*标题\d+[：:]\*\*\s*(.*?)(?=\n|\*\s*\*\*标题\d+[：:]|【小红书正文】|$)/g,
      /•\s*标题\d+[：:]\s*(.*?)(?=\n|•\s*标题\d+[：:]|【小红书正文】|$)/g
    ];
    
    let titles: string[] = [];
    for (const pattern of titlePatterns) {
      const matches = Array.from(xiaohongshoPart.matchAll(pattern));
      if (matches.length > 0) {
        titles = matches.map(match => match[1].trim());
        console.log('Found titles with pattern:', pattern, titles);
        break;
      }
    }
    
    // Extract content with regex fallback
    const contentPatterns = [
      /【小红书正文】[：:]\s*([\s\S]*?)(?=\n\n|$)/,
      /小红书正文[：:]\s*([\s\S]*?)(?=\n\n|$)/,
      /正文[：:]\s*([\s\S]*?)(?=\n\n|$)/,
      /【小红书正文】[：:]\s*([\s\S]*)/,
      /小红书正文[：:]\s*([\s\S]*)/,
      /正文[：:]\s*([\s\S]*)/
    ];
    
    let content = '';
    for (const pattern of contentPatterns) {
      const match = xiaohongshoPart.match(pattern);
      if (match) {
        content = match[1].trim();
        console.log('Found content with pattern:', pattern);
        break;
      }
    }
    
    console.log('Regex fallback result:');
    console.log('- Blueprint length:', blueprintPart.length);
    console.log('- Titles count:', titles.length);
    console.log('- Content length:', content.length);
    
    return {
      blueprint: blueprintPart,
      xiaohongshu: {
        titles,
        content
      }
    };
  }
};

// Fallback blueprint generator
const generateFallbackBlueprint = (content: string): BlueprintResult => {
  const firstSentence = content.split('.')[0] || 'AI 数据分析';
  
  const blueprintContent = `信息图 1 / 3
页面类型：封面页面（Hero Page）
页面标题：${firstSentence.slice(0, 30)}
核心内容与视觉构思

布局：垂直居中全屏展示
背景：渐变色 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500
内容：主标题 + 副标题
视觉元素：🔍 📊 组合图标
色彩：白色文字，渐变背景

信息图 2 / 3
页面类型：概览（Executive Summary）
页面标题：核心要点总览
核心内容与视觉构思

布局：左右对分布局
背景：bg-slate-50
内容：关键洞察与分析要点
视觉元素：概念图谱展示
色彩：text-indigo-600 主色调

信息图 3 / 3
页面类型：内容详情
页面标题：详细分析
核心内容与视觉构思

布局：标准内容布局
背景：bg-white
内容：核心概念和实际应用
视觉元素：相关图标和图表
色彩：重点内容 bg-yellow-50 突出`;

  const xiaohongshuContent = `今天给大家分享一个超实用的内容！✨

📋 核心要点：
• 内容清晰易懂
• 实用性强
• 适合收藏学习

💡 建议大家：
收藏起来慢慢看，对你一定有帮助！

#干货分享 #学习笔记 #实用技巧 #知识分享 #效率提升 #生活技能 #经验总结 #必看推荐 #涨知识`;

  const xiaohongshuTitles = [
    `🚀 ${firstSentence.slice(0, 20)}...超详细解析！`,
    `📊 一看就懂的${firstSentence.slice(0, 15)}攻略`,
    `💡 ${firstSentence.slice(0, 18)}干货分享`
  ];

  return {
    blueprint: blueprintContent,
    xiaohongshu: {
      titles: xiaohongshuTitles,
      content: xiaohongshuContent
    }
  };
};

// Updated blueprint generation function
const generateBlueprint = async (content: string): Promise<BlueprintResult> => {
  try {
    return await callGeminiAPI(content);
  } catch (error) {
    console.error('Blueprint generation failed:', error);
    return generateFallbackBlueprint(content);
  }
};

// API call to generate HTML using GoogleGenAI
const callGoogleGenAIForHTML = async (blueprint: string): Promise<string> => {
  console.log('=== callGoogleGenAIForHTML called ===');
  console.log('Blueprint length:', blueprint.length);
  
  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!GEMINI_API_KEY) {
    console.error('VITE_GEMINI_API_KEY is not set');
    throw new Error('VITE_GEMINI_API_KEY is not set in environment variables');
  }

  const prompt = `As a professional frontend developer, generate complete HTML+CSS+JavaScript code based on the following design blueprint.

Requirements:
1. Fixed canvas size: 448px × 597px
2. Generate ALL pages specified in the blueprint (usually 6-10 pages)
3. Multi-page navigation: left/right arrow keys + button navigation
4. Page indicator showing current page/total pages
5. No external images - use CSS gradients and Emoji icons
6. Modern CSS: Flexbox, Grid, gradients
7. Font: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif

Code requirements:
- Compact and concise code structure, minimal comments
- All pages must be included in a single HTML document
- Use simplified CSS class names and structure
- Ensure all pages are properly implemented

Generate a complete runnable HTML document including all pages:

Design Blueprint:
${blueprint}`;

  console.log('Sending request to GoogleGenAI API...');
  console.log('Prompt length:', prompt.length);

  try {
    const ai = new GoogleGenAI({
      apiKey: GEMINI_API_KEY,
    });
    
    const config = {
      thinkingConfig: {
        thinkingBudget: -1,
      },
      responseMimeType: 'text/plain',
      systemInstruction: [
        {
          text: `You are an expert frontend developer and UI designer. Generate complete, functional HTML+CSS+JavaScript code based on design blueprints. Always provide complete, runnable code with all specified pages.`,
        }
      ],
    };
    
    const model = 'gemini-2.5-pro';
    const contents = [
      {
        role: 'user',
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ];

    console.log('Generating content...');
    const response = await ai.models.generateContentStream({
      model,
      config,
      contents,
    });

    let htmlContent = '';
    for await (const chunk of response) {
      if (chunk.text) {
        htmlContent += chunk.text;
      }
    }

    console.log('Raw API response length:', htmlContent.length);
    console.log('Raw API response preview:', htmlContent.substring(0, 500));
    
    // Check if response appears to be truncated
    const lastLine = htmlContent.trim().split('\n').pop();
    const isTruncated = !htmlContent.includes('</html>') || 
                      (lastLine && lastLine.length < 10) || 
                      htmlContent.endsWith('{') || 
                      htmlContent.endsWith(':') ||
                      htmlContent.endsWith(';') ||
                      htmlContent.endsWith(',');
    
    console.log('Response appears truncated:', isTruncated);
    console.log('Last 200 characters:', htmlContent.slice(-200));
    
    // Extract HTML from markdown code blocks if present
    const codeBlockMatch = htmlContent.match(/```html\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      htmlContent = codeBlockMatch[1];
      console.log('Extracted HTML from code block, length:', htmlContent.length);
    }
    
    // Additional extraction patterns for different formats
    if (!htmlContent.includes('<!DOCTYPE html>')) {
      const htmlStartPatterns = [
        /```html\s*\n([\s\S]*)/,
        /```\s*\n(<!DOCTYPE html[\s\S]*)/,
        /(<!DOCTYPE html[\s\S]*)/
      ];
      
      for (const pattern of htmlStartPatterns) {
        const match = htmlContent.match(pattern);
        if (match) {
          htmlContent = match[1];
          console.log('Extracted HTML using pattern, length:', htmlContent.length);
          break;
        }
      }
    }
    
    // Ensure we have a complete HTML document
    if (!htmlContent.includes('<!DOCTYPE html>')) {
      console.warn('HTML content does not appear to be a complete document');
      console.log('Content starts with:', htmlContent.substring(0, 200));
    }
    
    // Handle truncated responses
    if (isTruncated) {
      console.warn('⚠️  API response appears to be truncated. This may result in incomplete HTML.');
      // alert('Warning: The generated HTML appears to be incomplete due to response length limits. The visualization may not display all pages correctly.');
    }
    
    // Validate the HTML contains multi-page structure
    const pageCount = (htmlContent.match(/id="page-?\d+"/g) || []).length;
    console.log('Generated HTML page count:', pageCount);
    
    if (pageCount === 0) {
      console.warn('Generated HTML appears to have no pages, this might be incorrect');
      const altPageCount = (htmlContent.match(/class="page"/g) || []).length;
      console.log('Alternative page count detection:', altPageCount);
    }
    
    console.log('Final HTML length:', htmlContent.length);
    console.log('HTML validation - DOCTYPE:', htmlContent.includes('<!DOCTYPE html>'));
    console.log('HTML validation - closing tag:', htmlContent.includes('</html>'));
    
    return htmlContent;
  } catch (error) {
    console.error('Error calling GoogleGenAI API for HTML:', error);
    throw error;
  }
};

// Updated HTML generation function - now uses GoogleGenAI API
const generateHTML = async (blueprint: string): Promise<string> => {
  console.log('=== DEBUG: generateHTML called ===');
  console.log('Blueprint length:', blueprint.length);
  console.log('Blueprint preview:', blueprint.substring(0, 200) + '...');
  
  try {
    console.log('Calling GoogleGenAI API for HTML generation...');
    const generatedHTML = await callGoogleGenAIForHTML(blueprint);
    console.log('Successfully generated HTML from GoogleGenAI API, length:', generatedHTML.length);
    
    // Additional validation
    if (generatedHTML.length < 1000) {
      console.warn('Generated HTML seems very short, might be incomplete');
    }
    
    if (!generatedHTML.includes('<!DOCTYPE html>') && !generatedHTML.includes('<html')) {
      console.warn('Generated HTML might not be a complete HTML document');
    }
    
    return generatedHTML;
  } catch (error) {
    console.error('Error generating HTML via GoogleGenAI API:', error);
    console.log('Falling back to generateFallbackHTML');
    
    // Extract some content from blueprint for fallback
    const fallbackContent = blueprint.substring(0, 1000);
    const fallbackHTML = generateFallbackHTML(fallbackContent);
    console.log('Fallback HTML generated, length:', fallbackHTML.length);
    return fallbackHTML;
  }
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
  const [isGeneratingBlueprint, setIsGeneratingBlueprint] = useState(false);
  const [generatedBlueprint, setGeneratedBlueprint] = useState<BlueprintResult | null>(null);
  const [blueprintError, setBlueprintError] = useState<string | null>(null);
  const [isGeneratingHTML, setIsGeneratingHTML] = useState(false);
  const [generatedHTML, setGeneratedHTML] = useState<string | null>(null);
  const [htmlError, setHtmlError] = useState<string | null>(null);
  const [isGeneratingPNG, setIsGeneratingPNG] = useState(false);
  const [pngError, setPngError] = useState<string | null>(null);
  const [generatedPNGs, setGeneratedPNGs] = useState<string[]>([]);
  const [isAuditingPNG, setIsAuditingPNG] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const htmlContainerRef = useRef<HTMLDivElement>(null);
  
  // UI state variables
  const [showBlueprint, setShowBlueprint] = useState(false);
  const [showXiaohongshu, setShowXiaohongshu] = useState(false);
  const [showHTML, setShowHTML] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Determine which activity events to show and if it's for a live loading message
  const activityForThisBubble =
    isLastMessage && isOverallLoading ? liveActivity : historicalActivity;
  const isLiveActivityForThisBubble = isLastMessage && isOverallLoading;

  const messageContent = typeof message.content === "string"
    ? message.content
    : JSON.stringify(message.content);

  const handleGenerateBlueprint = async () => {
    console.log('Blueprint button clicked!'); // Debug log
    try {
      const generatedBlueprint = await generateBlueprint(messageContent);
      console.log('Generated blueprint:', generatedBlueprint); // Debug log
      setGeneratedBlueprint(generatedBlueprint);
      setShowBlueprint(true);
      setShowXiaohongshu(true);
      console.log('Blueprint state updated, showBlueprint:', true); // Debug log
    } catch (error) {
      console.error('Error generating blueprint:', error);
      // Fallback blueprint
      setGeneratedBlueprint(generateFallbackBlueprint(messageContent));
      setShowBlueprint(true);
      setShowXiaohongshu(true);
    }
  };

  const handleGenerateHTML = async () => {
    console.log('HTML button clicked!'); // Debug log
    try {
      let blueprintToUse = generatedBlueprint; // Use generatedBlueprint state
      
      // If no blueprint exists, generate one first
      if (!blueprintToUse) {
        console.log('No existing blueprint, generating new one...'); // Debug log
        blueprintToUse = await generateBlueprint(messageContent);
        setGeneratedBlueprint(blueprintToUse); // Store it for future use
      } else {
        console.log('Using existing blueprint'); // Debug log
      }
      
      console.log('Generating HTML with blueprint...'); // Debug log
      const generatedHTML = await generateHTML(blueprintToUse.blueprint);
      console.log('Generated HTML:', generatedHTML); // Debug log
      setGeneratedHTML(generatedHTML);
      setShowHTML(true);
      console.log('HTML state updated, showHTML:', true); // Debug log
    } catch (error) {
      console.error('Error generating HTML:', error);
      // Fallback HTML
      setGeneratedHTML(generateFallbackHTML(messageContent));
      setShowHTML(true);
    }
  };

  const handleGeneratePNG = async () => {
    if (!generatedHTML) {
      alert('请先生成HTML代码');
      return;
    }

    setIsGeneratingPNG(true);
    setPngError(null);

    try {
      console.log('开始生成PNG图片...');
      
      // Create a hidden iframe to properly render the HTML with all styles
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.left = '-9999px';
      iframe.style.top = '-9999px';
      iframe.style.width = '448px';
      iframe.style.height = '597px';
      iframe.style.border = 'none';
      iframe.style.background = '#ffffff';
      
      document.body.appendChild(iframe);
      
      // Write the HTML content to iframe
      iframe.contentDocument?.open();
      iframe.contentDocument?.write(generatedHTML);
      iframe.contentDocument?.close();
      
      // Wait for the iframe to fully load
      await new Promise((resolve) => {
        iframe.onload = resolve;
        // Fallback timeout
        setTimeout(resolve, 3000);
      });
      
      // Additional wait for fonts and styles to load
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const iframeBody = iframe.contentDocument?.body;
      if (!iframeBody) {
        throw new Error('无法访问iframe内容');
      }
      
      // Find all pages in the HTML
      const pages = iframeBody.querySelectorAll('[id*="page"], .page, .infographic-page');
      console.log(`发现 ${pages.length} 个页面元素`);
      
      // Array to store PNG data URLs for audit
      const pngDataUrls: string[] = [];
      
      if (pages.length === 0) {
        console.log('未找到页面元素，尝试截取整个body');
        // If no specific pages found, capture the whole body
        const dataUrl = await htmlToImage.toPng(iframeBody, {
          width: 448,
          height: 597,
          style: {
            transform: 'scale(1)',
            transformOrigin: 'top left',
          },
          quality: 1.0,
          pixelRatio: 2,
          backgroundColor: '#ffffff',
        });
        
        pngDataUrls.push(dataUrl);
        
        // Single page download
        const link = document.createElement('a');
        link.download = `infographic-${new Date().getTime()}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('单页PNG生成成功');
      } else {
        // Multiple pages - create ZIP
        const zip = new JSZip();
        
        for (let i = 0; i < pages.length; i++) {
          const page = pages[i] as HTMLElement;
          console.log(`正在截取第 ${i + 1} 页...`);
          
          // Make sure only this page is visible
          pages.forEach((p, index) => {
            const element = p as HTMLElement;
            if (index === i) {
              element.style.display = 'flex';
              element.style.opacity = '1';
              element.style.visibility = 'visible';
            } else {
              element.style.display = 'none';
              element.style.opacity = '0';
              element.style.visibility = 'hidden';
            }
          });
          
          // Wait a bit for the visibility changes to take effect
          await new Promise(resolve => setTimeout(resolve, 500));
          
          try {
            const dataUrl = await htmlToImage.toPng(page, {
              width: 448,
              height: 597,
              style: {
                transform: 'scale(1)',
                transformOrigin: 'top left',
              },
              quality: 1.0,
              pixelRatio: 2,
              backgroundColor: '#ffffff',
            });
            
            pngDataUrls.push(dataUrl);
            
            // Convert data URL to blob
            const response = await fetch(dataUrl);
            const blob = await response.blob();
            
            zip.file(`page-${i + 1}.png`, blob);
            console.log(`第 ${i + 1} 页截取成功`);
          } catch (pageError) {
            console.error(`第 ${i + 1} 页截取失败:`, pageError);
            setPngError(`第 ${i + 1} 页截取失败: ${pageError instanceof Error ? pageError.message : '未知错误'}`);
          }
        }
        
        // Generate and download ZIP
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(zipBlob);
        link.download = `infographic-pages-${new Date().getTime()}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        
        console.log(`${pages.length} 页PNG打包下载成功`);
      }
      
      // Store PNG data URLs for audit
      setGeneratedPNGs(pngDataUrls);
      
      // Clean up
      document.body.removeChild(iframe);
      
    } catch (error) {
      console.error('Error generating PNG:', error);
      setPngError('PNG生成失败: ' + (error instanceof Error ? error.message : '未知错误'));
      
      // Clean up on error
      const iframe = document.querySelector('iframe[style*="-9999px"]');
      if (iframe) {
        document.body.removeChild(iframe);
      }
    } finally {
      setIsGeneratingPNG(false);
    }
  };

  const handleAuditAndFixPNG = async () => {
    if (!generatedHTML || generatedPNGs.length === 0) {
      alert('请先生成HTML代码和PNG图片');
      return;
    }

    setIsAuditingPNG(true);
    setAuditError(null);

    try {
      console.log('开始审计PNG图片...');
      
      const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
      
      if (!GEMINI_API_KEY) {
        throw new Error('VITE_GEMINI_API_KEY is not set in environment variables');
      }

      const prompt = `你是一个质控智能体，请分析以下生成的PNG图片和HTML代码。

任务：
1. 检查PNG图片中的内容是否有溢出448px × 597px的画布边界
2. 识别文字、图标或其他元素是否被裁切或超出边界
3. 如果发现溢出问题，修复提供的HTML代码
4. 确保修复后的HTML在448px × 597px的固定尺寸内完美显示

修复要求：
- 调整字体大小、间距、边距
- 优化布局结构，确保内容适配画布
- 保持设计美观性的同时确保完整显示
- 使用响应式设计技巧适配固定尺寸

请仔细分析图片，如果发现溢出问题，请提供修复后的完整HTML代码。如果没有发现问题，请回复"无需修复"。

当前HTML代码：
${generatedHTML}

PNG图片数量：${generatedPNGs.length}张
画布尺寸：448px × 597px`;

      const ai = new GoogleGenAI({
        apiKey: GEMINI_API_KEY,
      });
      
      const config = {
        thinkingConfig: {
          thinkingBudget: 0,
        },
        responseMimeType: 'text/plain',
      };
      
      const model = 'gemini-2.5-flash';
      
      // Prepare contents with text and images
      const parts: any[] = [
        { text: prompt } as any
      ];
      
      // Add PNG images as inline data
      for (let i = 0; i < generatedPNGs.length; i++) {
        parts.push({
          inlineData: {
            mimeType: 'image/png',
            data: generatedPNGs[i].replace(/^data:image\/png;base64,/, '')
          }
        } as any);
      }
      
      const contents = [
        {
          role: 'user',
          parts: parts,
        },
      ];

      console.log('发送审计请求到GoogleGenAI...');
      const response = await ai.models.generateContentStream({
        model,
        config,
        contents,
      });
      
      let auditResult = '';
      for await (const chunk of response) {
        if (chunk.text) {
          auditResult += chunk.text;
        }
      }
      
      console.log('审计结果:', auditResult);
      
      if (auditResult.includes('无需修复') || auditResult.includes('No fixes needed')) {
        alert('✅ 审计完成：PNG图片无溢出问题，无需修复');
      } else {
        // Extract HTML from the response
        const htmlMatch = auditResult.match(/```html\s*([\s\S]*?)\s*```/) || 
                          auditResult.match(/(<!DOCTYPE html[\s\S]*<\/html>)/);
        
        if (htmlMatch) {
          const fixedHTML = htmlMatch[1];
          setGeneratedHTML(fixedHTML);
          alert('🔧 审计完成：发现溢出问题，已自动修复HTML代码。请重新生成PNG查看效果。');
          console.log('HTML已更新，长度:', fixedHTML.length);
        } else {
          // If no HTML found, show the audit result
          alert('⚠️ 审计完成：' + auditResult.substring(0, 200) + '...');
        }
      }
      
    } catch (error) {
      console.error('Error auditing PNG:', error);
      setAuditError('审计失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setIsAuditingPNG(false);
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
          <div className="bg-neutral-800/50 p-4 rounded-md max-h-96 overflow-y-auto">
            <pre className="text-sm text-blue-100 whitespace-pre-wrap font-mono leading-relaxed">
              {generatedBlueprint?.blueprint || '蓝图生成中...'}
            </pre>
          </div>
        </div>
      )}

      {showXiaohongshu && generatedBlueprint && (
        <div className="mt-4 p-6 bg-pink-900/20 rounded-lg border-2 border-pink-500/30 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-pink-300 flex items-center gap-2">
              📱 小红书内容
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowXiaohongshu(false)}
              className="text-pink-400 hover:text-pink-200 hover:bg-pink-800/30"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-4">
            {generatedBlueprint.xiaohongshu.titles.length > 0 && (
              <div className="bg-neutral-800/50 p-4 rounded-md">
                <h4 className="text-pink-200 font-semibold mb-2">📝 标题选择 (3个备选):</h4>
                <div className="space-y-2">
                  {generatedBlueprint.xiaohongshu.titles.map((title, index) => (
                    <div key={index} className="text-sm text-pink-100 bg-pink-900/20 p-2 rounded cursor-pointer hover:bg-pink-900/30 transition-colors">
                      <span className="text-pink-400 font-medium">标题{index + 1}:</span> {title}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {generatedBlueprint.xiaohongshu.content && (
              <div className="bg-neutral-800/50 p-4 rounded-md">
                <h4 className="text-pink-200 font-semibold mb-2">📝 正文内容:</h4>
                <div className="text-sm text-pink-100 whitespace-pre-wrap leading-relaxed">
                  {generatedBlueprint.xiaohongshu.content}
                </div>
              </div>
            )}
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
              {generatedHTML || 'HTML 代码生成中...'}
            </pre>
          </div>
        </div>
      )}
      
      {showPreview && generatedHTML && (
        <div className="mt-4 p-6 bg-purple-900/20 rounded-lg border-2 border-purple-500/30 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-purple-300 flex items-center gap-2">
              👀 HTML预览
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview(false)}
              className="text-purple-400 hover:text-purple-200 hover:bg-purple-800/30"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="bg-neutral-800/50 p-4 rounded-md">
            <iframe
              srcDoc={generatedHTML}
              style={{
                width: '448px',
                height: '597px',
                border: '1px solid #666',
                borderRadius: '4px',
                backgroundColor: '#ffffff'
              }}
              title="HTML Preview"
            />
          </div>
        </div>
      )}
      
      {pngError && (
        <div className="mt-4 p-4 bg-red-900/20 rounded-lg border-2 border-red-500/30 shadow-lg">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-red-300 flex items-center gap-2">
              ❌ PNG生成错误
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPngError(null)}
              className="text-red-400 hover:text-red-200 hover:bg-red-800/30"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-red-200 mt-2">{pngError}</p>
        </div>
      )}
      
      {auditError && (
        <div className="mt-4 p-4 bg-red-900/20 rounded-lg border-2 border-red-500/30 shadow-lg">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-red-300 flex items-center gap-2">
              ❌ 审计错误
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAuditError(null)}
              className="text-red-400 hover:text-red-200 hover:bg-red-800/30"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-red-200 mt-2">{auditError}</p>
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
          className="bg-pink-700 hover:bg-pink-600 text-pink-100 border-pink-500"
          onClick={() => setShowXiaohongshu(!showXiaohongshu)}
          disabled={!generatedBlueprint}
        >
          {showXiaohongshu ? "Hide 小红书" : "小红书"}
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

        <Button
          variant="outline"
          size="sm"
          className="bg-purple-700 hover:bg-purple-600 text-purple-100 border-purple-500"
          onClick={() => setShowPreview(!showPreview)}
          disabled={!generatedHTML}
        >
          {showPreview ? "Hide Preview" : "Preview"}
          <ExternalLink className="ml-1 h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleGeneratePNG}
          disabled={!generatedHTML || isGeneratingPNG}
          className="text-orange-400 border-orange-400 hover:bg-orange-400/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          {isGeneratingPNG ? '生成PNG中...' : '生成PNG图片'}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleAuditAndFixPNG}
          disabled={!generatedHTML || generatedPNGs.length === 0 || isAuditingPNG}
          className="text-yellow-400 border-yellow-400 hover:bg-yellow-400/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileText className="w-4 h-4 mr-2" />
          {isAuditingPNG ? '审计中...' : '审计PNG'}
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
