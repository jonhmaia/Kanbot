import { readLocal, writeLocal } from './userPrefs';

export const ATMOSPHERE_KEY = 'kanbot:atmosphere';
export const DEFAULT_ATMOSPHERE = 'grafite';

/** Mesmo radial-gradient do fundo: 6 stops, do highlight ao canto escuro. */
export const ATMOSPHERES = [
  {
    id: 'grafite',
    name: 'Grafite',
    hint: 'O cinza original',
    stops: ['#4a4a52', '#3e3e44', '#313136', '#262629', '#1b1b1e', '#131315'],
    accent: '#F5A524',
    accentSoft: '#FFC15E',
    cool: '#BFE3F2',
    coolDeep: '#5FA8C9',
  },
  {
    id: 'ardosia',
    name: 'Ardosia',
    hint: 'Pedra fria',
    stops: ['#4a5360', '#3e4650', '#323843', '#262c33', '#1b1f25', '#12151a'],
    accent: '#8AA8C4',
    accentSoft: '#B4CBDC',
    cool: '#C5D6E4',
    coolDeep: '#6A8FA8',
  },
  {
    id: 'marinho',
    name: 'Marinho',
    hint: 'Noite profunda',
    stops: ['#44526a', '#384456', '#2d3646', '#222834', '#181c25', '#0f1218'],
    accent: '#7A9BC4',
    accentSoft: '#A8C0DC',
    cool: '#B4C8E0',
    coolDeep: '#4A6A94',
  },
  {
    id: 'vinho',
    name: 'Vinho',
    hint: 'Borgonha noturno',
    stops: ['#5a454c', '#4a393f', '#3b2e33', '#2c2327', '#1e191b', '#141011'],
    accent: '#C4848C',
    accentSoft: '#D9A8AE',
    cool: '#E4C8C6',
    coolDeep: '#8A4A52',
  },
  {
    id: 'rosa',
    name: 'Rosa',
    hint: 'Blush noturno',
    stops: ['#7a4a5c', '#633d4c', '#4e313d', '#3a252e', '#26191f', '#161013'],
    accent: '#E090A8',
    accentSoft: '#F0B8C8',
    cool: '#F2D0D8',
    coolDeep: '#C06080',
  },
  {
    id: 'floresta',
    name: 'Floresta',
    hint: 'Musgo escuro',
    stops: ['#45524c', '#3a443f', '#2f3733', '#242a27', '#1a1e1c', '#111413'],
    accent: '#7EAF90',
    accentSoft: '#A8CDB6',
    cool: '#C4DCCE',
    coolDeep: '#4E7A62',
  },
  {
    id: 'ambar',
    name: 'Ambar',
    hint: 'Carvao quente',
    stops: ['#564c42', '#473f37', '#39332d', '#2b2722', '#1e1b18', '#141210'],
    accent: '#F5A524',
    accentSoft: '#FFC15E',
    cool: '#E8D4B0',
    coolDeep: '#C4904A',
  },
  {
    id: 'ametista',
    name: 'Ametista',
    hint: 'Violeta de atelier',
    stops: ['#4e4758', '#413c4a', '#34313c', '#28262f', '#1c1b21', '#131216'],
    accent: '#B49AD4',
    accentSoft: '#CDB8E4',
    cool: '#D8CCE8',
    coolDeep: '#7A68A0',
  },
  {
    id: 'obsidiana',
    name: 'Obsidiana',
    hint: 'Quase preto',
    stops: ['#3c3c44', '#313137', '#26262b', '#1c1c20', '#141416', '#0b0b0d'],
    accent: '#C4C4D0',
    accentSoft: '#E0E0E8',
    cool: '#D8DCE8',
    coolDeep: '#8A8A98',
  },
];

export const ATMOSPHERE_IDS = ATMOSPHERES.map((item) => item.id);

export function isAtmosphereId(id) {
  return ATMOSPHERE_IDS.includes(id);
}

export function atmosphereById(id) {
  return ATMOSPHERES.find((item) => item.id === id) || ATMOSPHERES[0];
}

export function atmosphereGradient(id) {
  const { stops } = atmosphereById(id);
  return (
    'radial-gradient(150% 130% at 8% -8%, ' +
    stops[0] +
    ' 0%, ' +
    stops[1] +
    ' 10%, ' +
    stops[2] +
    ' 30%, ' +
    stops[3] +
    ' 55%, ' +
    stops[4] +
    ' 78%, ' +
    stops[5] +
    ' 100%)'
  );
}

export function readAtmosphereId() {
  try {
    const id = readLocal(ATMOSPHERE_KEY);
    return ATMOSPHERES.some((item) => item.id === id) ? id : DEFAULT_ATMOSPHERE;
  } catch {
    return DEFAULT_ATMOSPHERE;
  }
}

export function applyAtmosphere(id) {
  const atmosphere = atmosphereById(id);
  const root = document.documentElement;
  root.dataset.atmosphere = atmosphere.id;
  atmosphere.stops.forEach((color, index) => {
    root.style.setProperty('--bg-' + index, color);
  });
  root.style.setProperty('--accent', atmosphere.accent);
  root.style.setProperty('--accent-soft', atmosphere.accentSoft);
  root.style.setProperty('--cool', atmosphere.cool);
  root.style.setProperty('--cool-deep', atmosphere.coolDeep);
  return atmosphere.id;
}

export function persistAtmosphere(id) {
  const next = applyAtmosphere(id);
  writeLocal(ATMOSPHERE_KEY, next);
  return next;
}
