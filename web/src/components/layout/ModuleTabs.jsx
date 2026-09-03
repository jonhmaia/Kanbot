import { NavLink } from 'react-router-dom';
import { TASK_TABS, taskPath } from '../../lib/taskScope';

export default function ModuleTabs({ scope, className, itemClassName = '' }) {
  return (
    <nav className={className}>
      {TASK_TABS.map((tab) => (
        <NavLink
          key={tab.id}
          to={taskPath(scope, tab.id)}
          end={tab.id === 'board'}
          className={({ isActive }) =>
            'nav-item shrink-0 border border-transparent ' +
            itemClassName +
            (isActive ? ' nav-item-active !border-line' : '')
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
