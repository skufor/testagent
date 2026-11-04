import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// Renders assistant text as Markdown with GFM (tables, strikethrough, task
// lists) and MathJax-style TeX via KaTeX ($inline$ and $$block$$).
// Styling lives in .markdown-body (see index.css) so it stays in one place
// and matches the low-radius, low-color design system.
export default function MarkdownContent({ content }) {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          a: ({ node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
