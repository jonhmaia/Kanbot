import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api';
import {
  FOCUS_DAYS_KEY,
  FOCUS_KEY,
  FOCUS_SETTINGS_KEY,
  bumpStreak,
  currentTask,
  emptyFocus,
  formatMmSs,
  persistPomodoro,
  phaseMinutes,
  readFocus,
  readFocusDays,
  readPomodoro,
  remainingMs,
  snapshotTasks,
  streakCells,
  writeFocus,
} from '../lib/focusSession';
import { ISLAND_KEY, persistIslandPrefs, readIslandPrefs } from '../lib/islandPrefs';

const FocusContext = createContext(null);

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function FocusProvider({ children }) {
  const [prefs, setPrefs] = useState(readIslandPrefs);
  const [pomodoro, setPomodoro] = useState(readPomodoro);
  const [session, setSession] = useState(readFocus);
  const [days, setDays] = useState(readFocusDays);
  const [now, setNow] = useState(Date.now());
  const completing = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === FOCUS_KEY) setSession(readFocus());
      if (e.key === ISLAND_KEY) setPrefs(readIslandPrefs());
      if (e.key === FOCUS_SETTINGS_KEY) setPomodoro(readPomodoro());
      if (e.key === FOCUS_DAYS_KEY) setDays(readFocusDays());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const commit = useCallback((next) => {
    writeFocus(next);
    setSession(next);
    return next;
  }, []);

  const startFocus = useCallback(
    (tasks) => {
      const list = snapshotTasks(tasks).filter((task) => task.id);
      if (!list.length) return;
      const settings = readPomodoro();
      const ms = settings.focusMin * 60 * 1000;
      completing.current = false;
      commit({
        status: 'running',
        phase: 'focus',
        phaseId: Date.now(),
        startedAt: Date.now(),
        endsAt: Date.now() + ms,
        remainingMs: ms,
        taskIds: list.map((task) => task.id),
        tasks: list,
        currentTaskId: list[0].id,
        cycle: 0,
        settings,
      });
    },
    [commit],
  );

  const pause = useCallback(() => {
    const current = readFocus();
    if (current.status !== 'running') return;
    commit({
      ...current,
      status: 'paused',
      remainingMs: remainingMs(current),
      endsAt: null,
    });
  }, [commit]);

  const resume = useCallback(() => {
    const current = readFocus();
    if (current.status !== 'paused') return;
    const left = Math.max(1000, current.remainingMs || 0);
    commit({
      ...current,
      status: 'running',
      remainingMs: left,
      endsAt: Date.now() + left,
    });
  }, [commit]);

  const stop = useCallback(() => {
    completing.current = false;
    commit(emptyFocus());
  }, [commit]);

  const switchTask = useCallback(
    (taskId) => {
      const current = readFocus();
      if (!current.tasks.some((task) => task.id === taskId)) return;
      commit({ ...current, currentTaskId: taskId });
    },
    [commit],
  );

  const completePhase = useCallback(async () => {
    const current = readFocus();
    if (current.status !== 'running' || remainingMs(current) > 0) return;
    if (completing.current) return;
    completing.current = true;
    commit({ ...current, status: 'transition', remainingMs: 0, endsAt: null });

    let tasks = current.tasks;
    if (current.phase === 'focus' && current.currentTaskId) {
      const task = current.tasks.find((item) => item.id === current.currentTaskId);
      const hours = (current.settings?.focusMin || 25) / 60;
      try {
        const updated = await api.updateTask(current.currentTaskId, {
          loggedHours: (Number(task?.loggedHours) || 0) + hours,
        });
        tasks = current.tasks.map((item) =>
          item.id === updated.id ? { ...item, loggedHours: updated.loggedHours } : item,
        );
      } catch {
        /* offline / RLS */
      }
      setDays(bumpStreak(todayKey()));
    }

    const settings = current.settings || readPomodoro();
    const nextCycle = current.phase === 'focus' ? current.cycle + 1 : current.cycle;
    const nextPhase = current.phase === 'focus' ? 'break' : 'focus';
    const minutes = phaseMinutes({ ...current, cycle: nextCycle, settings }, nextPhase);
    const ms = minutes * 60 * 1000;
    completing.current = false;
    commit({
      ...current,
      tasks,
      status: 'running',
      phase: nextPhase,
      phaseId: Date.now(),
      cycle: nextCycle,
      startedAt: Date.now(),
      endsAt: Date.now() + ms,
      remainingMs: ms,
      settings,
    });
  }, [commit]);

  useEffect(() => {
    if (session.status !== 'running') return;
    if (remainingMs(session, now) > 0) return;
    completePhase();
  }, [session, now, completePhase]);

  const setIslandPrefs = useCallback((patch) => {
    const next = persistIslandPrefs(patch);
    setPrefs(next);
    return next;
  }, []);

  const setPomodoroSettings = useCallback((patch) => {
    const next = persistPomodoro(patch);
    setPomodoro(next);
    return next;
  }, []);

  const left = remainingMs(session, now);
  const value = useMemo(
    () => ({
      prefs,
      setIslandPrefs,
      pomodoro,
      setPomodoroSettings,
      session,
      remaining: left,
      clock: formatMmSs(left),
      activeTask: currentTask(session),
      running: session.status === 'running',
      paused: session.status === 'paused',
      idle: session.status === 'idle',
      streak: streakCells(35),
      days,
      startFocus,
      pause,
      resume,
      stop,
      switchTask,
    }),
    [
      prefs,
      setIslandPrefs,
      pomodoro,
      setPomodoroSettings,
      session,
      left,
      days,
      startFocus,
      pause,
      resume,
      stop,
      switchTask,
    ],
  );

  return <FocusContext.Provider value={value}>{children}</FocusContext.Provider>;
}

export function useFocus() {
  const ctx = useContext(FocusContext);
  if (!ctx) throw new Error('useFocus precisa estar dentro de <FocusProvider>');
  return ctx;
}
