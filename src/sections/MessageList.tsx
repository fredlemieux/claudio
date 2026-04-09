import { useEffect, useRef, useCallback } from "react";
import { SIDEBAR_MARGIN, DRAWER_MARGIN } from "../layout";
import { MessageContent } from "../components/MessageContent";
import { StepRenderer } from "../components/StepRenderer";
import { InlineEditDiffs } from "../components/InlineEditDiffs";
import { ToolUseIndicator } from "../components/ToolUseIndicator";
import { ThoughtStream } from "../components/ThoughtStream";
import { SelectionPrompt } from "../components/SelectionPrompt";
import type { ToolCall, AlgorithmPhase, UserQuestion } from "../types";
import type { Message } from "../types";

interface MessageListProps {
  messages: Message[];
  isStreaming: boolean;
  toolCalls: ToolCall[];
  sidebarOpen: boolean;
  drawerOpen: boolean;
  algoPhases: AlgorithmPhase[];
  activeQuestion: UserQuestion | null;
  onAnswerQuestion: (answer: string) => void;
  onCancelQuestion: () => void;
  onSendMessage: (text: string) => void;
}

function MessageAvatar({ role }: { role: "user" | "assistant" }) {
  const isUser = role === "user";
  return (
    <div
      className={`w-8 h-8 rounded-[10px] flex items-center justify-center text-[13px] font-bold shrink-0 mt-0.5 ${
        isUser
          ? "bg-gradient-to-br from-blue-600 to-blue-500 text-white"
          : "bg-gradient-to-br from-purple-600 to-purple-500 text-white"
      }`}
    >
      {isUser ? "F" : "G"}
    </div>
  );
}

function MessageName({ role, timestamp }: { role: "user" | "assistant"; timestamp?: number }) {
  const isUser = role === "user";
  return (
    <div className="flex items-center gap-2 mb-1">
      <span className={`text-xs font-semibold ${isUser ? "text-blue-400" : "text-purple-400"}`}>
        {isUser ? "Fred" : "Greg"}
      </span>
      {timestamp && (
        <span className="text-[10px] text-text-tertiary">
          {new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      )}
    </div>
  );
}

export function MessageList({ messages, isStreaming, toolCalls, sidebarOpen, drawerOpen, algoPhases, activeQuestion, onAnswerQuestion, onCancelQuestion, onSendMessage }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSelect = useCallback((answer: string) => {
    if (activeQuestion && !activeQuestion.answered) {
      onAnswerQuestion(answer);
    }
    onSendMessage(`The user selected: "${answer}"`);
  }, [activeQuestion, onAnswerQuestion, onSendMessage]);

  return (
    <div className={`flex-1 overflow-y-auto py-6 transition-all ${sidebarOpen ? SIDEBAR_MARGIN : ""} ${drawerOpen ? DRAWER_MARGIN : ""}`}>
      <div className="max-w-[720px] mx-auto px-5 space-y-1">
        {messages.map((msg, index) => {
          const isLastAssistant = msg.role === "assistant" && index === messages.length - 1;
          const isStreamingThis = isLastAssistant && isStreaming;
          const prevMsg = index > 0 ? messages[index - 1] : null;
          const showSeparator = prevMsg && prevMsg.role !== msg.role;

          return (
            <div key={msg.id}>
              {/* Turn separator */}
              {showSeparator && (
                <div className="h-px bg-border/50 my-2 ml-10" />
              )}

              {/* Thought stream — shown before the assistant message that's streaming */}
              {isStreamingThis && msg.steps && msg.steps.length > 0 && (
                <div className="ml-10 mb-2">
                  <ThoughtStream
                    steps={msg.steps}
                    phases={algoPhases}
                    isStreaming={isStreaming}
                  />
                </div>
              )}

              {/* Message */}
              <div className="flex items-start gap-3 py-2 animate-fade-in-up">
                <MessageAvatar role={msg.role} />

                <div className="flex-1 min-w-0">
                  <MessageName role={msg.role} timestamp={msg.timestamp} />

                  {/* Message body */}
                  <div className="text-sm leading-relaxed">
                    {msg.role === "assistant" && !msg.content && isStreamingThis ? (
                      <div className="flex items-center gap-1 py-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    ) : (
                      <div className={isStreamingThis ? "streaming-active" : ""}>
                        <MessageContent content={msg.content} role={msg.role} />
                      </div>
                    )}
                  </div>

                  {/* Tool use indicator */}
                  {isStreamingThis && toolCalls.length > 0 && (
                    <ToolUseIndicator tools={toolCalls} />
                  )}

                  {/* Selection prompt — shown on the last assistant message when a question is detected */}
                  {isLastAssistant && !isStreaming && activeQuestion && !activeQuestion.answered && activeQuestion.options.length > 0 && (
                    <SelectionPrompt
                      question={activeQuestion}
                      onSelect={handleSelect}
                      onCancel={onCancelQuestion}
                    />
                  )}

                  {/* Inline edit diffs — shown below response, above steps panel */}
                  {msg.role === "assistant" && msg.steps && msg.steps.length > 0 && (
                    <InlineEditDiffs steps={msg.steps} isStreaming={isStreamingThis} />
                  )}

                  {/* Steps (collapsed debug view) — always available for introspection */}
                  {msg.role === "assistant" && msg.steps && msg.steps.length > 0 && (
                    <StepRenderer steps={msg.steps} isStreaming={isStreamingThis} />
                  )}

                  {/* Meta (duration, cost) */}
                  {msg.role === "assistant" && !isStreamingThis && (msg.durationMs || msg.costUsd !== undefined) && (
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-text-tertiary">
                      {msg.durationMs && <span>{(msg.durationMs / 1000).toFixed(1)}s</span>}
                      {msg.costUsd !== undefined && <span>${msg.costUsd.toFixed(4)}</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
