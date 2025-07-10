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
// API call to generate blueprint using Gemini
const callGeminiAPI = async (content: string): Promise<string> => {
  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!GEMINI_API_KEY) {
    throw new Error('VITE_GEMINI_API_KEY is not set in environment variables');
  }

  const prompt = `你是一个专业的信息图表设计师。请根据以下内容生成详细的设计蓝图。

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

请根据内容的实际特点和信息量来确定页面数量和类型。`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      return data.candidates[0].content.parts[0].text;
    } else {
      throw new Error('Invalid API response format');
    }
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    // Fallback to a basic blueprint if API fails
    return generateFallbackBlueprint(content);
  }
};

// Fallback blueprint generator
const generateFallbackBlueprint = (content: string): string => {
  const firstSentence = content.split('.')[0] || 'AI 数据分析';
  
  return `信息图 1 / 3
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
};

// Updated blueprint generation function
const generateBlueprint = async (content: string): Promise<string> => {
  try {
    return await callGeminiAPI(content);
  } catch (error) {
    console.error('Blueprint generation failed:', error);
    return generateFallbackBlueprint(content);
  }
};

// API call to generate HTML using Gemini
const callGeminiAPIForHTML = async (blueprint: string): Promise<string> => {
  console.log('=== callGeminiAPIForHTML called ===');
  console.log('Blueprint length:', blueprint.length);
  
  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!GEMINI_API_KEY) {
    console.error('VITE_GEMINI_API_KEY is not set');
    throw new Error('VITE_GEMINI_API_KEY is not set in environment variables');
  }

  const prompt = `作为专业前端开发工程师，请根据以下设计蓝图生成完整的HTML+CSS+JavaScript代码。

重要要求：
1. 固定画布尺寸：448px × 597px
2. 生成蓝图中指定的所有页面（通常6-10页）
3. 多页面导航：键盘左右箭头 + 按钮导航
4. 页面指示器显示当前页/总页数
5. 禁用外部图片，使用CSS渐变和Emoji图标
6. 现代CSS：Flexbox、Grid、渐变
7. 字体：-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif

代码要求：
- 紧凑简洁的代码结构，减少注释
- 所有页面必须包含在单个HTML文档中
- 使用简化的CSS类名和结构
- 确保所有页面都正确实现

请生成完整可运行的HTML文档，确保包含所有页面：

设计蓝图：
${blueprint}`;

  console.log('Sending request to Gemini API...');
  console.log('Prompt length:', prompt.length);
  console.log('Full Prompt:', prompt);

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        }
      })
    });

    console.log('API response status:', response.status);
    console.log('API response ok:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error response:', errorText);
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('API response data keys:', Object.keys(data));
    console.log('Full API response:', JSON.stringify(data, null, 2));
    
    if (data.candidates && data.candidates.length > 0) {
      console.log('Candidates found:', data.candidates.length);
      console.log('First candidate:', JSON.stringify(data.candidates[0], null, 2));
      
      const candidate = data.candidates[0];
      if (candidate.content) {
        console.log('Content found:', JSON.stringify(candidate.content, null, 2));
        
        if (candidate.content.parts && candidate.content.parts.length > 0) {
          let htmlContent = candidate.content.parts[0].text;
          console.log('Raw API response length:', htmlContent.length);
          console.log('Raw API response preview:', htmlContent.substring(0, 500));
          
          // Check if response appears to be truncated
          const lastLine = htmlContent.trim().split('\n').pop();
          const isTruncated = !htmlContent.includes('</html>') || 
                            lastLine?.length < 10 || 
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
            // Try to find HTML content after "```html" or similar markers
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
            // You could implement retry logic here or show a user warning
            alert('Warning: The generated HTML appears to be incomplete due to response length limits. The visualization may not display all pages correctly.');
          }
          
          // Validate the HTML contains multi-page structure
          const pageCount = (htmlContent.match(/id="page-?\d+"/g) || []).length;
          console.log('Generated HTML page count:', pageCount);
          
          if (pageCount === 0) {
            console.warn('Generated HTML appears to have no pages, this might be incorrect');
            // Try alternative page detection patterns
            const altPageCount = (htmlContent.match(/class="page"/g) || []).length;
            console.log('Alternative page count detection:', altPageCount);
          }
          
          console.log('Final HTML length:', htmlContent.length);
          console.log('HTML validation - DOCTYPE:', htmlContent.includes('<!DOCTYPE html>'));
          console.log('HTML validation - closing tag:', htmlContent.includes('</html>'));
          
          return htmlContent;
        } else {
          console.error('No parts found in candidate.content:', candidate.content);
          throw new Error('No parts found in API response content');
        }
      } else {
        console.error('No content found in candidate:', candidate);
        throw new Error('No content found in API response candidate');
      }
    } else {
      console.error('No candidates found in API response:', data);
      throw new Error('No candidates found in API response');
    }
  } catch (error) {
    console.error('Error calling Gemini API for HTML:', error);
    // Fallback to the simple HTML generation
    throw error; // Re-throw to handle in calling function
  }
};

