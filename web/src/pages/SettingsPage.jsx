import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader';
import { Avatar, Card } from '../components/ui/Primitives';
import { api } from '../lib/api';
import { useApp } from '../context/AppContext';
import { formatFocusMinutes } from '../lib/focusSession';
import { presenceMeta, xpProgress } from '../lib/profile';
import AtmospherePicker from '../components/settings/AtmospherePicker';
import PlanPicker from '../components/settings/PlanPicker';
import IslandPrefsCard from '../components/settings/IslandPrefsCard';
import McpCard from '../components/settings/McpCard';
import WindowsDownloadCard from '../components/settings/WindowsDownloadCard';
import {
  IconLogout,
  IconSettings,
  IconShield,
  IconSwatch,
  IconUser,
  IconUsers,
} from '../lib/icons';

const TABS = [
  { id: 'conta', label: 'Conta', icon: IconUser },
  { id: 'aparencia', label: 'Aparencia', icon: IconSwatch },
  { id: 'integracoes', label: 'Integracoes', icon: IconShield },
  { id: 'workspace', label: 'Workspace', icon: IconUsers },
];

function readTab() {
  if (typeof window === 'undefined') return 'conta';
  const hash = window.location.hash.replace('#', '');
  return TABS.some((tab) => tab.id === hash) ? hash : 'conta';
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { workspaces, workspaceId, members, statuses, projects, signOut, currentUser } = useApp();
  const [boards, setBoards] = useState([]);
  const [tab, setTab] = useState(readTab);
  const workspace = workspaces.find((w) => w.id === workspaceId) || workspaces[0];
  const presence = presenceMeta(currentUser?.presence);
  const xp = xpProgress(currentUser);

  useEffect(() => {
    if (window.location.hash.replace('#', '') === 'foco') {
      navigate('/focus', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const onHash = () => setTab(readTab());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (tab !== 'workspace' || !projects.length) return;
    let cancelled = false;
    Promise.all(projects.map((p) => api.projectBoard(p.id).catch(() => null))).then((rows) => {
      if (!cancelled) setBoards(rows.filter(Boolean));
    });
    return () => {
      cancelled = true;
    };
  }, [tab, projects]);

  const go = (id) => {
    setTab(id);
    if (typeof window !== 'undefined') window.history.replaceState(null, '', '#' + id);
  };

  return (
    <>
      <PageHeader title="Configuracoes" eyebrow="Conta, aparencia e workspace" />

      <div className="px-5 sm:px-7">
        <nav className="no-scrollbar flex items-center gap-1 overflow-x-auto rounded-full border border-lineSoft bg-white/[0.025] p-1 backdrop-blur-xl">
          {TABS.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => go(item.id)}
                className={'nav-item flex shrink-0 items-center gap-1.5 ' + (active ? 'nav-item-active' : '')}
              >
                <Icon size={13} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="px-5 pb-12 pt-5 sm:px-7">
        {tab === 'conta' && (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
            <Card className="grain overflow-hidden p-6 sm:p-7">
              <p className="text-[11px] uppercase tracking-[0.16em] text-smoke">Sessao</p>
              <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-center">
                <Avatar member={currentUser} size={72} />
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-[28px] tracking-tight text-chalk">{currentUser?.name || 'Conta'}</h2>
                  <p className="mt-1 truncate text-[13px] text-smoke">{currentUser?.email}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white/[0.04] px-2.5 py-1 text-[11.5px]"
                      style={{ color: presence.color }}
                    >
                      <i className="h-1.5 w-1.5 rounded-full" style={{ background: presence.color }} />
                      {presence.label}
                    </span>
                    {currentUser?.role && (
                      <span className="rounded-full border border-line bg-white/[0.04] px-2.5 py-1 text-[11.5px] text-dust">
                        {currentUser.role}
                      </span>
                    )}
                  </div>
                  {currentUser?.statusNote && (
                    <p className="mt-2 text-[12.5px] text-dust">{currentUser.statusNote}</p>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="metric !text-[36px]">Nv. {currentUser?.level || 1}</p>
                    <p className="metric-label mt-1">{currentUser?.xp || 0} XP</p>
                  </div>
                  <p className="text-[12px] text-smoke">{xp.into}/100 para o proximo nivel</p>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.07]">
                  <div className="h-full rounded-full bg-amber" style={{ width: Math.round(xp.ratio * 100) + '%' }} />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3">
                <MiniStat label="Concluidas" value={currentUser?.tasksCompleted || 0} />
                <MiniStat label="Foco" value={formatFocusMinutes(currentUser?.focusMinutes)} />
                <MiniStat label="Streak" value={(currentUser?.currentStreak || 0) + 'd'} />
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <Link to="/me" className="btn-primary">
                  Editar perfil
                </Link>
                <button type="button" onClick={signOut} className="btn-ghost">
                  <IconLogout size={14} /> Sair
                </button>
              </div>
            </Card>

            <div className="flex flex-col gap-4">
              <Card className="grain p-5">
                <p className="text-[11px] uppercase tracking-[0.16em] text-smoke">Workspace ativo</p>
                <p className="mt-3 font-display text-[22px] tracking-tight text-chalk">{workspace?.name || '—'}</p>
                <p className="mt-1 text-[12.5px] text-smoke">O plano fica salvo no workspace.</p>
                <div className="mt-4">
                  <PlanPicker compact />
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <MiniStat label="Projetos" value={projects.length} />
                  <MiniStat label="Pessoas" value={members.length} />
                </div>
                <p className="mt-4 text-[11.5px] leading-relaxed text-smoke">
                  Assistente: DeepSeek V4 Flash via OpenRouter
                </p>
              </Card>
              <WindowsDownloadCard />
            </div>
          </div>
        )}

        {tab === 'aparencia' && (
          <div className="mx-auto max-w-3xl space-y-4">
            <Card className="grain p-5 sm:p-6">
              <CardIntro
                icon={IconSwatch}
                title="Fundo"
                text="O gradiente continua o mesmo — muda so a temperatura. A escolha fica na sua conta e acompanha voce em qualquer aparelho."
              />
              <div className="mt-5">
                <AtmospherePicker />
              </div>
            </Card>
            <IslandPrefsCard />
          </div>
        )}

        {tab === 'integracoes' && (
          <div className="mx-auto max-w-3xl">
            <McpCard />
          </div>
        )}

        {tab === 'workspace' && (
          <div className="space-y-4">
            <Card className="grain p-5 sm:p-6">
              <CardIntro
                icon={IconUsers}
                title="Plano"
                text="A escolha vale para este workspace e fica gravada no banco. Donos e admins podem trocar."
              />
              <div className="mt-5">
                <PlanPicker />
              </div>
            </Card>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
            <Card className="grain p-5 sm:p-6">
              <CardIntro
                icon={IconSettings}
                title="Status do board master"
                text="Cada projeto tem as proprias colunas. O board master junta os cards pelo status que cada coluna aponta."
              />
              <div className="mt-5 space-y-3">
                {statuses.map((s) => {
                  const mapped = boards.flatMap((b) =>
                    b.columns.filter((c) => c.statusKey === s.key).map((c) => ({ ...c, project: b.project })),
                  );
                  return (
                    <div key={s.key} className="rounded-2xl border border-lineSoft bg-white/[0.03] px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <i className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                        <span className="text-[13px] text-chalk/90">{s.name}</span>
                        <span className="ml-auto text-[11px] text-smoke">{mapped.length} colunas</span>
                      </div>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {mapped.length === 0 && (
                          <span className="text-[11.5px] text-smoke">Nenhuma coluna usa este status.</span>
                        )}
                        {mapped.map((c) => (
                          <Link
                            key={c.id}
                            to={'/tasks/' + c.project.id}
                            className="flex items-center gap-1.5 rounded-full border border-line bg-white/[0.04] px-2.5 py-1 text-[11px] text-dust transition hover:border-white/20 hover:text-chalk"
                          >
                            <i className="h-1.5 w-1.5 rounded-full" style={{ background: c.project.color }} />
                            {c.project.key} · {c.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="grain h-fit p-5">
              <CardIntro icon={IconUsers} title="Pessoas" text="Quem compartilha projeto com voce." />
              <div className="mt-4 space-y-1">
                {members.length === 0 && (
                  <p className="px-2 py-6 text-center text-[12.5px] text-smoke">Ninguem alem de voce ainda.</p>
                )}
                {members.map((m) => {
                  const status = presenceMeta(m.presence);
                  return (
                    <Link
                      key={m.id}
                      to={'/u/' + m.id}
                      className="flex items-center gap-3 rounded-2xl px-2 py-2 transition hover:bg-white/[0.05]"
                    >
                      <Avatar member={m} size={34} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] text-chalk/90">{m.name}</p>
                        <p className="truncate text-[11px] text-smoke">
                          Nv. {m.level || 1} · {m.email}
                        </p>
                      </div>
                      <i
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: status.color }}
                        title={status.label}
                      />
                    </Link>
                  );
                })}
              </div>
            </Card>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function CardIntro({ icon: Icon, title, text }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-2xl border border-line bg-white/[0.04] text-dust">
        <Icon size={14} />
      </span>
      <div className="min-w-0">
        <h3 className="card-title">{title}</h3>
        <p className="mt-1 text-[12.5px] leading-relaxed text-smoke">{text}</p>
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-lineSoft bg-white/[0.03] px-3 py-3">
      <p className="font-display text-[22px] tracking-tight text-chalk">{value}</p>
      <p className="mt-0.5 text-[11px] text-smoke">{label}</p>
    </div>
  );
}
