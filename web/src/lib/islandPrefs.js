export const ISLAND_KEY = 'kanbot:island';

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

const DEFAULT_PREFS = { accent: 'amber', edge: 'top' };

export function islandAccentById(id) {
  return ISLAND_ACCENTS.find((item) => item.id === id) || ISLAND_ACCENTS[0];
}

export function islandAccentColor(id) {
  return islandAccentById(id).color;
}

export function readIslandPrefs() {
  try {
    const raw = JSON.parse(localStorage.getItem(ISLAND_KEY) || '{}');
    const accent = ISLAND_ACCENTS.some((item) => item.id === raw.accent) ? raw.accent : DEFAULT_PREFS.accent;
    const edge = ISLAND_EDGES.some((item) => item.id === raw.edge) ? raw.edge : DEFAULT_PREFS.edge;
    return { accent, edge };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function persistIslandPrefs(patch) {
  const next = { ...readIslandPrefs(), ...patch };
  if (!ISLAND_ACCENTS.some((item) => item.id === next.accent)) next.accent = DEFAULT_PREFS.accent;
  if (!ISLAND_EDGES.some((item) => item.id === next.edge)) next.edge = DEFAULT_PREFS.edge;
  try {
    localStorage.setItem(ISLAND_KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode */
  }
  return next;
}
