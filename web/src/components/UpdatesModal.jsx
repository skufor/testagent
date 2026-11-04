import React from 'react';
import { X, Sparkle } from '@phosphor-icons/react';
import { CHANGELOG } from '../changelog.js';

export default function UpdatesModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-8 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[calc(100vw-2rem)] sm:max-w-sm rounded-sm bg-bg-elevated border border-border p-5 animate-popIn"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h2 className="font-display text-[19px] text-text-primary">Что нового</h2>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary p-1" aria-label="Закрыть">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {CHANGELOG.map((entry, i) => (
            <div key={entry.id} className="flex gap-3">
              <span
                className={`grid place-items-center w-7 h-7 rounded-sm border shrink-0 mt-0.5
                  ${i === 0 ? 'bg-accent-soft border-accent text-accent' : 'bg-bg border-border text-text-tertiary'}`}
              >
                <Sparkle size={13} weight={i === 0 ? 'fill' : 'regular'} />
              </span>
              <div className="min-w-0">
                <p className="text-[13.5px] font-medium text-text-primary">{entry.title}</p>
                <p className="text-[11px] text-text-tertiary mb-1">
                  {new Date(entry.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <p className="text-[12.5px] text-text-secondary leading-relaxed">{entry.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
