// Word-processor-style live substitutions. Each trigger's raw pattern is
// replaced the instant it's completed; the caller is responsible for
// remembering the returned `undo` info so a following Backspace can revert
// to the raw characters instead of just deleting the replacement.
const TRIGGERS = [
  { pattern: '--', replacement: '—' },
  { pattern: '<<', replacement: '«' },
  { pattern: '>>', replacement: '»' },
];

export function detectTypographyReplacement(text, cursorPos) {
  for (const { pattern, replacement } of TRIGGERS) {
    const start = cursorPos - pattern.length;
    if (start >= 0 && text.slice(start, cursorPos) === pattern) {
      return {
        text: text.slice(0, start) + replacement + text.slice(cursorPos),
        cursor: start + replacement.length,
        undo: { at: start + replacement.length, from: replacement, to: pattern },
      };
    }
  }
  return null;
}
