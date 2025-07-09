import type React from "react";
import type { Message } from "@langchain/langgraph-sdk";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Copy, CopyCheck, FileText, X } from "lucide-react";
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
  
  // Analyze content structure more thoroughly
  const headers = lines.filter(line => line.match(/^#{1,6}\s/));
  const listItems = lines.filter(line => line.match(/^[-*]\s/) || line.match(/^\d+\.\s/));
  const links = content.match(/\[([^\]]+)\]\([^)]+\)/g) || [];
  const codeBlocks = content.match(/```[\s\S]*?```/g) || [];
  
  // Detect content themes and patterns
  const contentLower = content.toLowerCase();
  const hasComparison = /vs|versus|compared?|differ|advantage|disadvantage|better|worse|pros?|cons?/.test(contentLower);
  const hasProcess = /step|process|procedure|method|how to|guide|tutorial|first|second|third|then|next|finally/.test(contentLower);
  const hasDataNumbers = /\d+%|\d+\.\d+|statistics?|data|research|study|survey|result/.test(contentLower);
  const hasTechnical = /code|api|function|algorithm|implementation|technical|programming/.test(contentLower);
  const hasTimeline = /\d{4}|\b(january|february|march|april|may|june|july|august|september|october|november|december)|timeline|history|evolution/.test(contentLower);
  
  let blueprintPages: string[] = [];
  
  if (headers.length > 0) {
    headers.forEach((header, index) => {
      const level = (header.match(/^#+/) || [''])[0].length;
      const title = header.replace(/^#+\s*/, '');
      
      // Get content under this header
      const headerIndex = lines.indexOf(header);
      const nextHeaderIndex = lines.findIndex((line, i) => i > headerIndex && line.match(/^#{1,6}\s/));
      const sectionContent = lines.slice(headerIndex + 1, nextHeaderIndex === -1 ? lines.length : nextHeaderIndex).join('\n');
      
      // Intelligent page type detection
      let pageType = '信息展示';
      let layoutStructure = '标准内容布局';
      let visualConcept = '清晰信息展示';
      let colorScheme = 'bg-white with clean typography';
      let icon = '📄';
      let contentHighlights: string[] = [];
      
      // Analyze section content
      const sectionLower = sectionContent.toLowerCase();
      const sectionHasLists = sectionContent.includes('-') || sectionContent.includes('*') || /\d+\./.test(sectionContent);
      const sectionHasLinks = /\[.*?\]\(.*?\)/.test(sectionContent);
      const sectionHasNumbers = /\d+%|\d+\.\d+/.test(sectionContent);
      
      if (hasComparison && (title.includes('vs') || sectionLower.includes('compar') || sectionLower.includes('differ'))) {
        pageType = '核心要点对比';
        layoutStructure = '左右对比结构';
        visualConcept = '对比卡片 + 优劣势突出';
        colorScheme = 'bg-blue-50 vs bg-green-50';
        icon = '⚖️';
        contentHighlights = ['对比要点可视化', '差异性突出展示', '决策引导设计'];
      } else if (hasProcess && (sectionHasLists || title.toLowerCase().includes('step') || title.toLowerCase().includes('how'))) {
        pageType = '流程指南';
        layoutStructure = '垂直流程布局';
        visualConcept = '步骤卡片 + 进度指示';
        colorScheme = 'bg-gradient-to-b from-blue-50 to-indigo-100';
        icon = '🔄';
        contentHighlights = ['步骤可视化', '进度追踪', '操作指引清晰'];
      } else if (hasDataNumbers && sectionHasNumbers) {
        pageType = '数据可视化';
        layoutStructure = '图表展示布局';
        visualConcept = '数据图表 + 关键指标';
        colorScheme = 'bg-gray-50 with data accents';
        icon = '📊';
        contentHighlights = ['数据图表化', '关键指标突出', '趋势可视化'];
      } else if (hasTechnical && (codeBlocks.length > 0 || title.toLowerCase().includes('code') || title.toLowerCase().includes('api'))) {
        pageType = '技术文档';
        layoutStructure = '代码示例布局';
        visualConcept = '代码块 + 技术说明';
        colorScheme = 'bg-gray-900 with syntax highlighting';
        icon = '💻';
        contentHighlights = ['代码语法高亮', '技术要点突出', '实例演示'];
      } else if (hasTimeline && (title.toLowerCase().includes('history') || sectionLower.includes('time'))) {
        pageType = '时间线展示';
        layoutStructure = '时间轴布局';
        visualConcept = '时间线 + 事件节点';
        colorScheme = 'bg-gradient-to-r from-purple-50 to-pink-50';
        icon = '📅';
        contentHighlights = ['时间轴可视化', '事件节点突出', '历史脉络清晰'];
      } else if (sectionHasLists && listItems.length > 3) {
        pageType = '要点总结';
        layoutStructure = '网格卡片布局';
        visualConcept = '要点卡片 + 图标设计';
        colorScheme = 'bg-yellow-50 with accent colors';
        icon = '✅';
        contentHighlights = ['要点卡片化', '图标化展示', '层次化信息'];
      } else if (level === 1) {
        pageType = '概念介绍';
        layoutStructure = '图文并茂布局';
        visualConcept = '概念图解 + 详细说明';
        colorScheme = 'bg-blue-50 with concept highlights';
        icon = '💡';
        contentHighlights = ['概念可视化', '图解说明', '知识结构化'];
      }
      
      // Extract key content elements
      const keyPoints = sectionContent.split('\n').filter(line => 
        line.startsWith('-') || line.startsWith('*') || /^\d+\./.test(line)
      ).slice(0, 3).map(point => point.replace(/^[-*\d.]\s*/, ''));
      
      if (keyPoints.length > 0) {
        contentHighlights = [...contentHighlights, ...keyPoints.map(point => point.slice(0, 30) + '...')];
      }
      
      const blueprint = `信息图：${index + 1}/${headers.length}
- 页面类型：${pageType}
- 页面标题：${title}
- 核心内容与视觉构思：
  布局：${layoutStructure}
  主要元素：
    - 构思：${colorScheme}
    - 标题：${title} + 图标 ${icon}
    - 视觉概念：${visualConcept}
  内容重点：
${contentHighlights.slice(0, 4).map(highlight => `    - ${highlight}`).join('\n')}
  交互设计：
    - 响应式布局适配
    - 渐进式内容加载
    - 用户友好的导航体验`;
      
      blueprintPages.push(blueprint);
    });
  } else {
    // Analyze content without headers
    let pageType = '综合内容展示';
    let icon = '📋';
    let layoutStructure = '标准文档布局';
    let visualConcept = '信息整理展示';
    let colorScheme = 'bg-white with clean typography';
    
    if (hasComparison) {
      pageType = '对比分析';
      icon = '⚖️';
      layoutStructure = '对比分析布局';
      visualConcept = '对比表格 + 关键差异';
      colorScheme = 'bg-blue-50 with comparison highlights';
    } else if (hasDataNumbers) {
      pageType = '数据报告';
      icon = '📊';
      layoutStructure = '数据展示布局';
      visualConcept = '数据可视化 + 分析洞察';
      colorScheme = 'bg-gray-50 with data visualization';
    } else if (listItems.length > 5) {
      pageType = '清单总结';
      icon = '📝';
      layoutStructure = '列表展示布局';
      visualConcept = '清单化展示 + 优先级';
      colorScheme = 'bg-green-50 with checklist design';
    }
    
    const keyContentElements = [
      `总计 ${listItems.length} 个要点`,
      `包含 ${links.length} 个外部链接`,
      codeBlocks.length > 0 ? `${codeBlocks.length} 个代码示例` : '纯文本内容',
      hasDataNumbers ? '包含数据统计' : '定性分析内容'
    ];
    
    blueprintPages.push(`信息图：1/1
- 页面类型：${pageType}
- 页面标题：AI 响应分析
- 核心内容与视觉构思：
  布局：${layoutStructure}
  主要元素：
    - 构思：${colorScheme}
    - 标题：AI 响应分析 + 图标 ${icon}
    - 视觉概念：${visualConcept}
  内容特征：
${keyContentElements.map(element => `    - ${element}`).join('\n')}
  设计重点：
    - 信息层次化展示
    - 关键内容突出
    - 易读性优化`);
  }
  
  return `🎯 设计蓝图生成

原子设计师 · 大纲：

${blueprintPages.join('\n\n')}

---
💡 设计说明：
- 基于内容结构智能分析
- 采用适配性视觉设计方案  
- 注重信息层次与用户体验
- 响应式设计适配多设备
- 内容驱动的交互设计`;
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
      setBlueprint(`🎯 设计蓝图生成

原子设计师 · 大纲：

信息图：1/1
- 页面类型：内容展示
- 页面标题：AI 响应内容
- 核心内容与视觉构思：
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
