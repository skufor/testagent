// Honest map of the study-agent backend.
// Research = RAG answer. Agent = the same answer plus one sandboxed python block.
// Image generation is not implemented.

export function getTier(user, plan) {
  if (!user) return 'guest';
  if (plan === 'Pro') return 'pro';
  if (plan === 'Base') return 'base';
  return 'free';
}

export const AGENT_MODE_AVAILABLE = true;
export const IMAGE_GENERATION_AVAILABLE = false;
