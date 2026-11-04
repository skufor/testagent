import React, { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Plus,
  Paperclip,
  Plugs,
  PuzzlePiece,
  Check,
  CaretRight,
} from '@phosphor-icons/react';
import { CONNECTOR_META, CONNECTOR_ITEMS } from '../connectorItems.js';
import useOutsideClose from '../hooks/useOutsideClose.js';

function ToggleRow({ label, checked, onChange }) {
  return (
    <button
      onClick={onChange}
      className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-text-primary
        hover:bg-bg-hover transition-colors duration-150"
    >
      <span
        className={`grid place-items-center w-4 h-4 rounded-xs border shrink-0 transition-colors duration-150
          ${checked ? 'bg-accent border-accent text-accent-on' : 'border-border text-transparent'}`}
      >
        <Check size={11} weight="bold" />
      </span>
      <span className="flex-1 text-left">{label}</span>
    </button>
  );
}

function ExpandableSection({ label, icon: Icon, badge, open, onToggle, children }) {
  return (
    <>
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={onToggle}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-text-primary
          hover:bg-bg-hover transition-colors duration-150"
      >
        <Icon size={14} className="text-text-secondary shrink-0" />
        <span className="flex-1 text-left">
          {label}
          {badge ? ` (${badge})` : ''}
        </span>
        <CaretRight
          size={11}
          className={`text-text-tertiary transition-transform duration-150 ${open ? 'rotate-90' : ''}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Click the "+" itself → straight to the file picker (the most common case).
// Hover it → a small menu offers the other attach sources, nested pickers
// for skills and connectors, and two run settings below a divider.
export default function AttachMenu({
  onFilesSelected,
  skills,
  selectedSkillIds,
  onToggleSkill,
  connectors,
  onAddConnectorItem,
  reasoningEnabled,
  onToggleReasoning,
  webEnabled,
  onToggleWeb,
}) {
  const [open, setOpen] = useState(false);
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [connectorsOpen, setConnectorsOpen] = useState(false);
  const fileInputRef = useRef(null);
  const closeTimer = useRef(null);
  // Hover doesn't exist on touch devices, so tapping "+" there opens the
  // menu instead of jumping straight to the file picker. Desktop keeps the
  // hover-to-preview / click-to-pick-file behavior unchanged.
  const [isTouch] = useState(
    () => typeof window !== 'undefined' && !window.matchMedia?.('(hover: hover) and (pointer: fine)').matches
  );

  const openMenu = () => {
    clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => {
      setOpen(false);
      setSkillsOpen(false);
      setConnectorsOpen(false);
    }, 140);
  };
  const pickFile = () => {
    fileInputRef.current?.click();
    setOpen(false);
  };
  const handleMainButtonClick = () => {
    if (isTouch) {
      setOpen((v) => !v);
    } else {
      pickFile();
    }
  };

  const connectedConnectors = connectors.filter((c) => c.connected);

  // On touch, there's no mouseleave to close the menu — close on outside tap.
  const outsideRef = useOutsideClose(isTouch && open, () => {
    setOpen(false);
    setSkillsOpen(false);
    setConnectorsOpen(false);
  });

  return (
    <div
      ref={outsideRef}
      className="relative"
      onMouseEnter={isTouch ? undefined : openMenu}
      onMouseLeave={isTouch ? undefined : scheduleClose}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onFilesSelected(e.target.files);
          e.target.value = '';
        }}
      />

      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleMainButtonClick}
        title={isTouch ? 'Добавить' : 'Прикрепить файл (наведи для других вариантов)'}
        className="grid place-items-center w-8 h-8 rounded-sm text-text-tertiary
          hover:text-text-primary hover:bg-bg-hover transition-all duration-200 ease-out"
        aria-label="Добавить"
      >
        <Plus
          size={17}
          weight="bold"
          className={`transition-transform duration-200 ease-out ${open ? 'rotate-45' : 'rotate-0'}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-full right-0 mb-2 w-56 max-w-[calc(100vw-2rem)] rounded-sm border border-border
              bg-bg-elevated shadow-[0_4px_16px_rgba(0,0,0,0.1)] py-1 z-20 max-h-[70vh] overflow-y-auto"
          >
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={pickFile}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-text-primary
                hover:bg-bg-hover transition-colors duration-150"
            >
              <Paperclip size={14} className="text-text-secondary shrink-0" />
              Файл
            </button>

            <ExpandableSection
              label="Коннекторы"
              icon={Plugs}
              open={connectorsOpen}
              onToggle={() => setConnectorsOpen((v) => !v)}
            >
              {connectedConnectors.length === 0 ? (
                <p className="px-3 py-2 text-[11.5px] text-text-tertiary leading-snug">
                  Пока ничего не подключено — Аккаунт → Настройки → Harness
                </p>
              ) : (
                connectedConnectors.map((c) => {
                  const meta = CONNECTOR_META[c.id];
                  return (
                    <div key={c.id} className="mb-1 last:mb-0">
                      <p className="pl-8 pr-3 pt-1.5 pb-0.5 text-[10.5px] uppercase tracking-wide text-text-tertiary">
                        {meta.name}
                      </p>
                      {CONNECTOR_ITEMS[c.id].map((label) => (
                        <button
                          key={label}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            onAddConnectorItem(c.id, label);
                            setOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 pl-8 pr-3 py-1.5 text-[12.5px] text-text-primary
                            hover:bg-bg-hover transition-colors duration-150 text-left"
                        >
                          <meta.icon size={12} className="text-text-secondary shrink-0" />
                          <span className="truncate">{label}</span>
                        </button>
                      ))}
                    </div>
                  );
                })
              )}
            </ExpandableSection>

            <div className="my-1 border-t border-border" />

            <ExpandableSection
              label="Скиллы"
              icon={PuzzlePiece}
              badge={selectedSkillIds.length || null}
              open={skillsOpen}
              onToggle={() => setSkillsOpen((v) => !v)}
            >
              {skills.length === 0 ? (
                <p className="px-3 py-2 text-[11.5px] text-text-tertiary leading-snug">
                  Пока нет скиллов — загрузите в Аккаунт → Настройки → Harness
                </p>
              ) : (
                skills.map((s) => (
                  <button
                    key={s.id}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onToggleSkill(s.id)}
                    className="w-full flex items-center gap-2.5 pl-8 pr-3 py-1.5 text-[12.5px] text-text-primary
                      hover:bg-bg-hover transition-colors duration-150"
                  >
                    <span
                      className={`grid place-items-center w-3.5 h-3.5 rounded-xs border shrink-0 transition-colors duration-150
                        ${
                          selectedSkillIds.includes(s.id)
                            ? 'bg-accent border-accent text-accent-on'
                            : 'border-border text-transparent'
                        }`}
                    >
                      <Check size={9} weight="bold" />
                    </span>
                    <span className="flex-1 text-left truncate">{s.name}</span>
                  </button>
                ))
              )}
            </ExpandableSection>

            <div className="my-1 border-t border-border" />

            <ToggleRow label="Ризонинг" checked={reasoningEnabled} onChange={onToggleReasoning} />
            <ToggleRow label="Веб" checked={webEnabled} onChange={onToggleWeb} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
