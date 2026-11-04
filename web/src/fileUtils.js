import {
  FilePdf,
  FileDoc,
  FileXls,
  FilePpt,
  FileZip,
  FileCsv,
  FileImage,
  FileCode,
  FileText,
  FileAudio,
  FileVideo,
  File as FileGeneric,
} from '@phosphor-icons/react';
import { iconForConnector } from './connectorItems.js';

const ICON_BY_EXT = {
  pdf: FilePdf,
  doc: FileDoc,
  docx: FileDoc,
  xls: FileXls,
  xlsx: FileXls,
  ppt: FilePpt,
  pptx: FilePpt,
  zip: FileZip,
  rar: FileZip,
  '7z': FileZip,
  csv: FileCsv,
  png: FileImage,
  jpg: FileImage,
  jpeg: FileImage,
  gif: FileImage,
  svg: FileImage,
  webp: FileImage,
  mp3: FileAudio,
  wav: FileAudio,
  mp4: FileVideo,
  mov: FileVideo,
  js: FileCode,
  jsx: FileCode,
  ts: FileCode,
  tsx: FileCode,
  py: FileCode,
  json: FileCode,
  html: FileCode,
  css: FileCode,
  txt: FileText,
  md: FileText,
};

export function iconFor(name = '') {
  const ext = name.split('.').pop()?.toLowerCase();
  return ICON_BY_EXT[ext] || FileGeneric;
}

// Resolves the icon for an attachment-like object: a connector-sourced item
// (Obsidian note, Telegram chat) takes precedence over extension guessing.
export function iconForAttachment(file) {
  return iconForConnector(file.source) || iconFor(file.name);
}

const PREVIEWABLE_EXT = { txt: 'txt', md: 'md', pdf: 'pdf' };

// What kind of built-in preview (if any) an attachment supports. Connector
// items and files without real content (no url, or a stub "#") aren't
// previewable — only genuine blob/data URLs are.
export function previewKindFor(file) {
  if (file.source) return null;
  if (!file.url || file.url === '#') return null;
  if (isImageFile(file.name)) return 'image';
  const ext = file.name.split('.').pop()?.toLowerCase();
  return PREVIEWABLE_EXT[ext] || null;
}

const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']);

export function isImageFile(name = '') {
  const ext = name.split('.').pop()?.toLowerCase();
  return IMAGE_EXT.has(ext);
}

export function formatBytes(bytes) {
  if (bytes === undefined || bytes === null) return '';
  if (bytes < 1024) return `${bytes} Б`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} КБ`;
  const mb = kb / 1024;
  return `${mb.toFixed(mb < 10 ? 1 : 0)} МБ`;
}
