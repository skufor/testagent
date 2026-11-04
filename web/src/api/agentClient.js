// Talks to the real Python backend (server_core.py). Point VITE_API_BASE_URL
// at wherever `uvicorn server_core:app` is running.
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export async function checkBackendOnline() {
  try {
    const res = await fetch(`${API_BASE}/health`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

// Mirrors server_core.py's stream_answer(): yields NDJSON events as they
// arrive — {type: "stage"|"chunk"|"done"|"error", ...}.
export async function* streamAsk({ chatId, question, attachmentFile, taskPrompt = '', executeCode = false, signal }) {
  const form = new FormData();
  form.append('chat_id', chatId);
  form.append('question', question);
  form.append('task_prompt', taskPrompt);
  form.append('execute_code', executeCode ? '1' : '0');
  if (attachmentFile) form.append('attachment', attachmentFile);

  let res;
  try {
    res = await fetch(`${API_BASE}/ask_stream`, { method: 'POST', body: form, signal });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new Error('Не удалось связаться с сервером агента — он запущен?');
  }
  if (!res.ok || !res.body) {
    throw new Error(`Сервер ответил ошибкой (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        yield JSON.parse(trimmed);
      } catch {
        // ignore a malformed/partial line rather than killing the stream
      }
    }
  }
  const rest = buffer.trim();
  if (rest) {
    try {
      yield JSON.parse(rest);
    } catch {
      /* ignore */
    }
  }
}

export async function resetHistory(chatId) {
  const form = new FormData();
  form.append('chat_id', chatId);
  try {
    await fetch(`${API_BASE}/reset_history`, { method: 'POST', body: form });
  } catch {
    /* best-effort cleanup */
  }
}

export async function fetchLibrary() {
  const res = await fetch(`${API_BASE}/library`);
  if (!res.ok) throw new Error('Не удалось прочитать библиотеку');
  const data = await res.json();
  return data.items || [];
}

export async function uploadBook(file) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}/library`, { method: 'POST', body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Не удалось проиндексировать файл');
  return data;
}

export async function deleteBook(id) {
  const res = await fetch(`${API_BASE}/library/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Не удалось удалить документ');
}

export async function exportAnswer({ text, fmt, title }) {
  const form = new FormData();
  form.append('text', text);
  form.append('fmt', fmt);
  form.append('title', title || 'Конспект');
  const res = await fetch(`${API_BASE}/export`, { method: 'POST', body: form });
  if (!res.ok) throw new Error('Экспорт не удался');
  return res.blob();
}

const EXT_MIME = {
  md: 'text/markdown',
  txt: 'text/plain',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
};

export function backendFileToAttachment(file) {
  const ext = file.filename.split('.').pop()?.toLowerCase();
  const mime = EXT_MIME[ext] || 'application/octet-stream';
  return {
    id: crypto.randomUUID(),
    name: file.filename,
    url: `data:${mime};base64,${file.content_b64}`,
  };
}

// ---- Telegram login (webauth) ----
export async function startTelegramAuth() {
  const res = await fetch(`${API_BASE}/webauth/start`, { method: 'POST' });
  if (!res.ok) throw new Error('Не удалось начать вход через Telegram');
  return res.json();
}

export async function pollTelegramAuth(nonce) {
  const res = await fetch(`${API_BASE}/webauth/status?nonce=${encodeURIComponent(nonce)}`);
  if (!res.ok) throw new Error('Не удалось проверить статус входа');
  return res.json();
}
