import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CaretUpDown, Plus, Check } from '@phosphor-icons/react';
import { WORKSPACE_ICONS } from '../workspaceIcons.js';
import useOutsideClose from '../hooks/useOutsideClose.js';

export default function WorkspaceSwitcher({ workspaces, activeId, onSelect, onCreateClick }) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(open, () => setOpen(false));

  const active = workspaces.find((w) => w.id === activeId) || workspaces[0];
  const ActiveIcon = WORKSPACE_ICONS[active.icon];

  return (
    <div className="relative px-3 mb-3" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-sm border border-border
          bg-bg-elevated hover:bg-bg-hover transition-colors duration-150 text-left"
      >
        <span className="grid place-items-center w-6 h-6 rounded-xs bg-bg border border-border text-text-secondary shrink-0">
          <ActiveIcon size={13} />
        </span>
        <span className="flex-1 text-[13px] text-text-primary truncate">{active.name}</span>
        <CaretUpDown size={13} className="text-text-tertiary shrink-0" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-3 right-3 top-full mt-1.5 rounded-sm border border-border
              bg-bg-elevated shadow-[0_4px_16px_rgba(0,0,0,0.12)] py-1 z-30"
          >
            {workspaces.map((w) => {
              const Icon = WORKSPACE_ICONS[w.icon];
              const isActive = w.id === activeId;
              return (
                <button
                  key={w.id}
                  onClick={() => {
                    onSelect(w.id);
                    setOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-text-primary
                    hover:bg-bg-hover transition-colors duration-150"
                >
                  <Icon size={14} className="text-text-secondary shrink-0" />
                  <span className="flex-1 text-left truncate">{w.name}</span>
                  {isActive && <Check size={13} className="text-accent shrink-0" />}
                </button>
              );
            })}

            <div className="my-1 border-t border-border" />

            <button
              onClick={() => {
                setOpen(false);
                onCreateClick();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-text-secondary
                hover:text-text-primary hover:bg-bg-hover transition-colors duration-150"
            >
              <Plus size={14} className="shrink-0" />
              <span className="flex-1 text-left">Новое пространство</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-xs bg-bg border border-border text-text-tertiary">
                Скоро
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
