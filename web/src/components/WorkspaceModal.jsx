import React from 'react';
import { X, Hammer } from '@phosphor-icons/react';

export default function WorkspaceModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[calc(100vw-2rem)] sm:max-w-sm rounded-sm bg-bg-elevated border border-border p-5 animate-popIn text-center"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-end mb-1">
          <button
            onClick={onClose}
            className="text-text-tertiary hover:text-text-primary p-1"
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        <span className="mx-auto grid place-items-center w-11 h-11 rounded-sm bg-bg border border-border text-text-secondary mb-3">
          <Hammer size={20} />
        </span>
        <p className="text-[14px] text-text-primary mb-1">Создание пространств в разработке</p>
        <p className="text-[12.5px] text-text-secondary">
          Пока доступны только существующие пространства. Скоро можно будет создавать свои.
        </p>
      </div>
    </div>
  );
}
