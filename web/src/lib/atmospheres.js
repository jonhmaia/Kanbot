export const ATMOSPHERE_KEY = 'kanbot:atmosphere';
export const DEFAULT_ATMOSPHERE = 'grafite';

/** Mesmo radial-gradient do fundo: 6 stops, do highlight ao canto escuro. */
export const ATMOSPHERES = [
  {
    id: 'grafite',
    name: 'Grafite',
    hint: 'O cinza original',
    stops: ['#4a4a52', '#3e3e44', '#313136', '#262629', '#1b1b1e', '#131315'],
  },
  {
    id: 'ardosia',
    name: 'Ardosia',
    hint: 'Pedra fria',
    stops: ['#4a5360', '#3e4650', '#323843', '#262c33', '#1b1f25', '#12151a'],
  },
  {
    id: 'marinho',
    name: 'Marinho',
    hint: 'Noite profunda',
    stops: ['#44526a', '#384456', '#2d3646', '#222834', '#181c25', '#0f1218'],
  },
  {
    id: 'vinho',
    name: 'Vinho',
    hint: 'Borgonha noturno',
    stops: ['#5a454c', '#4a393f', '#3b2e33', '#2c2327', '#1e191b', '#141011'],
  },
  {
    id: 'rosa',
    name: 'Rosa',
    hint: 'Blush noturno',
    stops: ['#7a4a5c', '#633d4c', '#4e313d', '#3a252e', '#26191f', '#161013'],
  },
  {
    id: 'floresta',
    name: 'Floresta',
    hint: 'Musgo escuro',
    stops: ['#45524c', '#3a443f', '#2f3733', '#242a27', '#1a1e1c', '#111413'],
  },
  {
    id: 'ambar',
    name: 'Ambar',
    hint: 'Carvao quente',
    stops: ['#564c42', '#473f37', '#39332d', '#2b2722', '#1e1b18', '#141210'],
  },
  {
    id: 'ametista',
    name: 'Ametista',
    hint: 'Violeta de atelier',
    stops: ['#4e4758', '#413c4a', '#34313c', '#28262f', '#1c1b21', '#131216'],
  },
  {
    id: 'obsidiana',
    name: 'Obsidiana',
    hint: 'Quase preto',
    stops: ['#3c3c44', '#313137', '#26262b', '#1c1c20', '#141416', '#0b0b0d'],
  },
];

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
    const id = localStorage.getItem(ATMOSPHERE_KEY);
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
  return atmosphere.id;
}

export function persistAtmosphere(id) {
  const next = applyAtmosphere(id);
  try {
    localStorage.setItem(ATMOSPHERE_KEY, next);
  } catch {
    /* quota / private mode */
  }
  return next;
}
