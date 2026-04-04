import { useEffect, useRef, useCallback } from "react";
import { MessageContent } from "../components/MessageContent";
import { ToolUseIndicator, type ToolCall } from "../components/ToolUseIndicator";
import type { Message } from "../types";

interface MessageListProps {
  messages: Message[];
  isStreaming: boolean;
  toolCalls: ToolCall[];
  sidebarOpen: boolean;
  drawerOpen: boolean;
}

export function MessageList({ messages, isStreaming, toolCalls, sidebarOpen, drawerOpen }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  return (
    <div className={`flex-1 overflow-y-auto px-4 py-6 space-y-4 transition-all ${sidebarOpen ? "ml-[260px]" : ""} ${drawerOpen ? "mr-[340px]" : ""}`}>
      {messages.map((msg, index) => (
        <div
          key={msg.id}
          className={`flex flex-col animate-fade-in-up ${
            msg.role === "user" ? "items-end" : "items-start"
          }`}
        >
          <div
            className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === "user"
                ? "bg-blue-600 text-white"
                : "bg-[#16162a] text-[#e2e8f0] border border-[#1e1e3a]"
            }`}
          >
            {msg.role === "assistant" && !msg.content && isStreaming ? (
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            ) : (
              <MessageContent content={msg.content} role={msg.role} />
            )}
            {msg.role === "assistant" && isStreaming && index === messages.length - 1 && toolCalls.length > 0 && (
              <ToolUseIndicator tools={toolCalls} />
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 px-1 text-[10px] text-[#334155]">
            {msg.timestamp && (
              <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            )}
            {msg.role === "assistant" && msg.durationMs && (
              <span>{(msg.durationMs / 1000).toFixed(1)}s</span>
            )}
            {msg.role === "assistant" && msg.costUsd !== undefined && (
              <span>${msg.costUsd.toFixed(4)}</span>
            )}
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
