import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader';
import { Avatar, Card } from '../components/ui/Primitives';
import { api } from '../lib/api';

import { useApp } from '../context/AppContext';
import AtmospherePicker from '../components/settings/AtmospherePicker';
import IslandPrefsCard from '../components/settings/IslandPrefsCard';
import PomodoroCard from '../components/settings/PomodoroCard';
import McpCard from '../components/settings/McpCard';

export default function SettingsPage() {
  const { workspaces, workspaceId, members, statuses, projects, signOut } = useApp();
  const [boards, setBoards] = useState([]);
  const workspace = workspaces.find((w) => w.id === workspaceId) || workspaces[0];

  useEffect(() => {
    Promise.all(projects.map((p) => api.projectBoard(p.id))).then(setBoards);
  }, [projects]);

  return (
    <>
      <PageHeader title="Settings" eyebrow="MCP, workspace, status master e origem dos dados" />

      <div className="grid gap-4 px-5 pb-10 sm:px-7 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-4">
          <Card className="grain p-5">
            <h3 className="card-title">Aparencia</h3>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-smoke">
              O fundo mantem o mesmo gradiente diagonal — so muda a temperatura da cor. A escolha fica neste
              navegador.
            </p>
            <div className="mt-5">
              <AtmospherePicker />
            </div>
          </Card>

          <IslandPrefsCard />
          <PomodoroCard />

          <McpCard />

          <Card className="grain p-5">
            <h3 className="card-title">Mapeamento de status</h3>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-smoke">
              Cada projeto tem colunas proprias. O board master agrupa os cards pelo status ao qual cada coluna
              aponta — e por isso que um card em "Designing" e outro em "Building" aparecem juntos em
              "In Progress".
            </p>

            <div className="mt-5 space-y-4">
              {statuses.map((s) => {
                const mapped = boards.flatMap((b) =>
                  b.columns.filter((c) => c.statusKey === s.key).map((c) => ({ ...c, project: b.project })),
                );
                return (
                  <div key={s.key} className="rounded-3xl border border-lineSoft bg-white/[0.03] p-4">
                    <div className="flex items-center gap-2">
                      <i className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                      <span className="text-[13px] text-chalk/90">{s.name}</span>
                      <code className="ml-auto rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10.5px] text-smoke">
                        {s.key}
                      </code>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {mapped.length === 0 && <span className="text-[11.5px] text-smoke">Nenhuma coluna usa este status.</span>}
                      {mapped.map((c) => (
                        <Link
                          key={c.id}
                          to={'/tasks/' + c.project.id}
                          className="flex items-center gap-1.5 rounded-full border border-line bg-white/[0.04] px-2.5 py-1 text-[11px] text-dust transition hover:text-chalk"
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

          <Card className="grain p-5">
            <h3 className="card-title">Origem dos dados</h3>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-smoke">
              Este ambiente le e grava no projeto <strong className="text-chalk/80">Supabase Kanbam</strong> via
              Auth + RLS. As queries passam pelas views{' '}
              <code className="rounded bg-white/[0.06] px-1 py-0.5 text-[11px]">v_tasks_expanded</code>,{' '}
              <code className="rounded bg-white/[0.06] px-1 py-0.5 text-[11px]">v_master_board</code> e{' '}
              <code className="rounded bg-white/[0.06] px-1 py-0.5 text-[11px]">v_project_progress</code>.
            </p>
            <p className="mt-3 text-[12.5px] leading-relaxed text-smoke">
              Schema e seed: <code className="rounded bg-white/[0.06] px-1 py-0.5 text-[11px]">supabase/migrations/0001_init.sql</code>{' '}
              e <code className="rounded bg-white/[0.06] px-1 py-0.5 text-[11px]">supabase/seed.sql</code>.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {['projects', 'board_columns', 'tasks', 'task_labels', 'master_statuses', 'activity_log'].map((t) => (
                <span key={t} className="rounded-full border border-line bg-white/[0.04] px-3 py-1.5 text-[11.5px] text-dust">
                  {t}
                </span>
              ))}
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card className="grain p-5">
            <h3 className="card-title">Workspace</h3>
            <div className="mt-4 space-y-3 text-[12.5px]">
              <Row label="Nome" value={workspace?.name} />
              <Row label="Plano" value={workspace?.plan} />
              <Row label="Projetos" value={String(projects.length)} />
              <Row label="Membros" value={String(members.length)} />
              <Row label="AI" value="DeepSeek V4 Flash · OpenRouter" />
            </div>
            <button type="button" onClick={signOut} className="btn-ghost mt-5 w-full justify-center">
              Sair
            </button>
          </Card>

          <Card className="grain p-5">
            <h3 className="card-title">Membros</h3>
            <div className="mt-4 space-y-3">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-3">
                  <Avatar member={m} size={30} />
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] text-chalk/90">{m.name}</p>
                    <p className="truncate text-[11px] text-smoke">{m.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

const Row = ({ label, value }) => (
  <div className="flex items-center justify-between border-b border-white/[0.05] pb-2.5 last:border-0">
    <span className="text-smoke">{label}</span>
    <span className="text-chalk/90">{value}</span>
  </div>
);
