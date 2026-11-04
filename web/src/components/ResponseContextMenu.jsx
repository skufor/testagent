import React from 'react';
import { createPortal } from 'react-dom';
import { Copy, FileArrowDown, SpeakerHigh, Printer, Quotes } from '@phosphor-icons/react';
import useOutsideClose from '../hooks/useOutsideClose.js';

function MenuItem({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-text-primary
        hover:bg-bg-hover transition-colors duration-150"
    >
      <Icon size={14} className="text-text-secondary shrink-0" />
      {label}
    </button>
  );
}

export default function ResponseContextMenu({
  x,
  y,
  mode, // 'full' | 'selection'
  modeLabel,
  onClose,
  onCopy,
  onExportMd,
  onExportDocx,
  onExportPdf,
  onSpeak,
  onPrint,
  onQuote,
}) {
  const ref = useOutsideClose(true, onClose);

  return createPortal(
    <div
      ref={ref}
      style={{ position: 'fixed', top: y, left: x }}
      className="z-50 w-56 rounded-sm border border-border bg-bg-elevated
        shadow-[0_6px_20px_rgba(0,0,0,0.16)] py-1 animate-popIn"
    >
      {mode === 'selection' ? (
        <>
          <MenuItem icon={Copy} label="Копировать" onClick={onCopy} />
          <MenuItem icon={Quotes} label="Цитировать" onClick={onQuote} />
          <MenuItem icon={SpeakerHigh} label="Озвучить" onClick={onSpeak} />
        </>
      ) : (
        <>
          <MenuItem icon={Copy} label="Копировать ответ" onClick={onCopy} />
          <MenuItem icon={FileArrowDown} label="Экспорт в Markdown" onClick={onExportMd} />
          <MenuItem icon={FileArrowDown} label="Экспорт в DOCX" onClick={onExportDocx} />
          <MenuItem icon={FileArrowDown} label="Экспорт в PDF" onClick={onExportPdf} />
          <MenuItem icon={SpeakerHigh} label="Озвучить ответ" onClick={onSpeak} />
          <MenuItem icon={Printer} label="Печать ответа" onClick={onPrint} />
          <div className="my-1 border-t border-border" />
          <p className="px-3 py-1.5 text-[11px] text-text-tertiary">Used {modeLabel}</p>
        </>
      )}
    </div>,
    document.body
  );
}
