import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import type { Components } from "react-markdown";

interface MessageContentProps {
  content: string;
  role: "user" | "assistant";
}

const components: Components = {
  pre({ children }) {
    return (
      <pre className="bg-[#0a0a14] rounded-lg p-4 my-2 overflow-x-auto text-xs border border-[#1e1e3a]">
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
          <span className="absolute top-0 right-0 text-[10px] text-[#475569] bg-[#12121e] px-2 py-0.5 rounded-bl">
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
