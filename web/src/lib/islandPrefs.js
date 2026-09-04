import { publishIslandPrefsBus } from './focusBus';
import { readLocalJson, writeLocalJson } from './userPrefs';

export const ISLAND_KEY = 'kanbot:island';
export const ISLAND_PROJECT_KEY = 'kanbot:island-project';

export const ISLAND_ACCENTS = [
  { id: 'amber', name: 'Ambar', color: '#F5A524' },
  { id: 'ice', name: 'Gelo', color: '#BFE3F2' },
  { id: 'mint', name: 'Menta', color: '#8FE3B0' },
  { id: 'rose', name: 'Rosa', color: '#E5484D' },
  { id: 'lilac', name: 'Violeta', color: '#C4B5FD' },
  { id: 'blue', name: 'Azul', color: '#5B8CFF' },
];

export const ISLAND_EDGES = [
  { id: 'top', name: 'Topo' },
  { id: 'left', name: 'Esquerda' },
  { id: 'right', name: 'Direita' },
];

const DEFAULT_PREFS = { accent: 'amber', edge: 'top', visible: true };
const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function islandAccentById(id) {
  return ISLAND_ACCENTS.find((item) => item.id === id) || ISLAND_ACCENTS[0];
}

export function islandAccentColor(id) {
  return islandAccentById(id).color;
}

export function isIslandHex(color) {
  return HEX_COLOR.test(color || '');
}

export function resolveIslandAccent(prefs, projectColor) {
  if (isIslandHex(projectColor)) return projectColor;
  return islandAccentColor(prefs?.accent);
}

export function readIslandPrefs() {
  const raw = readLocalJson(ISLAND_KEY, {}) || {};
  const accent = ISLAND_ACCENTS.some((item) => item.id === raw.accent) ? raw.accent : DEFAULT_PREFS.accent;
  const edge = ISLAND_EDGES.some((item) => item.id === raw.edge) ? raw.edge : DEFAULT_PREFS.edge;
  return { accent, edge, visible: raw.visible !== false };
}

export function persistIslandPrefs(patch) {
  const next = { ...readIslandPrefs(), ...patch };
  if (!ISLAND_ACCENTS.some((item) => item.id === next.accent)) next.accent = DEFAULT_PREFS.accent;
  if (!ISLAND_EDGES.some((item) => item.id === next.edge)) next.edge = DEFAULT_PREFS.edge;
  next.visible = next.visible !== false;
  writeLocalJson(ISLAND_KEY, next);
  publishIslandPrefsBus(next);
  return next;
}

export function readIslandProject() {
  const raw = readLocalJson(ISLAND_PROJECT_KEY, {}) || {};
  return {
    id: typeof raw.id === 'string' ? raw.id : null,
    color: isIslandHex(raw.color) ? raw.color : null,
  };
}

export function persistIslandProject(payload = {}) {
  const next = {
    id: typeof payload.id === 'string' ? payload.id : null,
    color: isIslandHex(payload.color) ? payload.color : null,
  };
  writeLocalJson(ISLAND_PROJECT_KEY, next);
  try {
    window.dispatchEvent(new Event('kanbot-island-project'));
  } catch {
    /* ignore */
  }
  import('./desktop').then(({ emitDesktop }) => emitDesktop('island-project', next)).catch(() => {});
  return next;
}
