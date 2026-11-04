export const HUGE_PASTE_THRESHOLD = 2000;

export function previewText(text, max = 60) {
  const collapsed = text.replace(/\s+/g, ' ').trim();
  return collapsed.length > max ? `${collapsed.slice(0, max)}…` : collapsed;
}

// Rough markdown → plain text for text-to-speech, not a real parser: good
// enough to stop the voice from reading out "hash hash" and asterisks.
export function stripMarkdown(text) {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/\$\$?[^$]+\$\$?/g, '')
    .replace(/[#>*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function downloadTextFile(filename, content, mime = 'text/plain') {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function makeTextFile(text, prefix = 'pasted-text') {
  return new File([text], `${prefix}-${Date.now()}.txt`, { type: 'text/plain' });
}
