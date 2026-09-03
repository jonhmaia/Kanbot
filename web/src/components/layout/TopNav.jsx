import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { IconBell, IconGrid, IconLogo, IconSpark, IconSwatch } from '../../lib/icons';
import { ATMOSPHERES } from '../../lib/atmospheres';
import { useApp } from '../../context/AppContext';
import { useChat } from '../../context/ChatContext';
import AtmospherePicker from '../settings/AtmospherePicker';
import { Avatar, Dropdown } from '../ui/Primitives';
import { MenuPortal, useMenu } from '../ui/MenuPortal';
import { relativeTime } from '../../lib/format';
import { DEFAULT_TAB, parseTaskLocation, TASK_TABS, taskPath } from '../../lib/taskScope';

function ProjectPicker() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { projects, taskScope, setTaskScope } = useApp();
  const options = [
    { value: 'master', label: 'Master', hint: 'Todos' },
    ...projects.map((p) => ({ value: p.id, label: p.name, hint: p.key, dot: p.color })),
  ];

  const onChange = (value) => {
    setTaskScope(value);
    const parsed = parseTaskLocation(pathname);
    if (parsed) navigate(taskPath(value, parsed.tab));
  };

  return (
    <Dropdown
      value={taskScope}
      options={options}
      onChange={onChange}
      label="Projeto"
      align="left"
      icon={<IconGrid size={13} className="text-dust" />}
      triggerClassName="flex items-center gap-2 rounded-full border border-line bg-white/[0.05] py-1.5 pl-3 pr-2.5 text-[13px] text-chalk/90 transition hover:border-white/20 hover:bg-white/[0.08]"
      footer={(close) => (
        <button
          type="button"
          onClick={() => {
            close();
            navigate('/projects');
          }}
          className="flex w-full items-center rounded-xl px-2.5 py-2 text-left text-[12.5px] text-dust transition hover:bg-white/[0.06] hover:text-chalk"
        >
          Gerenciar projetos
        </button>
      )}
    />
  );
}

function AtmosphereMenu() {
  const { atmosphere } = useApp();
  const menu = useMenu();
  const current = ATMOSPHERES.find((item) => item.id === atmosphere) || ATMOSPHERES[0];

  return (
    <>
      <button
        ref={menu.triggerRef}
        type="button"
        onClick={menu.toggle}
        className="relative grid h-9 w-9 place-items-center rounded-full border border-line bg-white/[0.05] text-dust transition hover:border-white/20 hover:text-chalk"
        aria-label="Mudar fundo"
        title={current.name}
      >
        <IconSwatch size={15} />
      </button>
      <MenuPortal
        open={menu.open}
        onClose={menu.close}
        triggerRef={menu.triggerRef}
        panelRef={menu.panelRef}
        align="right"
        minWidth={300}
        role="dialog"
        className="p-3"
      >
        <p className="px-0.5 pb-2 text-[11px] uppercase tracking-[0.14em] text-smoke">Fundo</p>
        <AtmospherePicker compact onPick={menu.close} />
      </MenuPortal>
    </>
  );
}

function NotificationBell() {
  const { notifications } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative grid h-9 w-9 place-items-center rounded-full border border-line bg-white/[0.05] text-dust transition hover:border-white/20 hover:text-chalk"
        aria-label="Notificacoes"
      >
        <IconBell size={16} />
        {unread > 0 && (
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-amber shadow-[0_0_0_2px_rgba(20,20,21,1)]" />
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[290px] animate-floatIn rounded-2xl border border-line bg-[#191919]/95 p-2 shadow-lift backdrop-blur-2xl">
          <p className="px-2 py-1.5 text-[11px] uppercase tracking-[0.14em] text-smoke">Notificacoes</p>
          {notifications.map((n) => (
            <div key={n.id} className="flex gap-2.5 rounded-xl px-2.5 py-2.5 transition hover:bg-white/[0.05]">
              <i className={'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ' + (n.read ? 'bg-white/20' : 'bg-amber')} />
              <div className="min-w-0">
                <p className="text-[12.5px] leading-snug text-chalk/90">{n.title}</p>
                <p className="mt-0.5 text-[11px] text-smoke">ha {relativeTime(n.at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ModuleTabs({ scope, className }) {
  return (
    <div className={className}>
      {TASK_TABS.map((tab) => (
        <NavLink
          key={tab.id}
          to={taskPath(scope, tab.id)}
          end={tab.id === 'board'}
          className={({ isActive }) =>
            'nav-item shrink-0 border border-transparent ' + (isActive ? 'nav-item-active !border-line' : '')
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </div>
  );
}

export default function TopNav() {
  const { currentUser, signOut, taskScope } = useApp();
  const { toggle, open, thinking } = useChat();
  const { pathname } = useLocation();
  const inTasks = pathname.startsWith('/tasks');
  const parsed = parseTaskLocation(pathname);
  const activeScope = parsed?.scope || taskScope;

  return (
    <header className="sticky top-0 z-30 px-5 pt-4 sm:px-7 sm:pt-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <IconLogo size={30} />
          <ProjectPicker />
        </div>

        <nav className="hidden flex-1 items-center justify-center xl:flex">
          <div className="flex items-center gap-0.5 rounded-full border border-lineSoft bg-white/[0.025] p-1 backdrop-blur-xl">
            <NavLink
              to={taskPath(taskScope, DEFAULT_TAB)}
              className={() => 'nav-item ' + (inTasks ? 'nav-item-active' : '')}
            >
              Tarefas
            </NavLink>
            <NavLink
              to="/settings"
              className={({ isActive }) => 'nav-item ' + (isActive ? 'nav-item-active' : '')}
            >
              Settings
            </NavLink>
          </div>
        </nav>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={toggle}
            className={
              'relative grid h-9 w-9 place-items-center rounded-full border transition ' +
              (open
                ? 'border-amber/40 bg-amber-btn text-[#191100]'
                : 'border-line bg-white/[0.05] text-dust hover:border-white/20 hover:text-chalk')
            }
            aria-label={open ? 'Fechar chat' : 'Abrir chat'}
            title="Chat"
          >
            <IconSpark size={15} />
            {thinking && !open && (
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 animate-pulseSoft rounded-full bg-amber" />
            )}
          </button>
          <AtmosphereMenu />
          <NotificationBell />
          <button
            type="button"
            title="Sair"
            onClick={signOut}
            className="rounded-full ring-1 ring-white/15 transition hover:ring-white/35"
          >
            <Avatar member={currentUser} size={34} ring={false} />
          </button>
        </div>
      </div>

      <nav className="no-scrollbar mt-3 flex gap-1 overflow-x-auto xl:hidden">
        <NavLink
          to={taskPath(taskScope, DEFAULT_TAB)}
          className={() =>
            'nav-item shrink-0 border border-transparent ' + (inTasks ? 'nav-item-active !border-line' : '')
          }
        >
          Tarefas
        </NavLink>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            'nav-item shrink-0 border border-transparent ' + (isActive ? 'nav-item-active !border-line' : '')
          }
        >
          Settings
        </NavLink>
      </nav>

      {inTasks && (
        <nav className="mt-3 flex justify-center">
          <ModuleTabs
            scope={activeScope}
            className="no-scrollbar flex gap-1 overflow-x-auto rounded-full border border-lineSoft bg-white/[0.025] p-1 backdrop-blur-xl xl:gap-0.5"
          />
        </nav>
      )}
    </header>
  );
}
