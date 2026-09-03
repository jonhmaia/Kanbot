export const MASTER_SCOPE = 'master';
export const TASK_SCOPE_KEY = 'taskScope';
export const TASK_TAB_KEY = 'taskTab';
export const DEFAULT_TAB = 'reports';

export const TASK_TABS = [
  { id: 'reports', label: 'Reports' },
  { id: 'board', label: 'Board' },
  { id: 'team', label: 'Team' },
  { id: 'insights', label: 'Insights' },
];

export function isMasterScope(scope) {
  return !scope || scope === MASTER_SCOPE;
}

export function dashboardProjectId(scope) {
  return isMasterScope(scope) ? null : scope;
}

export function dashboardCacheKey(scope) {
  return 'dashboard:' + (scope || MASTER_SCOPE);
}

export function taskPath(scope, tab = 'board') {
  const base = '/tasks/' + (scope || MASTER_SCOPE);
  if (!tab || tab === 'board') return base;
  return base + '/' + tab;
}

export function parseTaskLocation(pathname) {
  const match = pathname.match(/^\/tasks\/([^/]+)(?:\/(team|insights|reports))?\/?$/);
  if (!match) return null;
  return { scope: match[1], tab: match[2] || 'board' };
}
