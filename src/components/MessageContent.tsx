import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import type { Components } from "react-markdown";

interface MessageContentProps {
  content: string;
  role: "user" | "assistant";
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-[#1e1e3a] text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#2a2a4a] transition-all opacity-0 group-hover:opacity-100"
      title="Copy code"
    >
      {copied ? (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 text-green-400">
            <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
          </svg>
          <span className="text-green-400">Copied</span>
        </>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
            <path d="M5.5 3.5A1.5 1.5 0 0 1 7 2h2.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 1 .439 1.061V9.5A1.5 1.5 0 0 1 12 11V8.621a3 3 0 0 0-.879-2.121L9 4.379A3 3 0 0 0 6.879 3.5H5.5Z" />
            <path d="M4 5a1.5 1.5 0 0 0-1.5 1.5v6A1.5 1.5 0 0 0 4 14h5a1.5 1.5 0 0 0 1.5-1.5V8.621a1.5 1.5 0 0 0-.44-1.06L7.94 5.439A1.5 1.5 0 0 0 6.878 5H4Z" />
          </svg>
          <span>Copy</span>
        </>
      )}
    </button>
  );
}

function extractTextContent(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (!node) return "";
  if (Array.isArray(node)) return node.map(extractTextContent).join("");
  if (typeof node === "object" && "props" in node) {
    const el = node as React.ReactElement<{ children?: React.ReactNode }>;
    return extractTextContent(el.props.children);
  }
  return "";
}

const components: Components = {
  pre({ children }) {
    const text = extractTextContent(children);
    return (
      <pre className="group relative bg-[#0a0a14] rounded-lg p-4 my-2 overflow-x-auto text-xs border border-[#1e1e3a]">
        <CopyButton text={text} />
        {children}
      </pre>
    );
  },
  code({ className, children, ...props }) {
    const isInline = !className;
    if (isInline) {
      return (
        <code
          className="bg-[#1a1a2e] text-blue-300 px-1.5 py-0.5 rounded text-xs"
          {...props}
        >
          {children}
        </code>
      );
    }
    const language = className?.replace("language-", "") || "";
    return (
      <div className="relative">
        {language && (
          <span className="absolute top-0 right-0 text-[10px] text-[#475569] bg-[#12121e] px-2 py-0.5 rounded-bl group-hover:right-16">
            {language}
          </span>
        )}
        <code className={className} {...props}>
          {children}
        </code>
      </div>
    );
  },
  h1({ children }) {
    return <h1 className="text-lg font-bold mt-4 mb-2">{children}</h1>;
  },
  h2({ children }) {
    return <h2 className="text-base font-bold mt-3 mb-2">{children}</h2>;
  },
  h3({ children }) {
    return <h3 className="text-sm font-bold mt-2 mb-1">{children}</h3>;
  },
  ul({ children }) {
    return <ul className="list-disc list-inside my-1 space-y-0.5">{children}</ul>;
  },
  ol({ children }) {
    return <ol className="list-decimal list-inside my-1 space-y-0.5">{children}</ol>;
  },
  li({ children }) {
    return <li className="text-sm">{children}</li>;
  },
  p({ children }) {
    return <p className="my-1.5">{children}</p>;
  },
  a({ href, children }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-400 hover:underline"
      >
        {children}
      </a>
    );
  },
  blockquote({ children }) {
    return (
      <blockquote className="border-l-2 border-blue-500 pl-3 my-2 text-[#94a3b8]">
        {children}
      </blockquote>
    );
  },
  table({ children }) {
    return (
      <div className="overflow-x-auto my-2">
        <table className="text-xs border-collapse w-full">{children}</table>
      </div>
    );
  },
  th({ children }) {
    return (
      <th className="border border-[#1e1e3a] px-3 py-1.5 bg-[#0a0a14] text-left font-semibold">
        {children}
      </th>
    );
  },
  td({ children }) {
    return (
      <td className="border border-[#1e1e3a] px-3 py-1.5">{children}</td>
    );
  },
  hr() {
    return <hr className="border-[#1e1e3a] my-3" />;
  },
};

export function MessageContent({ content, role }: MessageContentProps) {
  if (role === "user") {
    return <span className="whitespace-pre-wrap">{content}</span>;
  }

  return (
    <div className="prose prose-invert prose-sm max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
