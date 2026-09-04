import { readLocalJson, writeLocal, writeLocalJson } from './userPrefs';

export const FOCUS_KEY = 'kanbot:focus';
export const FOCUS_DAYS_KEY = 'kanbot:focus-days';
export const FOCUS_SETTINGS_KEY = 'kanbot:pomodoro';
export const FOCUS_SETUP_KEY = 'kanbot:focus-setup';
export const FOCUS_HISTORY_KEY = 'kanbot:focus-history';
const HISTORY_LIMIT = 80;

export const DEFAULT_POMODORO = {
  focusMin: 25,
  shortBreakMin: 5,
  longBreakMin: 15,
  cyclesUntilLong: 4,
  autoStartBreaks: true,
  autoStartFocus: true,
  sound: true,
  desktopNotify: false,
  breakPresence: 'focusing',
  dailyGoalMin: 0,
};

export const POMODORO_PRESETS = [
  { id: 'classic', name: 'Classico', hint: '25 · 5 · 15', focusMin: 25, shortBreakMin: 5, longBreakMin: 15, cyclesUntilLong: 4 },
  { id: 'deep', name: 'Profundo', hint: '50 · 10 · 20', focusMin: 50, shortBreakMin: 10, longBreakMin: 20, cyclesUntilLong: 3 },
  { id: 'sprint', name: 'Sprint', hint: '15 · 3 · 10', focusMin: 15, shortBreakMin: 3, longBreakMin: 10, cyclesUntilLong: 4 },
  { id: 'flow', name: 'Flow', hint: '90 · 15 · 30', focusMin: 90, shortBreakMin: 15, longBreakMin: 30, cyclesUntilLong: 2 },
];

export function normalizePomodoro(raw = {}) {
  return {
    focusMin: clampInt(raw.focusMin, 1, 180, DEFAULT_POMODORO.focusMin),
    shortBreakMin: clampInt(raw.shortBreakMin, 1, 60, DEFAULT_POMODORO.shortBreakMin),
    longBreakMin: clampInt(raw.longBreakMin, 1, 90, DEFAULT_POMODORO.longBreakMin),
    cyclesUntilLong: clampInt(raw.cyclesUntilLong, 1, 12, DEFAULT_POMODORO.cyclesUntilLong),
    autoStartBreaks: raw.autoStartBreaks !== false,
    autoStartFocus: raw.autoStartFocus !== false,
    sound: raw.sound !== false,
    desktopNotify: raw.desktopNotify === true,
    breakPresence: raw.breakPresence === 'available' ? 'available' : 'focusing',
    dailyGoalMin: clampInt(raw.dailyGoalMin, 0, 720, 0),
  };
}

export function matchingPreset(settings) {
  return (
    POMODORO_PRESETS.find(
      (item) =>
        item.focusMin === settings.focusMin &&
        item.shortBreakMin === settings.shortBreakMin &&
        item.longBreakMin === settings.longBreakMin &&
        item.cyclesUntilLong === settings.cyclesUntilLong,
    ) || null
  );
}

export function sessionStamp(state) {
  if (!state) return '';
  return [
    state.status,
    state.phase,
    state.phaseId,
    state.endsAt,
    state.remainingMs,
    state.currentTaskId,
    state.cycle,
    (state.completedBlocks || []).length,
    (state.tasks || []).length,
  ].join('|');
}

export function todayFocusMinutes(entries = []) {
  const key = new Date().toISOString().slice(0, 10);
  return entries.reduce((sum, entry) => {
    const at = new Date(entry.endedAt || entry.startedAt);
    if (Number.isNaN(at.getTime()) || at.toISOString().slice(0, 10) !== key) return sum;
    return sum + (Number(entry.focusMinutes) || 0);
  }, 0);
}

export function playFocusCue(kind) {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = kind === 'break' ? 523 : 392;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.07, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.32);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.36);
    osc.onended = () => ctx.close().catch(() => {});
  } catch {
    /* autoplay / unsupported */
  }
}

export function notifyFocusPhase(phase, minutes) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try {
    new Notification(phase === 'break' ? 'Kanbot · Pausa' : 'Kanbot · Foco', {
      body: minutes + ' min',
      silent: true,
    });
  } catch {
    /* ignore */
  }
}

export function askNotifyPermission() {
  if (typeof Notification === 'undefined' || Notification.permission !== 'default') return;
  Notification.requestPermission().catch(() => {});
}

export function emptyFocus() {
  return {
    status: 'idle',
    phase: 'focus',
    phaseId: 0,
    endsAt: null,
    remainingMs: 0,
    startedAt: null,
    sessionStartedAt: null,
    taskIds: [],
    tasks: [],
    currentTaskId: null,
    cycle: 0,
    completedBlocks: [],
    settings: { ...DEFAULT_POMODORO },
  };
}

