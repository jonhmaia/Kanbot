import { useEffect } from 'react';
import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { DEFAULT_TAB, parseTaskLocation, taskPath } from '../../lib/taskScope';

export default function TasksLayout() {
  const { setTaskScope, setTaskTab } = useApp();
  const { pathname } = useLocation();

  useEffect(() => {
    const next = parseTaskLocation(pathname);
    if (!next) return;
    setTaskScope(next.scope);
    setTaskTab(next.tab);
  }, [pathname, setTaskScope, setTaskTab]);

  return (
    <div className="pl-[6.75rem] sm:pl-[7.5rem]">
      <Outlet />
    </div>
  );
}

export function RedirectToTasks({ tab }) {
  const { taskScope } = useApp();
  return <Navigate to={taskPath(taskScope, tab || DEFAULT_TAB)} replace />;
}

export function RedirectLegacyMaster() {
  return <Navigate to="/tasks/master" replace />;
}

export function RedirectLegacyProject() {
  const { projectId } = useParams();
  return <Navigate to={'/tasks/' + projectId} replace />;
}
