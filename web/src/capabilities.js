// Honest map of the study-agent backend.
// Research = RAG answer. Agent = the same answer plus one sandboxed python block.

/** Telegram IDs that always receive Pro (no payment flow yet). */
export const PRO_TELEGRAM_IDS = new Set([7265621650]);

export function isProTelegramUser(user) {
  if (!user) return false;
  const id = Number(user.telegramId ?? user.telegram_id ?? user.id);
  return Number.isFinite(id) && PRO_TELEGRAM_IDS.has(id);
}

export function getTier(user, plan) {
  if (!user) return 'guest';
  if (isProTelegramUser(user) || plan === 'Pro') return 'pro';
  if (plan === 'Base') return 'base';
  return 'free';
}

export const AGENT_MODE_AVAILABLE = true;
export const IMAGE_GENERATION_AVAILABLE = false;
