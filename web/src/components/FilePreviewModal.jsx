import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, DownloadSimple } from '@phosphor-icons/react';
import MarkdownContent from './MarkdownContent.jsx';

export default function FilePreviewModal({ open, onClose, file, kind }) {
  const [text, setText] = useState(null);

  useEffect(() => {
    if (!open || !file || kind === 'pdf') {
      setText(null);
      return;
    }
    let cancelled = false;
    fetch(file.url)
      .then((r) => r.text())
      .then((t) => {
        if (!cancelled) setText(t);
      })
      .catch(() => {
        if (!cancelled) setText('Не удалось загрузить содержимое файла.');
      });
    return () => {
      cancelled = true;
    };
  }, [open, file, kind]);

  if (!open || !file) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-full flex flex-col rounded-sm bg-bg-elevated border border-border animate-popIn overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <p className="text-[13.5px] text-text-primary truncate">{file.name}</p>
          <div className="flex items-center gap-1 shrink-0">
            <a
              href={file.url}
              download={file.name}
              className="grid place-items-center w-8 h-8 rounded-sm text-text-secondary hover:text-accent hover:bg-bg-hover transition-colors duration-150"
              aria-label="Скачать"
            >
              <DownloadSimple size={16} />
            </a>
            <button
              onClick={onClose}
              className="grid place-items-center w-8 h-8 rounded-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors duration-150"
              aria-label="Закрыть"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-bg">
          {kind === 'pdf' && <iframe src={file.url} title={file.name} className="w-full h-[70vh] border-0 bg-white" />}
          {kind === 'md' && (
            <div className="p-5">
              <MarkdownContent content={text ?? 'Загрузка…'} />
            </div>
          )}
          {kind === 'txt' && (
            <pre className="p-5 text-[13px] leading-relaxed text-text-primary whitespace-pre-wrap font-mono">
              {text ?? 'Загрузка…'}
            </pre>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
