import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { invokeDesktop } from '../../lib/desktop';
import { relativeTime } from '../../lib/format';
import { IconClose, IconGrid, IconLogo, IconSpark } from '../../lib/icons';

export default function IslandApp() {
  const { session, notifications, loadBootstrap } = useApp();
  const [expanded, setExpanded] = useState(false);
  const leaveTimer = useRef(null);
  const loggedIn = Boolean(session);
  const unread = notifications.filter((n) => !n.read).length;
  const recent = notifications.slice(0, 5);

  useEffect(() => {
    invokeDesktop('resize_island', { expanded: false });
    invokeDesktop('position_island');
  }, []);

  useEffect(() => {
    if (!loggedIn) return undefined;
    const id = setInterval(() => {
      loadBootstrap().catch(() => {});
    }, 20000);
    return () => clearInterval(id);
  }, [loggedIn, loadBootstrap]);

  const applyExpanded = async (next) => {
    if (next === expanded) return;
    await invokeDesktop('resize_island', { expanded: next });
    setExpanded(next);
  };

  const onEnter = () => {
    clearTimeout(leaveTimer.current);
    if (loggedIn) applyExpanded(true);
  };

  const onLeave = () => {
    clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => applyExpanded(false), 280);
  };

  const openMain = () => invokeDesktop('show_main');
  const openChat = () => invokeDesktop('open_chat');
  const quit = () => invokeDesktop('quit_app');

  return (
    <div
      className="flex h-full w-full select-none justify-center pt-1.5"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <div className={expanded ? 'w-[344px]' : 'w-[208px]'}>
        <button
          type="button"
          onClick={openMain}
          className="flex h-[40px] w-full items-center justify-center gap-2 rounded-full border border-white/12 bg-[#191919]/92 px-3 text-chalk shadow-[0_8px_28px_rgba(0,0,0,0.35)] backdrop-blur-2xl"
          aria-label={loggedIn ? 'Abrir Kanbot' : 'Entrar no Kanbot'}
        >
          <IconLogo size={22} />
          <span className="text-[13px] font-medium tracking-tight">
            {session === undefined ? 'Kanbot' : loggedIn ? 'Kanbot' : 'Entrar'}
          </span>
          {loggedIn && unread > 0 && (
            <span className="grid min-w-[18px] place-items-center rounded-full bg-amber-btn px-1.5 text-[10px] font-semibold text-[#191100]">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>

        {expanded && loggedIn && (
          <div className="mt-2 overflow-hidden rounded-[22px] border border-white/12 bg-[#191919]/94 shadow-[0_16px_40px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
            <div className="flex items-center justify-between px-3.5 pb-1 pt-3">
              <p className="text-[11px] uppercase tracking-[0.14em] text-smoke">Notificacoes</p>
              <button
                type="button"
                onClick={() => applyExpanded(false)}
                className="grid h-7 w-7 place-items-center rounded-full text-dust transition hover:bg-white/[0.06] hover:text-chalk"
                aria-label="Recolher"
              >
                <IconClose size={13} />
              </button>
            </div>

            <div className="max-h-[168px] space-y-0.5 overflow-y-auto px-2 pb-2">
              {recent.length === 0 && (
                <p className="px-2 py-4 text-center text-[12.5px] text-smoke">Nada novo por aqui</p>
              )}
              {recent.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={openMain}
                  className="flex w-full gap-2.5 rounded-xl px-2.5 py-2 text-left transition hover:bg-white/[0.06]"
                >
                  <i
                    className={
                      'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ' + (n.read ? 'bg-white/20' : 'bg-amber')
                    }
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-[12.5px] leading-snug text-chalk/90">{n.title}</span>
                    <span className="mt-0.5 block text-[11px] text-smoke">ha {relativeTime(n.at)}</span>
                  </span>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-1 border-t border-white/8 p-2">
              <button type="button" onClick={openMain} className="island-action">
                <IconGrid size={13} />
                Board
              </button>
              <button type="button" onClick={openChat} className="island-action">
                <IconSpark size={13} />
                Chat
              </button>
              <button type="button" onClick={quit} className="island-action text-rose/80 hover:text-rose">
                Sair
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
