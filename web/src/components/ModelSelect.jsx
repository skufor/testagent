import React, { useState } from 'react';
import { CaretDown, Check } from '@phosphor-icons/react';
import useOutsideClose from '../hooks/useOutsideClose.js';

function shortName(id) {
  if (!id) return 'модель';
  const piece = id.split('/').pop() || id;
  return piece.length > 28 ? `${piece.slice(0, 26)}…` : piece;
}

export default function ModelSelect({ models, current, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(open, () => setOpen(false));
  const items = models.length ? models : current ? [{ id: current }] : [];

  return (
    <div ref={ref} className="relative z-[300]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        title={current || 'Модель'}
        className="flex items-center gap-1.5 max-w-[46vw] sm:max-w-[220px] pl-2.5 pr-2 py-1 rounded-sm border border-border
          bg-bg-elevated hover:bg-bg-hover transition-colors duration-150 text-[12px]"
      >
        <span className="text-text-tertiary shrink-0">модель</span>
        <span className="text-text-primary truncate">{shortName(current)}</span>
        <CaretDown size={12} className={`shrink-0 text-text-tertiary transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          className="absolute right-0 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 top-[calc(100%+6px)] z-[300] w-64 max-w-[80vw]
            rounded-sm border border-border bg-bg-elevated shadow-[0_6px_20px_rgba(0,0,0,0.16)] py-1 animate-popIn"
        >
          <p className="px-3 py-1.5 text-[11px] text-text-tertiary">Шлюз, ключ только на сервере</p>
          {items.length === 0 && <p className="px-3 py-2 text-[12px] text-text-secondary">Список пуст</p>}
          <div className="max-h-64 overflow-y-auto">
            {items.map((item) => {
              const active = item.id === current;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    if (!active) onSelect(item.id);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-[12.5px] text-text-primary hover:bg-bg-hover"
                >
                  <Check size={12} className={active ? 'text-accent' : 'text-transparent'} />
                  <span className="min-w-0 flex-1 truncate">{item.id}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