// API call to generate HTML using OpenAI
const callOpenAIForHTML = async (blueprint: string): Promise<string> => {
  console.log('=== callOpenAIForHTML called ===');
  console.log('Blueprint length:', blueprint.length);
  
  const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
  
  if (!OPENAI_API_KEY) {
    console.error('VITE_OPENAI_API_KEY is not set');
    throw new Error('VITE_OPENAI_API_KEY is not set in environment variables');
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

  console.log('Sending request to OpenAI API...');
  console.log('Prompt length:', prompt.length);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert frontend developer and UI designer. Generate complete, functional HTML+CSS+JavaScript code based on design blueprints. Always provide complete, runnable code with all specified pages.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 16384, // Higher than Gemini's limit
      }),
    });

    console.log('API response status:', response.status);
    console.log('API response ok:', response.ok);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || 'Unknown error';
      console.error('API error response:', errorData);
      throw new Error(`OpenAI API request failed: ${response.status} - ${errorMessage}`);
    }

    const data = await response.json();
    console.log('API response data keys:', Object.keys(data));
    
    if (data.choices && data.choices.length > 0) {
      console.log('Choices found:', data.choices.length);
      console.log('First choice:', data.choices[0]);
      
      const choice = data.choices[0];
      if (choice.message && choice.message.content) {
        let htmlContent = choice.message.content;
        console.log('Raw API response length:', htmlContent.length);
        console.log('Raw API response preview:', htmlContent.substring(0, 500));
        
        // Check if response appears to be truncated
        const lastLine = htmlContent.trim().split('\n').pop();
        const isTruncated = !htmlContent.includes('</html>') || 
                          lastLine?.length < 10 || 
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
          alert('Warning: The generated HTML appears to be incomplete due to response length limits. The visualization may not display all pages correctly.');
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
      } else {
        console.error('No content found in choice:', choice);
        throw new Error('No content found in API response');
      }
    } else {
      console.error('No choices found in API response:', data);
      throw new Error('No choices found in API response');
    }
  } catch (error) {
    console.error('Error calling OpenAI API for HTML:', error);
    throw error;
  }
};

// Updated HTML generation function - now uses OpenAI API
const generateHTML = async (blueprint: string): Promise<string> => {
  console.log('=== DEBUG: generateHTML called ===');
  console.log('Blueprint length:', blueprint.length);
  console.log('Blueprint preview:', blueprint.substring(0, 200) + '...');
  
  try {
    console.log('Calling OpenAI API for HTML generation...');
    const generatedHTML = await callOpenAIForHTML(blueprint);
    console.log('Successfully generated HTML from OpenAI API, length:', generatedHTML.length);
    
    // Additional validation
    if (generatedHTML.length < 1000) {
      console.warn('Generated HTML seems very short, might be incomplete');
    }
    
    if (!generatedHTML.includes('<!DOCTYPE html>') && !generatedHTML.includes('<html')) {
      console.warn('Generated HTML might not be a complete HTML document');
    }
    
    return generatedHTML;
  } catch (error) {
    console.error('Error generating HTML via OpenAI API:', error);
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

  const handleGenerateBlueprint = async () => {
    console.log('Blueprint button clicked!'); // Debug log
    try {
      const generatedBlueprint = await generateBlueprint(messageContent);
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

  const handleGenerateHTML = async () => {
    console.log('HTML button clicked!'); // Debug log
    try {
      let blueprintToUse = blueprint;
      
      // If no blueprint exists, generate one first
      if (!blueprintToUse) {
        console.log('No existing blueprint, generating new one...'); // Debug log
        blueprintToUse = await generateBlueprint(messageContent);
        setBlueprint(blueprintToUse); // Store it for future use
      } else {
        console.log('Using existing blueprint'); // Debug log
      }
      
      const generatedHTML = await generateHTML(blueprintToUse);
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
