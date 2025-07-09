import { useStream } from "@langchain/langgraph-sdk/react";
import type { Message } from "@langchain/langgraph-sdk";
import { useState, useEffect, useRef, useCallback } from "react";
import { ProcessedEvent } from "@/components/ActivityTimeline";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { ChatMessagesView } from "@/components/ChatMessagesView";
import { Button } from "@/components/ui/button";

// Add saveToFile function
const saveToFile = (content: string, filename: string, format: 'txt' | 'md' = 'md') => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const extension = format;
  const fullFilename = `${filename}_${timestamp}.${extension}`;
  
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fullFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Add design blueprint generation function
const generateDesignBlueprint = (content: string, userQuestion: string): string => {
  // Parse content to identify main sections
  const lines = content.split('\n').filter(line => line.trim());
  const sections = [];
  let currentSection = { title: '', content: '', level: 0 };
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Detect headers
    if (trimmedLine.startsWith('#')) {
      if (currentSection.title) {
        sections.push({ ...currentSection });
      }
      const level = (trimmedLine.match(/^#+/) || [''])[0].length;
      currentSection = {
        title: trimmedLine.replace(/^#+\s*/, ''),
        content: '',
        level
      };
    } else if (trimmedLine) {
      currentSection.content += trimmedLine + '\n';
    }
  }
  
  if (currentSection.title) {
    sections.push(currentSection);
  }

  // Generate blueprint based on content analysis
  const blueprint = `# 🎯 设计施工图 - ${userQuestion.slice(0, 30)}...

## 📊 内容分析
- **总页数**: ${Math.max(sections.length, 3)}页
- **内容类型**: ${analyzeContentType(content)}
- **视觉风格**: 现代简约信息图表风格
- **色彩方案**: 蓝绿渐进色系

---

${sections.map((section, index) => generatePageBlueprint(section, index + 1, sections.length)).join('\n\n---\n\n')}

---

## 🎨 全局设计规范
- **字体**: 思源黑体 / Inter
- **主色调**: #3B82F6 (蓝色), #10B981 (绿色), #8B5CF6 (紫色)
- **辅助色**: #F3F4F6 (浅灰), #1F2937 (深灰)
- **圆角**: 8px-16px
- **阴影**: shadow-lg (0 10px 15px -3px rgba(0, 0, 0, 0.1))
- **间距**: 4的倍数系统 (16px, 24px, 32px)

## 📱 响应式要求
- **桌面**: 1200px+ 三栏布局
- **平板**: 768px-1199px 两栏布局  
- **手机**: <768px 单栏堆叠
`;

  return blueprint;
};

const analyzeContentType = (content: string): string => {
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('比较') || lowerContent.includes('对比') || lowerContent.includes('vs')) {
    return '对比分析图表';
  } else if (lowerContent.includes('步骤') || lowerContent.includes('流程') || lowerContent.includes('过程')) {
    return '流程指导图表';
  } else if (lowerContent.includes('数据') || lowerContent.includes('统计') || lowerContent.includes('%')) {
    return '数据可视化图表';
  } else if (lowerContent.includes('方法') || lowerContent.includes('技巧') || lowerContent.includes('如何')) {
    return '方法指导图表';
  }
  return '综合信息图表';
};

const generatePageBlueprint = (section: any, pageNum: number, totalPages: number): string => {
  const icons = ['📊', '🔍', '⚡', '🎯', '💡', '🛠', '📈', '🎨', '🚀'];
  const bgColors = ['bg-blue-100', 'bg-green-100', 'bg-purple-100', 'bg-yellow-100', 'bg-pink-100'];
  const layouts = ['上下分割', '左右分割', '卡片网格', '时间轴', '中心辐射'];
  
  const selectedIcon = icons[pageNum % icons.length];
  const selectedBg = bgColors[pageNum % bgColors.length];
  const selectedLayout = layouts[pageNum % layouts.length];
  
  // Determine page type based on content
  let pageType = '信息展示页';
  if (section.content.includes('步骤') || section.content.includes('方法')) {
    pageType = '操作指导页';
  } else if (section.content.includes('优势') || section.content.includes('缺点')) {
    pageType = '优劣对比页';
  } else if (section.content.includes('数据') || section.content.includes('结果')) {
    pageType = '数据展示页';
  }

  return `## 信息图：${pageNum}/${totalPages}
- **页面类型**: ${pageType}
- **页面标题**: ${section.title} ${selectedIcon}
- **核心内容与视觉构思**:
  
  **布局方案**: ${selectedLayout}
  
  **主要区域**:
  - 构思：${selectedBg} 圆角卡片容器
  - 标题区：大字号标题 + 装饰图标 ${selectedIcon}
  - 内容区：${section.content.slice(0, 50)}...
  
  **交互元素**:
  - 悬停效果：shadow-lg + scale-105
  - 渐变边框：border-gradient-to-r
  - 动画：fade-in-up 延迟 ${pageNum * 100}ms
  
  **视觉层次**:
  - 主标题：text-2xl font-bold text-gray-900
  - 副标题：text-lg font-medium text-gray-700  
  - 正文：text-base text-gray-600 leading-relaxed
  - 强调：text-blue-600 font-semibold`;
};

export default function App() {
  const [processedEventsTimeline, setProcessedEventsTimeline] = useState<
    ProcessedEvent[]
  >([]);
  const [historicalActivities, setHistoricalActivities] = useState<
    Record<string, ProcessedEvent[]>
  >({});
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const hasFinalizeEventOccurredRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const thread = useStream<{
    messages: Message[];
    initial_search_query_count: number;
    max_research_loops: number;
    reasoning_model: string;
  }>({
    apiUrl: import.meta.env.DEV
      ? "http://localhost:2024"
      : "http://localhost:8123",
    assistantId: "agent",
    messagesKey: "messages",
    onUpdateEvent: (event: any) => {
      let processedEvent: ProcessedEvent | null = null;
      if (event.generate_query) {
        processedEvent = {
          title: "Generating Search Queries",
          data: event.generate_query?.search_query?.join(", ") || "",
        };
      } else if (event.web_research) {
        const sources = event.web_research.sources_gathered || [];
        const numSources = sources.length;
        const uniqueLabels = [
          ...new Set(sources.map((s: any) => s.label).filter(Boolean)),
        ];
        const exampleLabels = uniqueLabels.slice(0, 3).join(", ");
        processedEvent = {
          title: "Web Research",
          data: `Gathered ${numSources} sources. Related to: ${
            exampleLabels || "N/A"
          }.`,
        };
      } else if (event.reflection) {
        processedEvent = {
          title: "Reflection",
          data: "Analysing Web Research Results",
        };
      } else if (event.finalize_answer) {
        processedEvent = {
          title: "Finalizing Answer",
          data: "Composing and presenting the final answer.",
        };
        hasFinalizeEventOccurredRef.current = true;
      }
      if (processedEvent) {
        setProcessedEventsTimeline((prevEvents) => [
          ...prevEvents,
          processedEvent!,
        ]);
      }
    },
    onError: (error: any) => {
      setError(error.message);
    },
  });

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  }, [thread.messages]);

  useEffect(() => {
    if (
      hasFinalizeEventOccurredRef.current &&
      !thread.isLoading &&
      thread.messages.length > 0
    ) {
      const lastMessage = thread.messages[thread.messages.length - 1];
      if (lastMessage && lastMessage.type === "ai" && lastMessage.id) {
        setHistoricalActivities((prev) => ({
          ...prev,
          [lastMessage.id!]: [...processedEventsTimeline],
        }));

        // Automatically save the AI response to file with design blueprint
        try {
          const messageContent = typeof lastMessage.content === "string"
            ? lastMessage.content
            : JSON.stringify(lastMessage.content);

          // Find the user's question for filename
          const messageIndex = thread.messages.findIndex(msg => msg.id === lastMessage.id);
          const previousMessage = messageIndex > 0 ? thread.messages[messageIndex - 1] : null;
          const userQuestion = previousMessage && previousMessage.type === "human" 
            ? (typeof previousMessage.content === "string" ? previousMessage.content : "query")
            : "ai_response";
          
          // Create a safe filename from the user question
          const safeFilename = userQuestion
            .slice(0, 50)
            .replace(/[^a-zA-Z0-9\s]/g, '')
            .replace(/\s+/g, '_')
            .toLowerCase() || 'ai_response';
          
          // Save original markdown file
          saveToFile(messageContent, safeFilename, 'md');
          
          // Generate and save design blueprint
          const blueprint = generateDesignBlueprint(messageContent, userQuestion);
          saveToFile(blueprint, `${safeFilename}_设计施工图`, 'md');
          
          console.log(`Response automatically saved as: ${safeFilename}_${new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]}.md`);
          console.log(`Design blueprint saved as: ${safeFilename}_设计施工图_${new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]}.md`);
        } catch (err) {
          console.error("Failed to auto-save response: ", err);
        }
      }
      hasFinalizeEventOccurredRef.current = false;
    }
  }, [thread.messages, thread.isLoading, processedEventsTimeline]);

  const handleSubmit = useCallback(
    (submittedInputValue: string, effort: string, model: string) => {
      if (!submittedInputValue.trim()) return;
      setProcessedEventsTimeline([]);
      hasFinalizeEventOccurredRef.current = false;

      // convert effort to, initial_search_query_count and max_research_loops
      // low means max 1 loop and 1 query
      // medium means max 3 loops and 3 queries
      // high means max 10 loops and 5 queries
      let initial_search_query_count = 0;
      let max_research_loops = 0;
      switch (effort) {
        case "low":
          initial_search_query_count = 1;
          max_research_loops = 1;
          break;
        case "medium":
          initial_search_query_count = 3;
          max_research_loops = 3;
          break;
        case "high":
          initial_search_query_count = 5;
          max_research_loops = 10;
          break;
      }

      const newMessages: Message[] = [
        ...(thread.messages || []),
        {
          type: "human",
          content: submittedInputValue,
          id: Date.now().toString(),
        },
      ];
      thread.submit({
        messages: newMessages,
        initial_search_query_count: initial_search_query_count,
        max_research_loops: max_research_loops,
        reasoning_model: model,
      });
    },
    [thread]
  );

  const handleCancel = useCallback(() => {
    thread.stop();
    window.location.reload();
  }, [thread]);

  return (
    <div className="flex h-screen bg-neutral-800 text-neutral-100 font-sans antialiased">
      <main className="h-full w-full max-w-4xl mx-auto">
          {thread.messages.length === 0 ? (
            <WelcomeScreen
              handleSubmit={handleSubmit}
              isLoading={thread.isLoading}
              onCancel={handleCancel}
            />
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="flex flex-col items-center justify-center gap-4">
                <h1 className="text-2xl text-red-400 font-bold">Error</h1>
                <p className="text-red-400">{JSON.stringify(error)}</p>

                <Button
                  variant="destructive"
                  onClick={() => window.location.reload()}
                >
                  Retry
                </Button>
              </div>
            </div>
          ) : (
            <ChatMessagesView
              messages={thread.messages}
              isLoading={thread.isLoading}
              scrollAreaRef={scrollAreaRef}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              liveActivityEvents={processedEventsTimeline}
              historicalActivities={historicalActivities}
            />
          )}
      </main>
    </div>
  );
}
