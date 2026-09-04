import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { IconBell, IconGrid, IconLogo, IconLogout, IconSettings, IconSwatch, IconUser } from '../../lib/icons';
import { ATMOSPHERES } from '../../lib/atmospheres';
import { useApp } from '../../context/AppContext';
import AtmospherePicker from '../settings/AtmospherePicker';
import { Avatar, Dropdown } from '../ui/Primitives';
import { MenuPortal, useMenu } from '../ui/MenuPortal';
import { relativeTime } from '../../lib/format';
import { DEFAULT_TAB, parseTaskLocation, taskPath } from '../../lib/taskScope';
import ModuleTabs from './ModuleTabs';

const NAV_PILL =
  'flex items-center justify-center gap-0.5 rounded-full border border-lineSoft bg-white/[0.025] p-1 backdrop-blur-xl';
const NAV_PILL_MOBILE =
  'no-scrollbar flex items-center justify-center gap-1 overflow-x-auto rounded-full border border-lineSoft bg-white/[0.025] p-1 backdrop-blur-xl';

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

function AppLinks({ inTasks, inProjects, taskScope, className = '' }) {
  return (
    <>
      <NavLink
        to="/projects"
        className={() => 'nav-item shrink-0 ' + className + (inProjects ? ' nav-item-active' : '')}
      >
        Projetos
      </NavLink>
      <NavLink
        to={taskPath(taskScope, DEFAULT_TAB)}
        className={() => 'nav-item shrink-0 ' + className + (inTasks ? ' nav-item-active' : '')}
      >
        Tarefas
      </NavLink>
      <NavLink
        to="/focus"
        className={({ isActive }) => 'nav-item shrink-0 ' + className + (isActive ? ' nav-item-active' : '')}
      >
        Foco
      </NavLink>
      <NavLink
        to="/settings"
        className={({ isActive }) => 'nav-item shrink-0 ' + className + (isActive ? ' nav-item-active' : '')}
      >
        Configuracoes
      </NavLink>
    </>
  );
}

function AccountMenu() {
  const { currentUser, signOut } = useApp();
  const navigate = useNavigate();
  const menu = useMenu();

  return (
    <>
      <button
        ref={menu.triggerRef}
        type="button"
        onClick={menu.toggle}
        className="rounded-full ring-1 ring-white/15 transition hover:ring-white/35"
        aria-label="Conta"
        title={currentUser?.name || 'Conta'}
      >
        <Avatar member={currentUser} size={34} ring={false} />
      </button>
      <MenuPortal
        open={menu.open}
        onClose={menu.close}
        triggerRef={menu.triggerRef}
        panelRef={menu.panelRef}
        align="right"
        minWidth={220}
        role="menu"
        className="p-2"
      >
        <p className="truncate px-2.5 py-2 text-[12.5px] text-chalk">{currentUser?.name}</p>
        <p className="truncate px-2.5 pb-2 text-[11px] text-smoke">
          Nv. {currentUser?.level || 1} · {presenceLabel(currentUser?.presence)}
        </p>
        <button
          type="button"
          onClick={() => {
            menu.close();
            navigate('/me');
          }}
          className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[12.5px] text-dust hover:bg-white/[0.06] hover:text-chalk"
        >
          <IconUser size={14} /> Perfil
        </button>
        <button
          type="button"
          onClick={() => {
            menu.close();
            navigate('/settings');
          }}
          className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[12.5px] text-dust hover:bg-white/[0.06] hover:text-chalk"
        >
          <IconSettings size={14} /> Configuracoes
        </button>
        <button
          type="button"
          onClick={() => {
            menu.close();
            signOut();
          }}
          className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[12.5px] text-dust hover:bg-white/[0.06] hover:text-rose"
        >
          <IconLogout size={14} /> Sair
        </button>
      </MenuPortal>
    </>
  );
}

function presenceLabel(presence) {
  if (presence === 'focusing') return 'Em foco';
  if (presence === 'away') return 'Ausente';
  return 'Disponivel';
}

export default function TopNav() {
  const { taskScope } = useApp();
  const { pathname } = useLocation();
  const inTasks = pathname.startsWith('/tasks');
  const inProjects = pathname.startsWith('/projects');
  const parsed = parseTaskLocation(pathname);
  const activeScope = parsed?.scope || taskScope;

  return (
    <header className="sticky top-0 z-30 px-5 pt-4 sm:px-7 sm:pt-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/projects" aria-label="Ir para projetos" className="shrink-0">
            <IconLogo size={30} />
          </Link>
          <ProjectPicker />
        </div>

        <div className="hidden flex-col items-stretch gap-2 xl:flex">
          <nav className={NAV_PILL}>
            <AppLinks inTasks={inTasks} inProjects={inProjects} taskScope={taskScope} />
          </nav>
          {inTasks && <ModuleTabs scope={activeScope} className={NAV_PILL} />}
        </div>

        <div className="col-start-3 flex items-center justify-end gap-2.5">
          <AtmosphereMenu />
          <NotificationBell />
          <AccountMenu />
        </div>
      </div>

      <div className="mt-3 flex justify-center xl:hidden">
        <div className="flex min-w-0 max-w-full flex-col items-stretch gap-2">
          <nav className={NAV_PILL_MOBILE}>
            <AppLinks
              inTasks={inTasks}
              inProjects={inProjects}
              taskScope={taskScope}
              className="border border-transparent"
            />
          </nav>
          {inTasks && <ModuleTabs scope={activeScope} className={NAV_PILL_MOBILE} />}
        </div>
      </div>
    </header>
  );
}
