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
  const sections: string[] = [];
  let currentSection = '';
  let pageCount = 1;
  
  // Analyze content structure
  const headers = lines.filter(line => line.startsWith('#'));
  const totalPages = Math.max(headers.length, 3);
  
  let blueprintPages: string[] = [];
  
  headers.forEach((header, index) => {
    const level = (header.match(/^#+/) || [''])[0].length;
    const title = header.replace(/^#+\s*/, '');
    
    // Determine page type based on content
    let pageType = '信息展示';
    if (title.includes('对比') || title.includes('比较') || title.includes('vs')) {
      pageType = '核心要点对比';
    } else if (title.includes('步骤') || title.includes('流程') || title.includes('方法')) {
      pageType = '流程指南';
    } else if (title.includes('总结') || title.includes('结论')) {
      pageType = '总结要点';
    } else if (title.includes('介绍') || title.includes('概述')) {
      pageType = '概念介绍';
    }
    
    // Generate visual concepts based on content type
    let visualConcept = '';
    let layoutStructure = '';
    let colorScheme = '';
    
    if (pageType === '核心要点对比') {
      layoutStructure = '左右对比结构';
      visualConcept = '对比卡片设计';
      colorScheme = 'bg-blue-100 vs bg-green-100';
    } else if (pageType === '流程指南') {
      layoutStructure = '垂直流程结构';
      visualConcept = '步骤卡片 + 连接线';
      colorScheme = 'bg-gradient-to-r from-blue-50 to-indigo-100';
    } else if (pageType === '总结要点') {
      layoutStructure = '网格布局';
      visualConcept = '要点图标 + 简洁文字';
      colorScheme = 'bg-gray-50 with accent colors';
    } else {
      layoutStructure = '标准内容布局';
      visualConcept = '图文混排';
      colorScheme = 'bg-white with subtle shadows';
    }
    
    // Select appropriate icon
    let icon = '📄';
    if (pageType === '核心要点对比') icon = '⚖️';
    else if (pageType === '流程指南') icon = '🔄';
    else if (pageType === '总结要点') icon = '✅';
    else if (pageType === '概念介绍') icon = '💡';
    
    const blueprint = `信息图：${index + 1}/${totalPages}
- 页面类型：${pageType}
- 页面标题：${title}
- 核心内容与视觉构思：
  布局：${layoutStructure}
  主要元素：
    - 构思：${colorScheme}
    - 标题：${title} + 图标 ${icon}
    - 视觉概念：${visualConcept}
  内容重点：
    - 核心信息提取与层次化展示
    - 视觉引导与用户体验优化`;
    
    blueprintPages.push(blueprint);
  });
  
  // If no headers found, create a general blueprint
  if (blueprintPages.length === 0) {
    blueprintPages.push(`信息图：1/1
- 页面类型：综合内容展示
- 页面标题：AI 生成内容
- 核心内容与视觉构思：
  布局：标准文档布局
  主要元素：
    - 构思：bg-white with clean typography
    - 标题：内容概览 + 图标 📋
    - 视觉概念：简洁文档设计
  内容重点：
    - 信息清晰呈现
    - 易读性优化`);
  }
  
  return `🎯 设计蓝图生成

原子设计师 · 大纲：

${blueprintPages.join('\n\n')}

---
💡 设计说明：
- 采用渐进式信息展示
- 注重视觉层次与用户体验
- 配色方案支持品牌一致性
- 响应式设计适配多设备`;
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
    const generatedBlueprint = generateBlueprint(messageContent);
    setBlueprint(generatedBlueprint);
    setShowBlueprint(true);
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
      
      {showBlueprint && (
        <div className="mb-4 p-4 bg-neutral-900 rounded-lg border border-neutral-600">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-blue-400">🎯 设计蓝图</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowBlueprint(false)}
              className="text-neutral-400 hover:text-neutral-200"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-sm text-neutral-300 whitespace-pre-line font-mono">
            {blueprint}
          </div>
        </div>
      )}
      
      <ReactMarkdown components={mdComponents}>
        {messageContent}
      </ReactMarkdown>
      
      <div className="flex gap-2 self-end mt-2">
        <Button
          variant="default"
          className={`cursor-pointer bg-neutral-700 border-neutral-600 text-neutral-300 ${
            message.content.length > 0 ? "visible" : "hidden"
          }`}
          onClick={() => handleCopy(messageContent, message.id!)}
        >
          {copiedMessageId === message.id ? "Copied" : "Copy"}
          {copiedMessageId === message.id ? <CopyCheck /> : <Copy />}
        </Button>
        
        <Button
          variant="default"
          className={`cursor-pointer bg-neutral-700 border-neutral-600 text-neutral-300 ${
            message.content.length > 0 ? "visible" : "hidden"
          }`}
          onClick={handleGenerateBlueprint}
        >
          Blueprint
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
