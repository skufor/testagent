import React from 'react';
import { createPortal } from 'react-dom';
import { X, DownloadSimple } from '@phosphor-icons/react';

export default function ImageLightbox({ open, onClose, file }) {
  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      onClick={onClose}
    >
      <div className="max-w-2xl w-full animate-popIn" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[13px] text-white/80 truncate">{file.name}</p>
          <div className="flex items-center gap-1">
            <a
              href={file.url}
              download={file.name}
              onClick={(e) => e.stopPropagation()}
              className="grid place-items-center w-8 h-8 rounded-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Скачать"
              title="Скачать"
            >
              <DownloadSimple size={16} />
            </a>
            <button
              onClick={onClose}
              className="grid place-items-center w-8 h-8 rounded-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Закрыть"
              title="Закрыть (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <img src={file.url} alt={file.name} className="w-full rounded-sm border border-white/10" />
      </div>
    </div>,
    document.body
  );
}
