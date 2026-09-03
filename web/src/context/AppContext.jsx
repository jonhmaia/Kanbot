import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { cacheClear, cacheGet, cacheSet } from '../lib/cache';
import { draftProject } from '../lib/optimistic';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { applyAtmosphere, persistAtmosphere, readAtmosphereId } from '../lib/atmospheres';
import { DEFAULT_TAB, MASTER_SCOPE, TASK_SCOPE_KEY, TASK_TAB_KEY } from '../lib/taskScope';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [session, setSession] = useState(undefined);
  const [boot, setBoot] = useState(() => cacheGet('bootstrap'));
  const [projects, setProjects] = useState(() => cacheGet('bootstrap')?.projects || []);
  const [loading, setLoading] = useState(!cacheGet('bootstrap'));
  const [error, setError] = useState(null);
  const [workspaceId, setWorkspaceId] = useState(() => cacheGet('bootstrap')?.workspaces?.[0]?.id || null);
  const [taskScope, setTaskScopeState] = useState(() => cacheGet(TASK_SCOPE_KEY) || MASTER_SCOPE);
  const [taskTab, setTaskTabState] = useState(() => cacheGet(TASK_TAB_KEY) || DEFAULT_TAB);
  const [toast, setToast] = useState(null);
  const [atmosphere, setAtmosphereState] = useState(() => applyAtmosphere(readAtmosphereId()));

  const setTaskScope = useCallback((scope) => {
    const next = scope || MASTER_SCOPE;
    cacheSet(TASK_SCOPE_KEY, next);
    setTaskScopeState(next);
  }, []);

  const setTaskTab = useCallback((tab) => {
    const next = tab || DEFAULT_TAB;
    cacheSet(TASK_TAB_KEY, next);
    setTaskTabState(next);
  }, []);

  const setAtmosphere = useCallback((id) => {
    setAtmosphereState(persistAtmosphere(id));
  }, []);

  const notify = useCallback((message, tone = 'info') => {
    setToast({ message, tone, id: Date.now() });
    setTimeout(() => setToast((t) => (t && Date.now() - t.id >= 2600 ? null : t)), 2800);
  }, []);

  const applyBoot = useCallback((data) => {
    cacheSet('bootstrap', data);
    setBoot(data);
    setWorkspaceId((current) => current || data.workspaces[0]?.id || null);
    setProjects(data.projects);
    setError(null);
    return data;
  }, []);

  const loadBootstrap = useCallback(async () => {
    const data = await api.bootstrap();
    return applyBoot(data);
  }, [applyBoot]);

  const loadProjects = useCallback(async () => {
    const list = await api.projects(workspaceId);
    setProjects(list);
    setBoot((current) => {
      if (!current) return current;
      const next = { ...current, projects: list };
      cacheSet('bootstrap', next);
      return next;
    });
    return list;
  }, [workspaceId]);

  useEffect(() => {
    if (!supabaseConfigured) {
      setError('Faltam VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em web/.env.local');
      setLoading(false);
      setSession(null);
      return;
    }

    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session === undefined) return;
    if (!session) {
      cacheClear();
      setBoot(null);
      setProjects([]);
      setTaskScopeState(MASTER_SCOPE);
      setTaskTabState(DEFAULT_TAB);
      setLoading(false);
      return;
    }

    let alive = true;
    if (!cacheGet('bootstrap')) setLoading(true);
    loadBootstrap()
      .catch((e) => {
        if (alive && !cacheGet('bootstrap')) setError(e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [session, loadBootstrap]);

  useEffect(() => {
    if (taskScope === MASTER_SCOPE) return;
    if (!projects.length) return;
    if (!projects.some((p) => p.id === taskScope)) setTaskScope(MASTER_SCOPE);
  }, [projects, taskScope, setTaskScope]);

  const createProject = useCallback(
    async (payload) => {
      const draft = draftProject(payload, workspaceId);
      setProjects((list) => [...list, draft]);
      notify('Projeto "' + draft.name + '" criado', 'success');
      try {
        const project = await api.createProject({ ...payload, workspaceId });
        setProjects((list) => list.map((p) => (p.id === draft.id ? project : p)));
        return project;
      } catch (e) {
        setProjects((list) => list.filter((p) => p.id !== draft.id));
        notify(e.message, 'warn');
        throw e;
      }
    },
    [workspaceId, notify],
  );

  const updateProject = useCallback(
    async (id, patch) => {
      setProjects((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p)));
      try {
        const next = await api.updateProject(id, patch);
        setProjects((list) => list.map((p) => (p.id === id ? { ...p, ...next } : p)));
      } catch (e) {
        notify(e.message, 'warn');
        loadProjects();
      }
    },
    [loadProjects, notify],
  );

  const removeProject = useCallback(
    async (id) => {
      let snapshot = [];
      setProjects((list) => {
        snapshot = list;
        return list.filter((p) => p.id !== id);
      });
      if (id === taskScope) setTaskScope(MASTER_SCOPE);
      notify('Projeto removido', 'warn');
      try {
        await api.deleteProject(id);
      } catch (e) {
        setProjects(snapshot);
        notify(e.message, 'warn');
      }
    },
    [notify, taskScope, setTaskScope],
  );

  const signOut = useCallback(async () => {
    await api.signOut();
    cacheClear();
    setBoot(null);
    setProjects([]);
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({
      session,
      loading,
      error,
      currentUser: boot?.currentUser ?? null,
      members: boot?.members ?? [],
      workspaces: boot?.workspaces ?? [],
      notifications: boot?.notifications ?? [],
      statuses: boot?.statuses ?? [],
      workspaceId,
      setWorkspaceId,
      taskScope,
      setTaskScope,
      taskTab,
      setTaskTab,
      projects,
      loadProjects,
      loadBootstrap,
      createProject,
      updateProject,
      removeProject,
      signOut,
      atmosphere,
      setAtmosphere,
      toast,
      notify,
    }),
    [
      session,
      loading,
      error,
      boot,
      workspaceId,
      taskScope,
      setTaskScope,
      taskTab,
      setTaskTab,
      projects,
      loadProjects,
      loadBootstrap,
      createProject,
      updateProject,
      removeProject,
      signOut,
      atmosphere,
      setAtmosphere,
      toast,
      notify,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp precisa estar dentro de <AppProvider>');
  return ctx;
}
