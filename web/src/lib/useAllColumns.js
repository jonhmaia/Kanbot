import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import { cacheGet, cacheSet } from './cache';

/**
 * Junta as colunas de todos os projetos em uma lista unica
 * ("Projeto — Coluna"), usada pelo criador rapido de tarefas.
 */
export default function useAllColumns() {
  const [columns, setColumns] = useState(() => cacheGet('all-columns') || []);
  const [ready, setReady] = useState(() => Boolean(cacheGet('all-columns')));

  const load = useCallback(async () => {
    const projects = await api.projects();
    const boards = await Promise.all(projects.map((p) => api.projectBoard(p.id)));
    const flat = boards.flatMap((b) =>
      b.columns.map((c) => ({ ...c, name: b.project.name + ' — ' + c.name, projectName: b.project.name })),
    );
    cacheSet('all-columns', flat);
    setColumns(flat);
    setReady(true);
    return flat;
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  return { columns, ready, load };
}
