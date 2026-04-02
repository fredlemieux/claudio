import { useState, useRef, useEffect, useCallback } from "react";
import { Command } from "@tauri-apps/plugin-shell";
import "./App.css";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };

    const assistantMsg: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setIsStreaming(true);

    try {
      const command = Command.create("claude", [
        "-p", trimmed,
        "--output-format", "stream-json",
        "--no-input",
      ]);

      let fullContent = "";

      command.stdout.on("data", (line: string) => {
        try {
          const event = JSON.parse(line);

          if (event.type === "assistant" && event.message?.content) {
            for (const block of event.message.content) {
              if (block.type === "text") {
                fullContent = block.text;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsg.id
                      ? { ...m, content: fullContent }
                      : m
                  )
                );
              }
            }
          }
        } catch {
          // Non-JSON line, ignore
        }
      });

      command.stderr.on("data", (line: string) => {
        console.error("claude stderr:", line);
      });

      const child = await command.spawn();

      // Wait for process to finish
      command.on("close", (data: { code: number }) => {
        console.log("claude exited with code:", data.code);
        setIsStreaming(false);
      });

      command.on("error", (error: string) => {
        console.error("claude error:", error);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? { ...m, content: `Error: ${error}` }
              : m
          )
        );
        setIsStreaming(false);
      });

      // Safety: if child reference needed later
      void child;
    } catch (err) {
      console.error("Failed to spawn claude:", err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsg.id
            ? { ...m, content: `Failed to start Claude: ${err}` }
            : m
        )
      );
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0a0a14]">
      {/* Title bar */}
      <div className="flex items-center h-12 px-4 bg-[#0e0e1a] border-b border-[#1e1e3a]">
        <span className="text-blue-400 font-semibold text-sm">Claudio</span>
        <span className="ml-2 text-[#475569] text-xs">M1</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h1 className="text-2xl font-semibold text-[#e2e8f0] mb-2">
                Claudio
              </h1>
              <p className="text-[#475569] text-sm">
                PAI-powered GUI for Claude Code
              </p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
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
                <span className="inline-block w-2 h-4 bg-blue-400 animate-pulse rounded-sm" />
              ) : (
                <pre className="whitespace-pre-wrap font-sans m-0">
                  {msg.content}
                </pre>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="px-4 pb-4 pt-2">
        <div className="flex items-center gap-2 bg-[#12121e] border border-[#1e1e3a] rounded-2xl px-4 py-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message Claudio..."
            rows={1}
            className="flex-1 bg-transparent text-[#e2e8f0] text-sm resize-none outline-none placeholder-[#475569] leading-normal"
            style={{ maxHeight: "120px" }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isStreaming}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-600 text-white disabled:opacity-30 hover:bg-blue-500 transition-colors shrink-0"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
            </svg>
          </button>
        </div>
        <div className="flex items-center justify-between mt-2 px-2">
          <span className="text-[#334155] text-xs">
            Enter to send · Shift+Enter for newline
          </span>
          {isStreaming && (
            <span className="text-blue-400 text-xs animate-pulse">
              Streaming...
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
