import React, { useState } from 'react';
import { DownloadSimple } from '@phosphor-icons/react';
import { iconForAttachment, previewKindFor } from '../fileUtils.js';
import { CONNECTOR_META } from '../connectorItems.js';
import ImageLightbox from './ImageLightbox.jsx';
import FilePreviewModal from './FilePreviewModal.jsx';

export default function FileAttachment({ file }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const Icon = iconForAttachment(file);
  const previewKind = previewKindFor(file);
  const hasImagePreview = previewKind === 'image';
  const isConnectorItem = Boolean(file.source);

  const inner = (
    <div
      className="group flex items-center gap-3 px-3.5 py-3 rounded-sm border border-border
        bg-bg-elevated hover:border-text-tertiary transition-colors w-full max-w-[320px]"
    >
      {hasImagePreview ? (
        <img
          src={file.url}
          alt={file.name}
          className="w-9 h-9 rounded-sm object-cover border border-border shrink-0"
        />
      ) : (
        <span className="grid place-items-center w-9 h-9 rounded-sm bg-bg border border-border text-text-secondary shrink-0">
          <Icon size={18} />
        </span>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-[13.5px] text-text-primary truncate">{file.name}</p>
        {isConnectorItem ? (
          <p className="text-[11px] text-text-tertiary">Из {CONNECTOR_META[file.source]?.name}</p>
        ) : (
          file.size && <p className="text-[11px] text-text-tertiary">{file.size}</p>
        )}
      </div>

      {/* Connector-sourced items (Obsidian notes, Telegram chats) aren't
          real downloadable files — no download affordance for those. */}
      {!isConnectorItem && (
        <span
          onClick={(e) => e.stopPropagation()}
          className="grid place-items-center w-7 h-7 rounded-sm text-text-tertiary shrink-0
            transition-colors group-hover:text-accent group-hover:bg-accent-soft"
        >
          <a
            href={file.url || '#'}
            download={file.name}
            className="grid place-items-center w-full h-full"
            aria-label="Скачать"
            title="Скачать"
          >
            <DownloadSimple size={15} className="transition-transform duration-200 group-hover:translate-y-0.5" />
          </a>
        </span>
      )}
    </div>
  );

  if (previewKind) {
    return (
      <>
        <button onClick={() => setPreviewOpen(true)} className="text-left w-full max-w-[320px]" title="Открыть превью">
          {inner}
        </button>
        {hasImagePreview ? (
          <ImageLightbox open={previewOpen} onClose={() => setPreviewOpen(false)} file={file} />
        ) : (
          <FilePreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} file={file} kind={previewKind} />
        )}
      </>
    );
  }

  if (isConnectorItem) {
    return <div className="w-full max-w-[320px]">{inner}</div>;
  }

  return (
    <a href={file.url || '#'} download={file.name} className="block w-full max-w-[320px]">
      {inner}
    </a>
  );
}
