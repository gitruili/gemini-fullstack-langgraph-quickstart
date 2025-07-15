import type React from "react";
import type { Message } from "@langchain/langgraph-sdk";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Copy, CopyCheck, FileText, X, Code, ExternalLink } from "lucide-react";
import { InputForm } from "@/components/InputForm";
import { Button } from "@/components/ui/button";
import { useState, ReactNode, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  ActivityTimeline,
  ProcessedEvent,
} from "@/components/ActivityTimeline"; // Assuming ActivityTimeline is in the same dir or adjust path
import { BlueprintResult, generateBlueprint } from '@/lib/blueprintGenerator';
import { generateHTML, generateFallbackHTML } from '@/lib/htmlGenerator';
import { generatePNG, auditAndFixPNG, PngGenerationCallbacks, PngAuditCallbacks, PngAdditionalContent } from '@/lib/pngGenerator';
import { extractAIResponseContent } from '@/App';

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
  messages: Message[];
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
  messages,
}) => {
  const [generatedBlueprint, setGeneratedBlueprint] = useState<BlueprintResult | null>(null);
  const [generatedHTML, setGeneratedHTML] = useState<string | null>(null);
  const [isGeneratingPNG, setIsGeneratingPNG] = useState(false);
  const [pngError, setPngError] = useState<string | null>(null);
  const [generatedPNGs, setGeneratedPNGs] = useState<string[]>([]);
  const [isAuditingPNG, setIsAuditingPNG] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  
  // UI state variables
  const [showBlueprint, setShowBlueprint] = useState(false);
  const [showXiaohongshu, setShowXiaohongshu] = useState(false);
  const [showHTML, setShowHTML] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [hasAutoGenerated, setHasAutoGenerated] = useState(false);
  const [hasAutoGeneratedHTML, setHasAutoGeneratedHTML] = useState(false);
  const [hasAutoGeneratedPNG, setHasAutoGeneratedPNG] = useState(false);

  // Determine which activity events to show and if it's for a live loading message
  const activityForThisBubble =
    isLastMessage && isOverallLoading ? liveActivity : historicalActivity;
  const isLiveActivityForThisBubble = isLastMessage && isOverallLoading;

  const messageContent = typeof message.content === "string"
    ? message.content
    : JSON.stringify(message.content);

  // Auto-generate blueprint when AI response is completed and this is the last message
  useEffect(() => {
    if (isLastMessage && !isOverallLoading && !hasAutoGenerated && messageContent.length > 0) {
      console.log('Auto-generating blueprint for AI response...');
      setHasAutoGenerated(true);
      handleGenerateBlueprint(true);
    }
  }, [isLastMessage, isOverallLoading, hasAutoGenerated, messageContent]);

  const handleGenerateBlueprint = async (isAutoGenerated = false) => {
    console.log(isAutoGenerated ? 'Auto-generating blueprint...' : 'Blueprint button clicked!');
    try {
      const generatedBlueprint = await generateBlueprint(messageContent);
      console.log('Generated blueprint:', generatedBlueprint);
      setGeneratedBlueprint(generatedBlueprint);
      setShowBlueprint(true);
      setShowXiaohongshu(true);
      console.log('Blueprint state updated, showBlueprint:', true);
      
      // Auto-generate HTML after blueprint is generated (only for auto-generated blueprints)
      if (isAutoGenerated && !hasAutoGeneratedHTML) {
        console.log('Auto-generating HTML after blueprint completion...');
        setHasAutoGeneratedHTML(true);
        await handleGenerateHTML(generatedBlueprint, true);
      }
    } catch (error) {
      console.error('Error generating blueprint:', error);
      // Use fallback blueprint directly
      const fallbackBlueprint = {
        blueprint: `信息图 1 / 3
页面类型：封面页面（Hero Page）
页面标题：${messageContent.slice(0, 30)}
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
色彩：重点内容 bg-yellow-50 突出`,
        xiaohongshu: {
          titles: [
            `🚀 ${messageContent.slice(0, 20)}...超详细解析！`,
            `📊 一看就懂的${messageContent.slice(0, 15)}攻略`,
            `💡 ${messageContent.slice(0, 18)}干货分享`
          ],
          content: `今天给大家分享一个超实用的内容！✨

📋 核心要点：
• 内容清晰易懂
• 实用性强
• 适合收藏学习

💡 建议大家：
收藏起来慢慢看，对你一定有帮助！

#干货分享 #学习笔记 #实用技巧 #知识分享 #效率提升 #生活技能 #经验总结 #必看推荐 #涨知识`
        }
      };
      setGeneratedBlueprint(fallbackBlueprint);
      setShowBlueprint(true);
      setShowXiaohongshu(true);
    }
  };

  const handleGenerateHTML = async (providedBlueprint?: BlueprintResult, isAutoGenerated = false) => {
    console.log(isAutoGenerated ? 'Auto-generating HTML...' : 'HTML generation triggered...');
    try {
      let blueprintToUse = providedBlueprint || generatedBlueprint;
      
      // If no blueprint exists, generate one first
      if (!blueprintToUse) {
        console.log('No existing blueprint, generating new one...');
        blueprintToUse = await generateBlueprint(messageContent);
        setGeneratedBlueprint(blueprintToUse);
      } else {
        console.log('Using existing blueprint');
      }
      
      console.log('Generating HTML with blueprint...');
      const generatedHTML = await generateHTML(blueprintToUse.blueprint);
      console.log('Generated HTML:', generatedHTML);
      setGeneratedHTML(generatedHTML);
      setShowHTML(true);
      console.log('HTML state updated, showHTML:', true);
      
      // Auto-generate PNG after HTML is generated (only for auto-generated HTML)
      if (isAutoGenerated && !hasAutoGeneratedPNG) {
        console.log('Auto-generating PNG after HTML completion...');
        setHasAutoGeneratedPNG(true);
        await handleGeneratePNG(generatedHTML, blueprintToUse);
      }
    } catch (error) {
      console.error('Error generating HTML:', error);
      // Fallback HTML
      const fallbackHTML = generateFallbackHTML(messageContent);
      setGeneratedHTML(fallbackHTML);
      setShowHTML(true);
      
      // Auto-generate PNG even with fallback HTML if it's auto-generated
      if (isAutoGenerated && !hasAutoGeneratedPNG) {
        console.log('Auto-generating PNG with fallback HTML...');
        setHasAutoGeneratedPNG(true);
        await handleGeneratePNG(fallbackHTML, providedBlueprint || generatedBlueprint || undefined);
      }
    }
  };

  // Wrapper function for button click to maintain correct event handler type
  const handleBlueprintButtonClick = () => {
    handleGenerateBlueprint(false);
  };

  const handleHTMLButtonClick = () => {
    handleGenerateHTML();
  };

  const handleGeneratePNG = async (providedHTML?: string, providedBlueprint?: BlueprintResult) => {
    const callbacks: PngGenerationCallbacks = {
      setIsGeneratingPNG,
      setPngError,
      setGeneratedPNGs
    };
    
    // Use provided HTML or fall back to generated HTML
    const htmlToUse = providedHTML || generatedHTML || '';
    const blueprintToUse = providedBlueprint || generatedBlueprint;
    
    // Extract AI response content and user question
    const { aiResponse, userQuestion } = extractAIResponseContent(messages);
    
    // Extract Xiaohongshu content
    let xiaohongshuTitle = '';
    let xiaohongshuBody = '';
    
    if (blueprintToUse?.xiaohongshu) {
      // Use the first title from the titles array
      xiaohongshuTitle = blueprintToUse.xiaohongshu.titles.length > 0 
        ? blueprintToUse.xiaohongshu.titles[0] 
        : '';
      xiaohongshuBody = blueprintToUse.xiaohongshu.content || '';
    }
    
    // Create additional content object
    const additionalContent: PngAdditionalContent = {
      aiResponseContent: aiResponse,
      xiaohongshuTitle,
      xiaohongshuBody,
      userQuestion
    };
    
    await generatePNG(htmlToUse, callbacks, additionalContent);
  };

  // Wrapper function for button click to maintain correct event handler type
  const handlePNGButtonClick = () => {
    handleGeneratePNG();
  };

  const handleAuditAndFixPNG = async () => {
    const callbacks: PngAuditCallbacks = {
      setIsAuditingPNG,
      setAuditError,
      setGeneratedHTML
    };
    
    await auditAndFixPNG(generatedHTML || '', generatedPNGs, callbacks);
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
      
      <div className="flex gap-2 mt-4 mb-2">
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
          onClick={handleBlueprintButtonClick}
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
          onClick={handleHTMLButtonClick}
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
          onClick={handlePNGButtonClick}
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
                      messages={messages}
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
