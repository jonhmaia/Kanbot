export const PRESENCE_META = {
  available: { label: 'Disponivel', color: '#8FE3B0' },
  focusing: { label: 'Em foco', color: '#F5A524' },
  away: { label: 'Ausente', color: '#6E7A85' },
};

export const PROJECT_ROLES = [
  { value: 'member', label: 'Membro' },
  { value: 'viewer', label: 'Leitor' },
  { value: 'admin', label: 'Admin' },
];

export function presenceMeta(presence) {
  return PRESENCE_META[presence] || PRESENCE_META.available;
}

export function xpProgress(profile) {
  const xp = Number(profile?.xp) || 0;
  const into = xp % 100;
  return { xp, into, next: 100 - into, ratio: into / 100 };
}

export function profileBadges(profile) {
  const tasks = Number(profile?.tasksCompleted) || 0;
  const streak = Math.max(Number(profile?.currentStreak) || 0, Number(profile?.longestStreak) || 0);
  const focus = Number(profile?.focusMinutes) || 0;
  const level = Number(profile?.level) || 1;
  return [
    { id: 'first', name: 'Primeira entrega', hint: 'Conclua uma tarefa', earned: tasks >= 1 },
    { id: 'ten', name: 'Dez no quadro', hint: '10 tarefas concluidas', earned: tasks >= 10 },
    { id: 'streak7', name: 'Semana firme', hint: '7 dias de streak', earned: streak >= 7 },
    { id: 'focus5', name: 'Cinco horas', hint: '5h de foco', earned: focus >= 300 },
    { id: 'level5', name: 'Nivel 5', hint: 'Chegue ao nivel 5', earned: level >= 5 },
  ];
}

export function roleLabel(role) {
  if (role === 'owner') return 'Dono';
  if (role === 'admin') return 'Admin';
  if (role === 'viewer') return 'Leitor';
  if (role === 'member') return 'Membro';
  return role || 'Membro';
}

export function inviteUrl(token) {
  if (typeof window === 'undefined') return '/invite/' + token;
  return window.location.origin + '/invite/' + token;
}
