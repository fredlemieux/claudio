import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeShiki from "@shikijs/rehype";
import { IconCheckmark, IconCopy } from "../icons";
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
      className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-border text-text-interactive hover:text-text-primary hover:bg-border-hover transition-all opacity-0 group-hover:opacity-100 z-10"
      title="Copy code"
    >
      {copied ? (
        <>
          <IconCheckmark className="w-3 h-3 text-green-400" />
          <span className="text-green-400">Copied</span>
        </>
      ) : (
        <>
          <IconCopy className="w-3 h-3" />
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

/** Extract language from Shiki's class like "shiki one-dark-pro" or from data-language attr */
function extractLanguage(props: Record<string, unknown>): string {
  // Shiki sets data-language on the <code> element inside <pre>
  // But at the <pre> level we can check className for language hints
  const className = (props.className as string) || "";
  const dataLang = (props["data-language"] as string) || "";
  if (dataLang) return dataLang;
  // Fallback: check children for data-language
  return className.replace(/shiki|one-dark-pro/g, "").trim();
}

/** Walk children to find data-language from nested <code> */
function findLanguageInChildren(children: React.ReactNode): string {
  if (!children) return "";
  const arr = Array.isArray(children) ? children : [children];
  for (const child of arr) {
    if (child && typeof child === "object" && "props" in child) {
      const el = child as React.ReactElement<Record<string, unknown>>;
      const lang = el.props["data-language"];
      if (typeof lang === "string" && lang) return lang;
    }
  }
  return "";
}

const components: Components = {
  pre({ children, ...props }) {
    const text = extractTextContent(children);
    const lang = extractLanguage(props) || findLanguageInChildren(children);

    return (
      <div className="group relative my-2 rounded-lg border border-border overflow-hidden shiki-wrapper">
        {/* Language badge */}
        {lang && (
          <span className="absolute top-0 right-0 text-[10px] text-text-secondary bg-surface-2/80 backdrop-blur-sm px-2 py-0.5 rounded-bl z-10 group-hover:right-16 transition-all">
            {lang}
          </span>
        )}
        <CopyButton text={text} />
        <pre
          {...(props as React.HTMLAttributes<HTMLPreElement>)}
          className="!bg-base !rounded-lg !p-0 overflow-x-auto text-xs shiki-pre"
        >
          {children}
        </pre>
      </div>
    );
  },
  code({ className, children, ...props }) {
    // Inline code (no className from Shiki)
    const isShikiBlock = className?.includes("shiki") || (props as Record<string, unknown>)["data-language"];
    if (!className && !isShikiBlock) {
      return (
        <code
          className="bg-surface-hover text-blue-300 px-1.5 py-0.5 rounded text-xs"
          {...props}
        >
          {children}
        </code>
      );
    }
    // Block code — rendered by Shiki with inline styles, just pass through
    return (
      <code className={`${className || ""} shiki-code`} {...props}>
        {children}
      </code>
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
      <blockquote className="border-l-2 border-blue-500 pl-3 my-2 text-text-interactive">
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
      <th className="border border-border px-3 py-1.5 bg-base text-left font-semibold">
        {children}
      </th>
    );
  },
  td({ children }) {
    return (
      <td className="border border-border px-3 py-1.5">{children}</td>
    );
  },
  hr() {
    return <hr className="border-border my-3" />;
  },
};

const rehypeShikiOptions = {
  theme: "one-dark-pro",
  // Only load commonly-used languages to keep bundle smaller
  langs: [
    "typescript", "javascript", "tsx", "jsx", "json", "html", "css",
    "python", "bash", "shell", "rust", "go", "sql", "yaml", "toml",
    "markdown", "diff", "xml", "graphql", "dockerfile",
  ],
};

export function MessageContent({ content, role }: MessageContentProps) {
  if (role === "user") {
    return <span className="whitespace-pre-wrap">{content}</span>;
  }

  return (
    <div className="prose prose-invert prose-sm max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeShiki, rehypeShikiOptions]]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
