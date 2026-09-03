export const FOCUS_KEY = 'kanbot:focus';
export const FOCUS_DAYS_KEY = 'kanbot:focus-days';
export const FOCUS_SETTINGS_KEY = 'kanbot:pomodoro';

export const DEFAULT_POMODORO = {
  focusMin: 25,
  shortBreakMin: 5,
  longBreakMin: 15,
  cyclesUntilLong: 4,
};

export function emptyFocus() {
  return {
    status: 'idle',
    phase: 'focus',
    phaseId: 0,
    endsAt: null,
    remainingMs: 0,
    startedAt: null,
    taskIds: [],
    tasks: [],
    currentTaskId: null,
    cycle: 0,
    settings: { ...DEFAULT_POMODORO },
  };
}

export function clampInt(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function readPomodoro() {
  try {
    const raw = JSON.parse(localStorage.getItem(FOCUS_SETTINGS_KEY) || '{}');
    return {
      focusMin: clampInt(raw.focusMin, 1, 90, DEFAULT_POMODORO.focusMin),
      shortBreakMin: clampInt(raw.shortBreakMin, 1, 30, DEFAULT_POMODORO.shortBreakMin),
      longBreakMin: clampInt(raw.longBreakMin, 1, 45, DEFAULT_POMODORO.longBreakMin),
      cyclesUntilLong: clampInt(raw.cyclesUntilLong, 1, 8, DEFAULT_POMODORO.cyclesUntilLong),
    };
  } catch {
    return { ...DEFAULT_POMODORO };
  }
}

export function persistPomodoro(patch) {
  const next = { ...readPomodoro(), ...patch };
  const clean = {
    focusMin: clampInt(next.focusMin, 1, 90, DEFAULT_POMODORO.focusMin),
    shortBreakMin: clampInt(next.shortBreakMin, 1, 30, DEFAULT_POMODORO.shortBreakMin),
    longBreakMin: clampInt(next.longBreakMin, 1, 45, DEFAULT_POMODORO.longBreakMin),
    cyclesUntilLong: clampInt(next.cyclesUntilLong, 1, 8, DEFAULT_POMODORO.cyclesUntilLong),
  };
  try {
    localStorage.setItem(FOCUS_SETTINGS_KEY, JSON.stringify(clean));
  } catch {
    /* quota / private mode */
  }
  return clean;
}

export function readFocus() {
  try {
    const raw = JSON.parse(localStorage.getItem(FOCUS_KEY) || 'null');
    if (!raw || typeof raw !== 'object') return emptyFocus();
    return { ...emptyFocus(), ...raw, tasks: Array.isArray(raw.tasks) ? raw.tasks : [] };
  } catch {
    return emptyFocus();
  }
}

export function writeFocus(state) {
  try {
    localStorage.setItem(FOCUS_KEY, JSON.stringify(state));
  } catch {
    /* quota / private mode */
  }
  return state;
}

export function remainingMs(state, now = Date.now()) {
  if (!state || state.status === 'idle') return 0;
  if (state.status === 'paused' || state.status === 'transition') return Math.max(0, state.remainingMs || 0);
  if (state.status === 'running' && state.endsAt) return Math.max(0, state.endsAt - now);
  return 0;
}

export function formatMmSs(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

export function snapshotTasks(tasks = []) {
  return tasks.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description || '',
    projectName: task.projectName || '',
    loggedHours: Number(task.loggedHours) || 0,
  }));
}

export function readFocusDays() {
  try {
    const raw = JSON.parse(localStorage.getItem(FOCUS_DAYS_KEY) || '{}');
    return raw && typeof raw === 'object' ? raw : {};
  } catch {
    return {};
  }
}

export function bumpStreak(isoDay) {
  const days = readFocusDays();
  days[isoDay] = (days[isoDay] || 0) + 1;
  try {
    localStorage.setItem(FOCUS_DAYS_KEY, JSON.stringify(days));
  } catch {
    /* quota / private mode */
  }
  return days;
}

export function streakCells(count = 35) {
  const days = readFocusDays();
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const cells = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    cells.push({ key, count: days[key] || 0 });
  }
  return cells;
}

export function currentTask(state) {
  if (!state?.currentTaskId) return state?.tasks?.[0] || null;
  return state.tasks.find((task) => task.id === state.currentTaskId) || state.tasks[0] || null;
}

export function phaseMinutes(state, phase = state.phase) {
  const settings = state.settings || readPomodoro();
  if (phase === 'break') {
    const long = state.cycle > 0 && state.cycle % settings.cyclesUntilLong === 0;
    return long ? settings.longBreakMin : settings.shortBreakMin;
  }
  return settings.focusMin;
}
