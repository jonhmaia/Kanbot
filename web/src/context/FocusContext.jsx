import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api';
import { useApp } from './AppContext';
import { isDesktop, isIslandWindow, invokeDesktop } from '../lib/desktop';
import { publishFocusBus, subscribeFocusBus, subscribeIslandPrefsBus } from '../lib/focusBus';
import { setPrefUser } from '../lib/userPrefs';
import {
  FOCUS_DAYS_KEY,
  FOCUS_KEY,
  FOCUS_SETTINGS_KEY,
  FOCUS_SETUP_KEY,
  FOCUS_HISTORY_KEY,
  archiveFocusSession,
  askNotifyPermission,
  bumpStreak,
  clearFocusHistory,
  currentTask,
  emptyFocus,
  formatMmSs,
  notifyFocusPhase,
  persistPomodoro,
  phaseMinutes,
  playFocusCue,
  readFocus,
  readFocusDays,
  readFocusHistory,
  readFocusSetup,
  readPomodoro,
  remainingMs,
  sessionStamp,
  snapshotTasks,
  streakCells,
  writeFocus,
  writeFocusSetup,
} from '../lib/focusSession';
import {
  ISLAND_KEY,
  ISLAND_PROJECT_KEY,
  persistIslandPrefs,
  readIslandPrefs,
  readIslandProject,
  resolveIslandAccent,
} from '../lib/islandPrefs';

