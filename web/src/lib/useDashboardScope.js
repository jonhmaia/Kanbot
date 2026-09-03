import { useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from './api';
import { useCached } from './useCached';
import { dashboardCacheKey, dashboardProjectId, MASTER_SCOPE, parseTaskLocation } from './taskScope';

export default function useDashboardScope() {
  const { pathname } = useLocation();
  const scope = parseTaskLocation(pathname)?.scope || MASTER_SCOPE;
  const projectId = dashboardProjectId(scope);
  const fetchDash = useCallback(() => api.dashboard(projectId), [projectId]);
  const [data, setData, reload, error] = useCached(dashboardCacheKey(scope), fetchDash);

  return {
    scope,
    projectId,
    isMaster: !projectId,
    data,
    setData,
    reload,
    error,
  };
}
