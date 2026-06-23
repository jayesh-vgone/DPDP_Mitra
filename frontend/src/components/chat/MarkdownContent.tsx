'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        strong: ({ children }) => (
          <strong className="text-[#4F46E5] font-semibold">{children}</strong>
        ),
        p: ({ children }) => <p>{children}</p>,
        ul: ({ children }) => (
          <ul className="list-disc list-inside">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside">{children}</ol>
        ),
        li: ({ children }) => <li>{children}</li>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
