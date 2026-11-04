import React, { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CaretRight, CircleNotch, Check, Circle, Quotes, Copy, DotsThreeVertical } from '@phosphor-icons/react';
import MarkdownContent from './MarkdownContent.jsx';
import FileAttachment from './FileAttachment.jsx';
import ImageGenBlock from './ImageGenBlock.jsx';
import ElapsedTimer from './ElapsedTimer.jsx';
import ResponseContextMenu from './ResponseContextMenu.jsx';
import CuteDoggieLottie from './CuteDoggieLottie.jsx';
import { showToast } from '../toastBus.js';
import { printMarkdownResponse } from '../printUtils.js';
import { stripMarkdown, downloadTextFile } from '../textUtils.js';
import { exportAnswer } from '../api/agentClient.js';

const MODE_LABEL = { search: 'Doggy Research', agent: 'Doggy Agent' };
const MENU_WIDTH = 224;
const MENU_HEIGHT_ESTIMATE = 280;

function ReasoningBlock({ reasoning, active }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-2.5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-[12px] text-text-tertiary hover:text-text-secondary transition-colors"
      >
        <CaretRight
          size={11}
          className={`transition-transform duration-150 ${open ? 'rotate-90' : ''}`}
        />
        {active ? (
          <span className="inline-flex items-center gap-1.5">
            <CircleNotch size={11} className="animate-spin" />
            Рассуждаю
          </span>
        ) : (
          'Рассуждение'
        )}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <p className="mt-2 pl-3 border-l border-border text-[12.5px] leading-relaxed text-text-secondary font-mono">
              {reasoning}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CommandSteps({ commands }) {
  if (!commands?.length) return null;
  return (
    <div className="mb-3 space-y-1">
      {commands.map((c) => (
        <div key={c.id} className="flex items-center gap-2 text-[12.5px] font-mono">
          {c.status === 'running' && (
            <CircleNotch size={12} className="text-accent animate-spin shrink-0" />
          )}
          {c.status === 'done' && <Check size={12} className="text-text-secondary shrink-0" />}
          {c.status === 'pending' && (
            <Circle size={7} weight="fill" className="text-text-tertiary shrink-0" />
          )}
          <span className={c.status === 'pending' ? 'text-text-tertiary' : 'text-text-secondary'}>
            {c.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// Prefers Puter.js's free, keyless Gemini text-to-speech (no API key, no
// backend — see index.html for the script tag) and falls back to the
// browser's built-in speechSynthesis if Puter isn't available or errors.
async function speak(text) {
  const clean = stripMarkdown(text);
  if (!clean) return;

  if (window.puter?.ai?.txt2speech) {
    try {
      const audio = await window.puter.ai.txt2speech(clean, {
        provider: 'gemini',
        model: 'gemini-2.5-flash-preview-tts',
        voice: 'Puck',
        instructions: 'Говори чётко и естественно, в дружелюбном тоне.',
      });
      audio.play();
      return;
    } catch {
      // fall through to the native voice below
    }
  }

  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = 'ru-RU';
    window.speechSynthesis.speak(utterance);
  }
}

export default function MessageBubble({ message, onQuote }) {
  const isUser = message.role === 'user';
  const contentRef = useRef(null);
  const [menu, setMenu] = useState(null);

  if (isUser) {
    return (
      <div className="group flex flex-col items-end gap-2 animate-messageIn">
        {message.quote && (
          <div className="max-w-[75%] md:max-w-[65%] px-3 py-2 rounded-sm border-l-2 border-accent bg-accent-soft">
            <p className="flex items-center gap-1 text-[10.5px] uppercase tracking-wide text-accent mb-1">
              <Quotes size={11} weight="fill" />
              Из ответа Doggy
            </p>
            <p className="text-[13px] text-text-secondary italic leading-snug">{message.quote}</p>
          </div>
        )}

        {message.files?.length > 0 && (
          <div className="flex flex-col gap-2 items-end w-full">
            {message.files.map((f) => (
              <FileAttachment key={f.id || f.name} file={f} />
            ))}
          </div>
        )}

        {message.content && (
          <div className="flex items-center gap-1.5 max-w-full">
            <button
              onClick={() => {
                navigator.clipboard?.writeText(message.content);
                showToast('Промпт скопирован');
              }}
              title="Копировать промпт"
              className="opacity-0 group-hover:opacity-100 shrink-0 grid place-items-center w-6 h-6 rounded-sm
                text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-all duration-150"
            >
              <Copy size={13} />
            </button>
            <div
              className="max-w-[75%] md:max-w-[65%] px-4 py-2.5 rounded-sm
                bg-bg-elevated border border-border text-[15px] leading-relaxed text-text-primary whitespace-pre-wrap"
            >
              {message.content}
            </div>
          </div>
        )}
      </div>
    );
  }

  const isActive = message.status === 'thinking' || message.status === 'running';
  // No native right-click on touch devices — a visible "more" button opens
  // the same menu there instead of relying on long-press (inconsistent
  // across mobile browsers).
  const [isTouch] = useState(
    () => typeof window !== 'undefined' && !window.matchMedia?.('(hover: hover) and (pointer: fine)').matches
  );
  const moreButtonRef = useRef(null);

  const openMenuFromButton = () => {
    if (message.status !== 'done' || !message.content) return;
    const rect = moreButtonRef.current?.getBoundingClientRect();
    const x = rect ? Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8) : 8;
    const y = rect ? rect.bottom + 4 : 8;
    setMenu({ x: Math.max(x, 8), y: Math.min(y, window.innerHeight - MENU_HEIGHT_ESTIMATE - 8), mode: 'full', selectionText: '' });
  };

  const handleContextMenu = (e) => {
    if (message.status !== 'done' || !message.content) return;
    const selection = window.getSelection();
    const selectedText = selection && !selection.isCollapsed ? selection.toString().trim() : '';
    const withinMessage =
      selectedText && contentRef.current && selection.anchorNode && contentRef.current.contains(selection.anchorNode);

    e.preventDefault();
    setMenu({
      x: Math.min(e.clientX, window.innerWidth - MENU_WIDTH - 8),
      y: Math.min(e.clientY, window.innerHeight - MENU_HEIGHT_ESTIMATE - 8),
      mode: withinMessage ? 'selection' : 'full',
      selectionText: withinMessage ? selectedText : '',
    });
  };

  const closeMenu = () => setMenu(null);

  const handleCopy = () => {
    const text = menu.mode === 'selection' ? menu.selectionText : message.content;
    navigator.clipboard?.writeText(text);
    showToast('Скопировано');
    closeMenu();
  };
  const handleExportMd = () => {
    downloadTextFile(`doggy-response-${message.id.slice(0, 8)}.md`, message.content, 'text/markdown');
    showToast('Файл сохранён');
    closeMenu();
  };
  const handleExportOffice = async (fmt) => {
    closeMenu();
    try {
      const blob = await exportAnswer({ text: message.content, fmt, title: 'Конспект' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `konspekt.${fmt}`;
      link.click();
      URL.revokeObjectURL(url);
      showToast(fmt === 'pdf' ? 'PDF сохранён' : 'DOCX сохранён');
    } catch (err) {
      showToast(err.message || 'Экспорт не удался');
    }
  };
  const handleSpeak = () => {
    speak(menu.mode === 'selection' ? menu.selectionText : message.content);
    closeMenu();
  };
  const handlePrint = () => {
    printMarkdownResponse(message.content);
    closeMenu();
  };
  const handleQuote = () => {
    onQuote?.(menu.selectionText);
    closeMenu();
  };

  // No avatar for assistant messages — the reasoning/command trail above
  // the answer already signals "this is Doggy talking".
  return (
    <div
      className={`relative animate-messageIn ${isTouch && message.status === 'done' && message.content ? 'pt-7' : ''}`}
      ref={contentRef}
      onContextMenu={handleContextMenu}
    >
      {isTouch && message.status === 'done' && message.content && (
        <button
          ref={moreButtonRef}
          onClick={openMenuFromButton}
          title="Действия"
          className="absolute top-1 right-0 grid place-items-center w-7 h-7 rounded-sm
            text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors duration-150"
        >
          <DotsThreeVertical size={16} weight="bold" />
        </button>
      )}
      {message.startedAt && (
        <div>
          <ElapsedTimer startedAt={message.startedAt} durationMs={message.durationMs} running={isActive} />
        </div>
      )}

      {message.reasoning && (
        <ReasoningBlock reasoning={message.reasoning} active={message.status === 'thinking'} />
      )}

      {message.status !== 'thinking' && <CommandSteps commands={message.commands} />}

      {message.imageGen && <ImageGenBlock imageGen={message.imageGen} />}

      {message.content && <MarkdownContent content={message.content} />}

      {message.files?.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {message.files.map((f) => (
            <FileAttachment key={f.name} file={f} />
          ))}
        </div>
      )}

      {isActive && (
        <div className="flex justify-start mt-2">
          <CuteDoggieLottie className="w-11 h-11 -ml-1 pointer-events-none" />
        </div>
      )}

      {menu && (
        <ResponseContextMenu
          x={menu.x}
          y={menu.y}
          mode={menu.mode}
          modeLabel={MODE_LABEL[message.mode] || 'Doggy'}
          onClose={closeMenu}
          onCopy={handleCopy}
          onExportMd={handleExportMd}
          onExportDocx={() => handleExportOffice('docx')}
          onExportPdf={() => handleExportOffice('pdf')}
          onSpeak={handleSpeak}
          onPrint={handlePrint}
          onQuote={handleQuote}
        />
      )}
    </div>
  );
}