export function clampInt(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function readPomodoro() {
  return normalizePomodoro(readLocalJson(FOCUS_SETTINGS_KEY, {}) || {});
}

export function readFocusSetup() {
  const raw = readLocalJson(FOCUS_SETUP_KEY, null);
  return Array.isArray(raw) ? raw.filter((task) => task?.id) : [];
}

export function writeFocusSetup(tasks) {
  if (!tasks?.length) writeLocal(FOCUS_SETUP_KEY, null);
  else writeLocalJson(FOCUS_SETUP_KEY, tasks);
  return tasks || [];
}

export function persistPomodoro(patch) {
  const clean = normalizePomodoro({ ...readPomodoro(), ...patch });
  writeLocalJson(FOCUS_SETTINGS_KEY, clean);
  return clean;
}

export function readFocus() {
  const raw = readLocalJson(FOCUS_KEY, null);
  if (!raw || typeof raw !== 'object') return emptyFocus();
  const base = emptyFocus();
  return {
    ...base,
    ...raw,
    tasks: Array.isArray(raw.tasks) ? raw.tasks : [],
    settings: normalizePomodoro({ ...base.settings, ...raw.settings }),
  };
}

export function writeFocus(state) {
  writeLocalJson(FOCUS_KEY, state);
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
    projectColor: task.projectColor || '',
    loggedHours: Number(task.loggedHours) || 0,
  }));
}

export function readFocusDays() {
  const raw = readLocalJson(FOCUS_DAYS_KEY, {});
  return raw && typeof raw === 'object' ? raw : {};
}

export function bumpStreak(isoDay) {
  const days = readFocusDays();
  days[isoDay] = (days[isoDay] || 0) + 1;
  writeLocalJson(FOCUS_DAYS_KEY, days);
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

export function readFocusHistory() {
  const raw = readLocalJson(FOCUS_HISTORY_KEY, []);
  return Array.isArray(raw) ? raw : [];
}

export function writeFocusHistory(entries) {
  const list = (entries || []).slice(0, HISTORY_LIMIT);
  writeLocalJson(FOCUS_HISTORY_KEY, list);
  return list;
}

export function clearFocusHistory() {
  return writeFocusHistory([]);
}

export function archiveFocusSession(state, { reason = 'stopped', endedAt = Date.now() } = {}) {
  if (!state || state.status === 'idle') return readFocusHistory();
  const settings = state.settings || readPomodoro();
  const blocks = Array.isArray(state.completedBlocks) ? state.completedBlocks : [];
  const plannedMs = (settings.focusMin || 0) * 60 * 1000;
  let partialMin = 0;
  if (state.phase === 'focus' && (state.status === 'running' || state.status === 'paused' || state.status === 'transition')) {
    const left = remainingMs({ ...state, status: state.status === 'running' ? 'running' : 'paused' }, endedAt);
    partialMin = Math.max(0, Math.round(((plannedMs - left) / 60000) * 10) / 10);
  }
  const completedMin = blocks.reduce((sum, block) => sum + (Number(block.minutes) || 0), 0);
  const focusMinutes = Math.round((completedMin + partialMin) * 10) / 10;
  if (focusMinutes <= 0 && !blocks.length && !state.tasks?.length) return readFocusHistory();

  const entry = {
    id: state.phaseId || endedAt,
    startedAt: state.sessionStartedAt || state.startedAt || endedAt,
    endedAt,
    reason,
    focusMinutes,
    completedBlocks: blocks.length,
    focusMin: settings.focusMin,
    tasks: (state.tasks || []).map((task) => ({
      id: task.id,
      title: task.title,
      projectName: task.projectName || '',
    })),
  };
  const previous = readFocusHistory().filter((item) => item.id !== entry.id);
  return writeFocusHistory([entry, ...previous]);
}

export function formatSessionWhen(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Hoje, ' + time;
  if (date.toDateString() === yesterday.toDateString()) return 'Ontem, ' + time;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) + ', ' + time;
}

export function formatFocusMinutes(minutes) {
  const n = Number(minutes) || 0;
  if (n < 1) return Math.round(n * 60) + 's';
  if (n < 60) return (Number.isInteger(n) ? n : n.toFixed(1)) + ' min';
  const h = Math.floor(n / 60);
  const m = Math.round(n % 60);
  return m ? h + 'h ' + m + 'min' : h + 'h';
}

export function groupHistoryByDay(entries = []) {
  const groups = [];
  const index = {};
  entries.forEach((entry) => {
    const date = new Date(entry.endedAt || entry.startedAt);
    const key = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-');
    if (!index[key]) {
      index[key] = { key, entries: [] };
      groups.push(index[key]);
    }
    index[key].entries.push(entry);
  });
  return groups;
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
