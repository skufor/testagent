import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import MarkdownContent from './components/MarkdownContent.jsx';

const PRINT_STYLES = `
  body { font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; max-width: 680px; margin: 40px auto; padding: 0 24px 60px; line-height: 1.65; }
  .print-header { font-family: -apple-system, Helvetica, Arial, sans-serif; font-size: 12px; color: #888; margin-bottom: 28px; border-bottom: 1px solid #ddd; padding-bottom: 12px; }
  h1, h2, h3 { font-family: -apple-system, Helvetica, Arial, sans-serif; font-weight: 600; margin: 1.4em 0 0.5em; color: #111; }
  h1 { font-size: 22px; } h2 { font-size: 18px; } h3 { font-size: 16px; }
  p { margin: 0 0 1em; }
  strong { font-weight: 700; }
  ul, ol { margin: 0 0 1em; padding-left: 1.4em; }
  li { margin: 0.3em 0; }
  a { color: #0088cc; }
  code { font-family: 'Courier New', monospace; background: #f1f1f1; padding: 0.1em 0.4em; border-radius: 3px; font-size: 0.9em; }
  pre { background: #f1f1f1; padding: 14px 16px; border-radius: 4px; overflow-x: auto; }
  pre code { background: none; padding: 0; }
  table { border-collapse: collapse; width: 100%; margin: 0 0 1em; font-size: 0.95em; }
  th, td { border: 1px solid #ccc; padding: 7px 11px; text-align: left; }
  th { background: #f1f1f1; }
  blockquote { border-left: 3px solid #ccc; margin: 0 0 1em; padding-left: 14px; color: #555; }
  @media print {
    body { margin: 0; padding: 20px 24px; }
  }
`;

export function printMarkdownResponse(markdown) {
  const bodyHtml = renderToStaticMarkup(React.createElement(MarkdownContent, { content: markdown }));
  const win = window.open('', '_blank', 'width=800,height=1000');
  if (!win) return;

  const dateLabel = new Date().toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' });

  win.document.open();
  win.document.write(`<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<title>Ответ Doggy AI</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css" crossorigin="anonymous" />
<style>${PRINT_STYLES}</style>
</head>
<body>
<div class="print-header">Doggy AI · ${dateLabel}</div>
${bodyHtml}
</body>
</html>`);
  win.document.close();
  win.focus();

  const triggerPrint = () => win.print();
  if (win.document.readyState === 'complete') {
    setTimeout(triggerPrint, 250);
  } else {
    win.addEventListener('load', () => setTimeout(triggerPrint, 250));
  }
}