const FocusContext = createContext(null);
const isMirror = typeof window !== 'undefined' && isIslandWindow();

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function sameJson(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function applyIslandChrome(prefs) {
  if (!isDesktop() || isMirror) return;
  invokeDesktop(prefs.visible ? 'show_island' : 'hide_island');
  if (prefs.visible) invokeDesktop('resize_island', { expanded: false, edge: prefs.edge });
}

function cuePhase(phase, minutes, settings) {
  if (isMirror) return;
  if (settings?.sound) playFocusCue(phase);
  if (settings?.desktopNotify) notifyFocusPhase(phase, minutes);
}

export function FocusProvider({ children }) {
  const { session: authSession, refreshCurrentUser } = useApp();
  const userId = authSession?.user?.id || null;
  const [prefs, setPrefs] = useState(readIslandPrefs);
  const [islandProject, setIslandProject] = useState(readIslandProject);
  const [pomodoro, setPomodoro] = useState(readPomodoro);
  const [session, setSession] = useState(readFocus);
  const [pendingTasks, setPendingTasks] = useState(readFocusSetup);
  const [history, setHistory] = useState(readFocusHistory);
  const [days, setDays] = useState(readFocusDays);
  const [now, setNow] = useState(Date.now());
  const completing = useRef(false);
  const sessionRef = useRef(session);
  const completePhaseRef = useRef(() => {});
  sessionRef.current = session;

  const hydrate = useCallback(() => {
    const nextPrefs = readIslandPrefs();
    const nextProject = readIslandProject();
    const nextPomodoro = readPomodoro();
    const nextSetup = readFocusSetup();
    const nextHistory = readFocusHistory();
    const nextDays = readFocusDays();
    const nextFocus = readFocus();
    setPrefs((current) => (sameJson(current, nextPrefs) ? current : nextPrefs));
    setIslandProject((current) => (sameJson(current, nextProject) ? current : nextProject));
    setPomodoro((current) => (sameJson(current, nextPomodoro) ? current : nextPomodoro));
    setPendingTasks((current) => (sameJson(current, nextSetup) ? current : nextSetup));
    setHistory((current) => (sameJson(current, nextHistory) ? current : nextHistory));
    setDays((current) => (sameJson(current, nextDays) ? current : nextDays));
    if (sessionStamp(nextFocus) !== sessionStamp(sessionRef.current)) setSession(nextFocus);
  }, []);

  useEffect(() => {
    setPrefUser(userId);
    hydrate();
    if (!isMirror) applyIslandChrome(readIslandPrefs());
    if (!userId) return;
    api.listFocusHistory().then((rows) => {
      if (rows?.length) setHistory(rows);
    }).catch(() => {});
  }, [userId, hydrate]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const syncProject = () => setIslandProject(readIslandProject());
    const onStorage = (e) => {
      if (!e.key || !e.key.startsWith('kanbot:')) return;
      if (e.key.startsWith(FOCUS_KEY) && !e.key.startsWith(FOCUS_SETUP_KEY) && !e.key.startsWith(FOCUS_DAYS_KEY) && !e.key.startsWith(FOCUS_HISTORY_KEY)) {
        const next = readFocus();
        if (sessionStamp(next) !== sessionStamp(sessionRef.current)) setSession(next);
      }
      if (e.key.startsWith(FOCUS_SETUP_KEY)) setPendingTasks(readFocusSetup());
      if (e.key.startsWith(ISLAND_KEY) && !e.key.startsWith(ISLAND_PROJECT_KEY)) setPrefs(readIslandPrefs());
      if (e.key.startsWith(ISLAND_PROJECT_KEY)) syncProject();
      if (e.key.startsWith(FOCUS_SETTINGS_KEY)) setPomodoro(readPomodoro());
      if (e.key.startsWith(FOCUS_DAYS_KEY)) setDays(readFocusDays());
      if (e.key.startsWith(FOCUS_HISTORY_KEY)) setHistory(readFocusHistory());
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('kanbot-island-project', syncProject);
    let stopDesktop = () => {};
    import('../lib/desktop').then(({ listenDesktop }) =>
      listenDesktop('island-project', syncProject).then((unlisten) => {
        stopDesktop = unlisten;
      }),
    );
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('kanbot-island-project', syncProject);
      stopDesktop();
    };
  }, []);

  useEffect(() => {
    const stopFocus = subscribeFocusBus((payload) => {
      if (!payload) return;
      if (payload.kind === 'session' && payload.state) {
        if (sessionStamp(payload.state) === sessionStamp(sessionRef.current)) return;
        setSession(payload.state);
        return;
      }
      if (payload.kind === 'setup') {
        setPendingTasks(Array.isArray(payload.tasks) ? payload.tasks : readFocusSetup());
        return;
      }
      if (payload.kind === 'pomodoro' && payload.settings) {
        setPomodoro(payload.settings);
        return;
      }
      if (payload.kind === 'command' && !isMirror && payload.action === 'skip') {
        completePhaseRef.current({ skip: true });
      }
    });
    const stopPrefs = subscribeIslandPrefsBus((next) => {
      if (!next) return;
      setPrefs(next);
    });
    return () => {
      stopFocus();
      stopPrefs();
    };
  }, []);

  useEffect(() => {
    if (!isDesktop()) return;
    const id = setInterval(hydrate, 1000);
    return () => clearInterval(id);
  }, [hydrate]);

  const commit = useCallback((next) => {
    writeFocus(next);
    setSession(next);
    publishFocusBus({ kind: 'session', state: next });
    return next;
  }, []);

  const requestFocus = useCallback((tasks) => {
    const list = snapshotTasks(tasks).filter((task) => task.id);
    if (!list.length) return;
    writeFocusSetup(list);
    setPendingTasks(list);
    publishFocusBus({ kind: 'setup', tasks: list });
    if (isMirror) invokeDesktop('show_main');
  }, []);

  const dismissSetup = useCallback(() => {
    writeFocusSetup([]);
    setPendingTasks([]);
    publishFocusBus({ kind: 'setup', tasks: [] });
  }, []);

  const startFocus = useCallback(
    (tasks, settingsPatch) => {
      const list = snapshotTasks(tasks).filter((task) => task.id);
      if (!list.length) return;
      const settings = settingsPatch ? persistPomodoro(settingsPatch) : readPomodoro();
      if (settingsPatch) {
        setPomodoro(settings);
        publishFocusBus({ kind: 'pomodoro', settings });
      }
      const ms = settings.focusMin * 60 * 1000;
      const startedAt = Date.now();
      completing.current = false;
      writeFocusSetup([]);
      setPendingTasks([]);
      publishFocusBus({ kind: 'setup', tasks: [] });
      api.setPresence('focusing').then(() => refreshCurrentUser?.()).catch(() => {});
      commit({
        status: 'running',
        phase: 'focus',
        phaseId: startedAt,
        startedAt,
        sessionStartedAt: startedAt,
        endsAt: startedAt + ms,
        remainingMs: ms,
        taskIds: list.map((task) => task.id),
        tasks: list,
        currentTaskId: list[0].id,
        cycle: 0,
        completedBlocks: [],
        settings,
      });
    },
    [commit, refreshCurrentUser],
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
    if (current.phase === 'focus') {
      api.setPresence('focusing').catch(() => {});
    }
    commit({
      ...current,
      status: 'running',
      remainingMs: left,
      endsAt: Date.now() + left,
    });
  }, [commit]);

  const stop = useCallback(() => {
    completing.current = false;
    const current = readFocus();
    const entries = archiveFocusSession(current, { reason: 'stopped' });
    setHistory(entries);
    commit(emptyFocus());
    api.setPresence('available').then(() => refreshCurrentUser?.()).catch(() => {});
    const latest = entries[0];
    if (latest && latest.focusMinutes > 0) {
      api.recordFocusSession(latest)
        .then(() => refreshCurrentUser?.())
        .catch(() => {});
    }
  }, [commit, refreshCurrentUser]);

  const clearHistory = useCallback(() => {
    setHistory(clearFocusHistory());
  }, []);

  const switchTask = useCallback(
    (taskId) => {
      const current = readFocus();
      if (!current.tasks.some((task) => task.id === taskId)) return;
      commit({ ...current, currentTaskId: taskId });
    },
    [commit],
  );

  const applySettingsToSession = useCallback(
    (settings) => {
      const current = readFocus();
      if (current.status === 'idle') return;
      const planned = phaseMinutes(current) * 60 * 1000;
      const left = remainingMs(current);
      const elapsed = Math.max(0, planned - left);
      const nextMs = Math.max(1000, phaseMinutes({ ...current, settings }, current.phase) * 60 * 1000 - elapsed);
      commit({
        ...current,
        settings,
        remainingMs: nextMs,
        endsAt: current.status === 'running' ? Date.now() + nextMs : null,
      });
    },
    [commit],
  );

  const completePhase = useCallback(
    async ({ skip = false } = {}) => {
      if (isMirror) return;
      const current = readFocus();
      if (current.status === 'idle') return;
      const left = remainingMs(current);
      if (!skip && (current.status !== 'running' || left > 0)) return;
      if (completing.current) return;
      completing.current = true;
      commit({ ...current, status: 'transition', remainingMs: 0, endsAt: null });

      const settings = current.settings || readPomodoro();
      const plannedMin = current.phase === 'focus' ? settings.focusMin || 25 : phaseMinutes(current, 'break');
      const plannedMs = plannedMin * 60 * 1000;
      const elapsedMin = skip
        ? Math.max(0, Math.round(((plannedMs - left) / 60000) * 10) / 10)
        : plannedMin;

      let tasks = current.tasks;
      let completedBlocks = Array.isArray(current.completedBlocks) ? current.completedBlocks : [];
      if (current.phase === 'focus' && current.currentTaskId && elapsedMin > 0) {
        const task = current.tasks.find((item) => item.id === current.currentTaskId);
        try {
          const updated = await api.updateTask(current.currentTaskId, {
            loggedHours: (Number(task?.loggedHours) || 0) + elapsedMin / 60,
          });
          tasks = current.tasks.map((item) =>
            item.id === updated.id ? { ...item, loggedHours: updated.loggedHours } : item,
          );
        } catch {
          /* offline / RLS */
        }
        completedBlocks = [
          ...completedBlocks,
          {
            taskId: current.currentTaskId,
            title: task?.title || 'Foco',
            minutes: elapsedMin,
            at: Date.now(),
          },
        ];
        setDays(bumpStreak(todayKey()));
      }

      const nextCycle = current.phase === 'focus' ? current.cycle + 1 : current.cycle;
      const nextPhase = current.phase === 'focus' ? 'break' : 'focus';
      const minutes = phaseMinutes({ ...current, cycle: nextCycle, settings }, nextPhase);
      const ms = minutes * 60 * 1000;
      const autoStart = nextPhase === 'break' ? settings.autoStartBreaks !== false : settings.autoStartFocus !== false;
      completing.current = false;
      commit({
        ...current,
        tasks,
        completedBlocks,
        status: autoStart ? 'running' : 'paused',
        phase: nextPhase,
        phaseId: Date.now(),
        cycle: nextCycle,
        startedAt: Date.now(),
        endsAt: autoStart ? Date.now() + ms : null,
        remainingMs: ms,
        settings,
      });

      if (nextPhase === 'break') {
        api.setPresence(settings.breakPresence || 'focusing').then(() => refreshCurrentUser?.()).catch(() => {});
      } else {
        api.setPresence('focusing').then(() => refreshCurrentUser?.()).catch(() => {});
      }
      cuePhase(nextPhase, minutes, settings);
    },
    [commit, refreshCurrentUser],
  );

  const skipPhase = useCallback(() => {
    if (isMirror) {
      publishFocusBus({ kind: 'command', action: 'skip' });
      return;
    }
    completePhase({ skip: true });
  }, [completePhase]);

  completePhaseRef.current = completePhase;

  useEffect(() => {
    if (isMirror) return;
    if (session.status !== 'running') return;
    if (remainingMs(session, now) > 0) return;
    completePhase();
  }, [session, now, completePhase]);

  const setIslandPrefs = useCallback((patch) => {
    const next = persistIslandPrefs(patch);
    setPrefs(next);
    if (patch.visible != null || patch.edge) applyIslandChrome(next);
    return next;
  }, []);

  const setPomodoroSettings = useCallback(
    (patch, { applyCurrent = false } = {}) => {
      const next = persistPomodoro(patch);
      setPomodoro(next);
      publishFocusBus({ kind: 'pomodoro', settings: next });
      if (next.desktopNotify) askNotifyPermission();
      if (applyCurrent) applySettingsToSession(next);
      return next;
    },
    [applySettingsToSession],
  );

  const left = remainingMs(session, now);
  const activeTask = currentTask(session);
  const accent = resolveIslandAccent(prefs, islandProject.color || activeTask?.projectColor);
  const value = useMemo(
    () => ({
      prefs,
      setIslandPrefs,
      projectColor: islandProject.color,
      accent,
      pomodoro,
      setPomodoroSettings,
      applySettingsToSession,
      session,
      remaining: left,
      clock: formatMmSs(left),
      activeTask,
      running: session.status === 'running',
      paused: session.status === 'paused',
      idle: session.status === 'idle',
      streak: streakCells(35),
      days,
      pendingTasks,
      history,
      requestFocus,
      dismissSetup,
      startFocus,
      pause,
      resume,
      stop,
      skipPhase,
      clearHistory,
      switchTask,
    }),
    [
      prefs,
      setIslandPrefs,
      islandProject,
      accent,
      activeTask,
      pomodoro,
      setPomodoroSettings,
      applySettingsToSession,
      session,
      left,
      days,
      pendingTasks,
      history,
      requestFocus,
      dismissSetup,
      startFocus,
      pause,
      resume,
      stop,
      skipPhase,
      clearHistory,
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
