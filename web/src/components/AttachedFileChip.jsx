import React, { useState } from 'react';
import { X } from '@phosphor-icons/react';
import { iconForAttachment, previewKindFor } from '../fileUtils.js';
import ImageLightbox from './ImageLightbox.jsx';
import FilePreviewModal from './FilePreviewModal.jsx';

export default function AttachedFileChip({ file, onRemove }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const Icon = iconForAttachment(file);
  const previewKind = previewKindFor(file);
  const hasImagePreview = previewKind === 'image';

  return (
    <div
      className="group flex items-center gap-1.5 pl-2 pr-1.5 py-1.5 rounded-sm border border-border
        bg-bg text-[12.5px] text-text-primary max-w-[200px] animate-popIn"
    >
      <button
        onClick={() => previewKind && setPreviewOpen(true)}
        title={previewKind ? 'Посмотреть перед отправкой' : file.name}
        className={`flex items-center gap-1.5 min-w-0 flex-1 text-left ${previewKind ? 'cursor-pointer' : 'cursor-default'}`}
      >
        {file.previewUrl ? (
          <img src={file.previewUrl} alt={file.name} className="w-4 h-4 rounded-xs object-cover shrink-0" />
        ) : (
          <Icon size={14} className="text-text-secondary shrink-0" />
        )}
        <span className="truncate">{file.name}</span>
        {file.size && <span className="text-text-tertiary shrink-0 hidden sm:inline">· {file.size}</span>}
      </button>

      <button
        onClick={() => onRemove(file.id)}
        title="Убрать"
        className="grid place-items-center w-4 h-4 rounded-full text-text-tertiary shrink-0 ml-0.5
          transition-colors duration-150 hover:text-danger hover:bg-danger-soft"
        aria-label={`Убрать ${file.name}`}
      >
        <X size={10} weight="bold" />
      </button>

      {previewKind &&
        (hasImagePreview ? (
          <ImageLightbox open={previewOpen} onClose={() => setPreviewOpen(false)} file={file} />
        ) : (
          <FilePreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} file={file} kind={previewKind} />
        ))}
    </div>
  );
}
