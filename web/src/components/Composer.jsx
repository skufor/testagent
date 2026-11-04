import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlass,
  Robot,
  ArrowUp,
  Square,
  UploadSimple,
  Clipboard,
  X,
  Quotes,
  Globe,
  PuzzlePiece,
  Lock,
} from '@phosphor-icons/react';
import AttachMenu from './AttachMenu.jsx';
import AttachedFileChip from './AttachedFileChip.jsx';
import RotatingPlaceholder from './RotatingPlaceholder.jsx';
import SlashMenu from './SlashMenu.jsx';
import VoiceInputButton from './VoiceInputButton.jsx';
import { HUGE_PASTE_THRESHOLD, previewText, makeTextFile } from '../textUtils.js';
import { detectTypographyReplacement } from '../typography.js';
import { AGENT_MODE_AVAILABLE } from '../capabilities.js';
import { showToast } from '../toastBus.js';

const MODES = [
  { id: 'search', label: 'Research', icon: MagnifyingGlass },
  { id: 'agent', label: 'Agent', icon: Robot },
];

const Composer = forwardRef(function Composer(
  {
    value,
    onChange,
    onSend,
    mode,
    onModeChange,
    isWorking,
    onStop,
    autoFocus,
    isNewChat,
    attachedFiles,
    onAddFiles,
    onRemoveFile,
    quote,
    onRemoveQuote,
    reasoningEnabled,
    onToggleReasoning,
    webEnabled,
    onToggleWeb,
    skills,
    selectedSkillIds,
    onToggleSkill,
    connectors,
    onAddConnectorItem,
    handledClipboardTexts,
  },
  ref
) {
  const textareaRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const dragCounter = useRef(0);
  const [clipboardSuggestion, setClipboardSuggestion] = useState(null);
  const clipboardUnavailable = useRef(false);
  const lastReplaceRef = useRef(null);
  const pendingCursorRef = useRef(null);

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
  }));

  // Re-measure on every value change — covers typing, but just as
  // importantly covers programmatic clears (send, Ctrl+A + Delete,
  // switching chats) that don't always leave the textarea's own layout
  // in sync when only handled from inside an input handler.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const next = Math.min(el.scrollHeight, 200);
    el.style.height = next + 'px';
    el.style.overflowY = el.scrollHeight > 200 ? 'auto' : 'hidden';
  }, [value]);

  // A typography substitution needs to move the caret to just after the
  // replacement character — done here (after React re-renders with the new
  // value) rather than synchronously, since the DOM node's own value hasn't
  // updated yet at the point the change handler runs.
  useEffect(() => {
    if (pendingCursorRef.current != null && textareaRef.current) {
      const pos = pendingCursorRef.current;
      textareaRef.current.setSelectionRange(pos, pos);
      pendingCursorRef.current = null;
    }
  }, [value]);

  // Word-processor-style live typography: "--" -> "—", "<<"/">>" -> «»,
  // and Backspace immediately after reverts to the raw characters instead
  // of just deleting the replacement.
  const handleTextareaChange = (e) => {
    const el = e.target;
    const raw = el.value;
    const cursor = el.selectionStart;
    const replacement = detectTypographyReplacement(raw, cursor);
    if (replacement) {
      lastReplaceRef.current = replacement.undo;
      pendingCursorRef.current = replacement.cursor;
      onChange(replacement.text);
    } else {
      lastReplaceRef.current = null;
      onChange(raw);
    }
  };

  // ---- slash commands: /web toggles web search, /<skill> toggles a skill ----
  const slashMatch = /^\/(\S*)$/.exec(value);
  const slashQuery = slashMatch ? slashMatch[1].toLowerCase() : null;
  const [slashDismissedFor, setSlashDismissedFor] = useState(null);
  const slashMenuOpen = slashQuery !== null && slashDismissedFor !== value;

  const slashItems = useMemo(() => {
    if (slashQuery === null) return [];
    const all = [
      { id: 'web', label: 'web', icon: Globe, type: 'toggle', active: webEnabled },
      ...skills.map((s) => ({
        id: s.id,
        label: s.name,
        icon: PuzzlePiece,
        type: 'skill',
        active: selectedSkillIds.includes(s.id),
      })),
    ];
    if (!slashQuery) return all;
    return all.filter((it) => it.label.toLowerCase().startsWith(slashQuery));
  }, [slashQuery, skills, selectedSkillIds, webEnabled]);

  const [highlight, setHighlight] = useState(0);
  useEffect(() => setHighlight(0), [slashQuery]);

  const selectSlashItem = (item) => {
    if (!item) return;
    if (item.type === 'toggle') onToggleWeb();
    else onToggleSkill(item.id);
    onChange('');
    setSlashDismissedFor(null);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Backspace' && lastReplaceRef.current) {
      const { at, to } = lastReplaceRef.current;
      const el = e.currentTarget;
      if (el.selectionStart === at && el.selectionEnd === at) {
        e.preventDefault();
        const text = el.value;
        const newText = text.slice(0, at - 1) + to + text.slice(at);
        lastReplaceRef.current = null;
        pendingCursorRef.current = at - 1 + to.length;
        onChange(newText);
        return;
      }
      lastReplaceRef.current = null;
    }
    if (slashMenuOpen) {
      const count = Math.max(slashItems.length, 1);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlight((h) => (h + 1) % count);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlight((h) => (h - 1 + count) % count);
        return;
      }
      if ((e.key === 'Enter' || e.key === 'Tab') && slashItems.length > 0) {
        e.preventDefault();
        selectSlashItem(slashItems[highlight]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setSlashDismissedFor(value);
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) onSend();
    }
  };

  // Switching mode, attaching, sending, stopping — none of these should
  // steal keyboard focus away from the textarea.
  const keepFocus = (e) => e.preventDefault();
  const refocus = () => textareaRef.current?.focus();

  const handleModeClick = (id) => {
    if (id === 'agent' && !AGENT_MODE_AVAILABLE) {
      showToast('Agent-режим ещё в разработке');
      return;
    }
    onModeChange(id);
    refocus();
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    dragCounter.current += 1;
    if (e.dataTransfer.types?.includes('Files')) setDragOver(true);
  };
  const handleDragOver = (e) => e.preventDefault();
  const handleDragLeave = (e) => {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setDragOver(false);
    }
  };
  const handleDrop = (e) => {
    e.preventDefault();
    dragCounter.current = 0;
    setDragOver(false);
    if (e.dataTransfer.files?.length) onAddFiles(e.dataTransfer.files);
  };

  // Phone-keyboard-style clipboard suggestion: on focus, ask (once) whether
  // the clipboard holds something worth offering. The "already handled"
  // set lives in the parent (App) so it survives this component remounting
  // when the composer morphs from the empty-chat layout to the pinned
  // bottom bar — otherwise a dismissed suggestion could resurface.
  const handleFocus = async () => {
    if (clipboardUnavailable.current || !navigator.clipboard?.readText) return;
    try {
      const text = await navigator.clipboard.readText();
      const trimmed = text.trim();
      if (trimmed && !handledClipboardTexts.current.has(trimmed)) {
        setClipboardSuggestion(trimmed);
      }
    } catch {
      clipboardUnavailable.current = true;
    }
  };

  const acceptClipboard = () => {
    if (!clipboardSuggestion) return;
    handledClipboardTexts.current.add(clipboardSuggestion);
    if (clipboardSuggestion.length > HUGE_PASTE_THRESHOLD) {
      onAddFiles([makeTextFile(clipboardSuggestion)]);
    } else {
      onChange(value ? `${value}\n${clipboardSuggestion}` : clipboardSuggestion);
    }
    setClipboardSuggestion(null);
    refocus();
  };

  const dismissClipboard = () => {
    if (clipboardSuggestion) handledClipboardTexts.current.add(clipboardSuggestion);
    setClipboardSuggestion(null);
  };

  // Pasting an image (e.g. a screenshot) attaches it as a file instead of
  // trying to paste it as text. Checked before the huge-text-paste case
  // since an image paste has no meaningful text payload anyway.
  // A huge native paste becomes a .txt attachment instead of flooding the
  // textarea.
  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (items) {
      const imageFiles = Array.from(items)
        .filter((item) => item.type.startsWith('image/'))
        .map((item) => item.getAsFile())
        .filter(Boolean);
      if (imageFiles.length > 0) {
        e.preventDefault();
        onAddFiles(imageFiles);
        return;
      }
    }

    const text = e.clipboardData?.getData('text');
    if (text && text.length > HUGE_PASTE_THRESHOLD) {
      e.preventDefault();
      onAddFiles([makeTextFile(text)]);
    }
  };

  return (
    <div className="relative">
      {/* soft, subtle, moving glow — appears only while Doggy is actually
          working on a reply, not just because the field is focused */}
      <div
        className={`composer-glow pointer-events-none absolute -inset-1 rounded-lg
          transition-opacity duration-700 ease-out
          ${isWorking ? 'opacity-40' : 'opacity-0'}`}
      />

      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative rounded-sm border bg-bg-elevated transition-colors duration-200
          ${dragOver ? 'border-accent border-dashed' : 'border-border focus-within:border-text-tertiary'}`}
      >
        {/* drag-and-drop overlay */}
        {dragOver && (
          <div className="absolute inset-0 z-10 grid place-items-center rounded-sm bg-accent-soft pointer-events-none">
            <div className="flex items-center gap-2 text-[13px] text-accent font-medium">
              <UploadSimple size={16} />
              Отпустите, чтобы прикрепить
            </div>
          </div>
        )}

        <AnimatePresence>
          {slashMenuOpen && (
            <SlashMenu items={slashItems} highlight={highlight} onSelect={selectSlashItem} onHover={setHighlight} />
          )}
        </AnimatePresence>

        {quote && (
          <div className="flex items-start gap-2 mx-3 mt-3 px-2.5 py-2 rounded-sm border-l-2 border-accent bg-accent-soft animate-popIn">
            <Quotes size={12} weight="fill" className="text-accent mt-0.5 shrink-0" />
            <p className="flex-1 min-w-0 text-[12px] text-text-secondary italic truncate">{quote}</p>
            <button
              onClick={onRemoveQuote}
              title="Убрать цитату"
              className="shrink-0 grid place-items-center w-5 h-5 rounded-full text-text-tertiary
                hover:text-text-primary hover:bg-bg-hover transition-colors duration-150"
            >
              <X size={11} />
            </button>
          </div>
        )}

        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-3 pt-3">
            {attachedFiles.map((f) => (
              <AttachedFileChip key={f.id} file={f} onRemove={onRemoveFile} />
            ))}
          </div>
        )}

        {clipboardSuggestion && (
          <div className="flex items-center gap-2 mx-3 mt-3 px-2.5 py-1.5 rounded-sm border border-border bg-bg animate-popIn overflow-hidden">
            <Clipboard size={13} className="text-text-tertiary shrink-0" />
            <button
              onClick={acceptClipboard}
              className="flex-1 min-w-0 flex items-baseline gap-1 text-left overflow-hidden"
            >
              <span className="text-[12px] text-text-primary font-medium shrink-0">Вставить:</span>
              <span className="text-[12px] text-text-secondary whitespace-nowrap overflow-hidden text-ellipsis">
                {previewText(clipboardSuggestion)}
              </span>
            </button>
            <button
              onClick={dismissClipboard}
              className="grid place-items-center w-5 h-5 rounded-full text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors duration-150 shrink-0"
              aria-label="Скрыть подсказку"
            >
              <X size={11} />
            </button>
          </div>
        )}

        <div className="relative">
          <RotatingPlaceholder active={isNewChat && !value} />
          <textarea
            ref={textareaRef}
            autoFocus={autoFocus}
            value={value}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onPaste={handlePaste}
            rows={1}
            placeholder={isNewChat ? '' : 'Уточнить детали'}
            className="w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-[15px]
              text-text-primary placeholder:text-text-tertiary outline-none max-h-[200px] overflow-hidden"
          />
        </div>

        <div className="flex items-center justify-between px-2.5 pb-2.5 pt-1">
          {/* mode segmented control — active pill sized to its own button */}
          <div className="flex items-center gap-1 bg-bg rounded-sm p-1 border border-border">
            {MODES.map(({ id, label, icon: Icon }) => {
              const active = mode === id;
              const locked = id === 'agent' && !AGENT_MODE_AVAILABLE;
              return (
                <button
                  key={id}
                  onMouseDown={keepFocus}
                  onClick={() => handleModeClick(id)}
                  title={
                    locked
                      ? 'Скоро — пока не подключено к бэкенду'
                      : id === 'search'
                      ? 'Ответ по библиотеке, с цитатами'
                      : 'Тот же ответ, плюс один блок Python в песочнице'
                  }
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xs text-xs font-medium
                    transition-colors duration-150
                    ${locked ? 'text-text-tertiary' : active ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                >
                  {active && !locked && (
                    <motion.div
                      layoutId="mode-pill"
                      className="absolute inset-0 -z-10 rounded-xs bg-bg-elevated border border-border"
                      transition={{ type: 'spring', stiffness: 520, damping: 34 }}
                    />
                  )}
                  {locked ? (
                    <Lock size={12} />
                  ) : (
                    <Icon size={14} weight={active ? 'bold' : 'regular'} className={active ? 'text-accent' : ''} />
                  )}
                  {label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1">
            <VoiceInputButton onTranscript={(text) => onChange(value ? `${value} ${text}` : text)} />
            <AttachMenu
              onFilesSelected={onAddFiles}
              skills={skills}
              selectedSkillIds={selectedSkillIds}
              onToggleSkill={onToggleSkill}
              connectors={connectors}
              onAddConnectorItem={onAddConnectorItem}
              reasoningEnabled={reasoningEnabled}
              onToggleReasoning={onToggleReasoning}
              webEnabled={webEnabled}
              onToggleWeb={onToggleWeb}
            />

            {isWorking ? (
              <button
                onMouseDown={keepFocus}
                onClick={onStop}
                title="Остановить (Esc)"
                className="grid place-items-center w-8 h-8 rounded-sm bg-text-primary text-bg
                  transition-transform duration-150 active:scale-90 hover:scale-105"
                aria-label="Остановить"
              >
                <Square size={12} weight="fill" />
              </button>
            ) : (
              <button
                onMouseDown={keepFocus}
                onClick={() => {
                  onSend();
                  refocus();
                }}
                disabled={!value.trim()}
                title="Отправить (Enter)"
                className="gradient-accent-hover grid place-items-center w-8 h-8 rounded-sm bg-accent text-accent-on
                  disabled:opacity-30 disabled:cursor-not-allowed
                  transition-all duration-150 active:scale-90 enabled:hover:scale-105"
                aria-label="Отправить"
              >
                <ArrowUp size={16} weight="bold" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default Composer;
