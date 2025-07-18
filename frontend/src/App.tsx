import { useStream } from "@langchain/langgraph-sdk/react";
import type { Message } from "@langchain/langgraph-sdk";
import { useState, useEffect, useRef, useCallback } from "react";
import { ProcessedEvent } from "@/components/ActivityTimeline";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { ChatMessagesView } from "@/components/ChatMessagesView";
import { Button } from "@/components/ui/button";



// Function to extract AI response content for MD file
export const extractAIResponseContent = (messages: Message[]): { aiResponse: string; userQuestion: string } => {
  if (messages.length === 0) {
    return { aiResponse: '', userQuestion: '' };
  }
  
  const lastMessage = messages[messages.length - 1];
  const aiResponse = lastMessage && lastMessage.type === "ai" 
    ? (typeof lastMessage.content === "string" ? lastMessage.content : JSON.stringify(lastMessage.content))
    : '';
  
  // Find the user's question for filename
  const messageIndex = messages.findIndex(msg => msg.id === lastMessage?.id);
  const previousMessage = messageIndex > 0 ? messages[messageIndex - 1] : null;
  const userQuestion = previousMessage && previousMessage.type === "human" 
    ? (typeof previousMessage.content === "string" ? previousMessage.content : "query")
    : "ai_response";
  
  return { aiResponse, userQuestion };
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

        // Automatically save the AI response to file
        // try {
        //   const messageContent = typeof lastMessage.content === "string"
        //     ? lastMessage.content
        //     : JSON.stringify(lastMessage.content);

        //   // Find the user's question for filename
        //   const messageIndex = thread.messages.findIndex(msg => msg.id === lastMessage.id);
        //   const previousMessage = messageIndex > 0 ? thread.messages[messageIndex - 1] : null;
        //   const userQuestion = previousMessage && previousMessage.type === "human" 
        //     ? (typeof previousMessage.content === "string" ? previousMessage.content : "query")
        //     : "ai_response";
          
        //   // Create a safe filename from the user question
        //   const safeFilename = userQuestion
        //     .slice(0, 50)
        //     .replace(/[^a-zA-Z0-9\s]/g, '')
        //     .replace(/\s+/g, '_')
        //     .toLowerCase() || 'ai_response';
          
        //   saveToFile(messageContent, safeFilename, 'md');
        //   console.log(`Response automatically saved as: ${safeFilename}_${new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]}.md`);
        // } catch (err) {
        //   console.error("Failed to auto-save response: ", err);
        // }
      }
      hasFinalizeEventOccurredRef.current = false;
    }
  }, [thread.messages, thread.isLoading, processedEventsTimeline]);

  const handleDirectModeProcessing = async (content: string) => {
    // Import the processing functions
    const { generateBlueprint } = await import('@/lib/blueprintGenerator');
    const { validateAndOptimizeContent, getOptimizedBlueprintResult } = await import('@/lib/contentValidator');
    const { generateHTML } = await import('@/lib/htmlGenerator');
    const { generatePNG } = await import('@/lib/pngGenerator');
    
    try {
      // Step 1: Generate blueprint from content
      setProcessedEventsTimeline([
        {
          title: "Direct Blueprint Generation",
          data: "Generating blueprint from provided text...",
        },
        {
          title: "Content Validation",
          data: "Optimizing content for platform compliance...",
        },
        {
          title: "HTML Generation",
          data: "Creating visual HTML representation...",
        },
        {
          title: "PNG Generation",
          data: "Converting HTML to downloadable PNG images...",
        }
      ]);

      console.log('Direct mode: Starting blueprint generation...');
      const blueprintResult = await generateBlueprint(content);
      console.log('Direct mode: Blueprint generated', blueprintResult);

      // Step 2: Validate and optimize content
      console.log('Direct mode: Validating content...');
      const validationResult = await validateAndOptimizeContent(blueprintResult);
      const optimizedBlueprint = getOptimizedBlueprintResult(validationResult);
      console.log('Direct mode: Content optimized', optimizedBlueprint);

      // Step 3: Generate HTML
      console.log('Direct mode: Generating HTML...');
      const generatedHTML = await generateHTML(optimizedBlueprint.blueprint);
      console.log('Direct mode: HTML generated', generatedHTML.length, 'characters');

      // Step 4: Generate PNG and ZIP
      console.log('Direct mode: Generating PNG...');
      const pngCallbacks = {
        setIsGeneratingPNG: (_loading: boolean) => {},
        setPngError: (_error: string | null) => {},
        setGeneratedPNGs: (_pngs: string[]) => {},
      };

      const additionalContent = {
        aiResponseContent: optimizedBlueprint.xiaohongshu.content,
        xiaohongshuTitle: optimizedBlueprint.xiaohongshu.titles[0] || '内容总结',
        xiaohongshuBody: optimizedBlueprint.xiaohongshu.content,
        userQuestion: content,
      };

      await generatePNG(generatedHTML, pngCallbacks, additionalContent);
      console.log('Direct mode: Processing completed');

    } catch (error) {
      console.error('Direct mode processing error:', error);
      setError(error instanceof Error ? error.message : 'Direct mode processing failed');
    } finally {
      setProcessedEventsTimeline([]);
    }
  };

  const handleSubmit = useCallback(
    (submittedInputValue: string, effort: string, model: string, mode: 'search' | 'direct' = 'search') => {
      if (!submittedInputValue.trim()) return;
      
      if (mode === 'direct') {
        // Direct mode: skip search, directly generate blueprint and follow-up content
        handleDirectModeProcessing(submittedInputValue);
        return;
      }

      // Search mode: existing LangGraph flow
      setProcessedEventsTimeline([]);
      hasFinalizeEventOccurredRef.current = false;

      // convert effort to, initial_search_query_count and max_research_loops
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
