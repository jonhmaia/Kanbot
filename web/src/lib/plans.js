export const WORKSPACE_PLANS = [
  { id: 'free', name: 'Free', hint: 'Para comecar' },
  { id: 'pro', name: 'Pro', hint: 'Mais projetos e pessoas' },
  { id: 'business', name: 'Business', hint: 'Time e operacao' },
];

const ALLOWED = new Set([...WORKSPACE_PLANS.map((item) => item.id), 'enterprise']);

export function normalizePlan(value) {
  const id = String(value || 'free').trim().toLowerCase();
  return ALLOWED.has(id) ? id : 'free';
}

export function planMeta(value) {
  const id = normalizePlan(value);
  return WORKSPACE_PLANS.find((item) => item.id === id) || { id, name: id, hint: '' };
}
