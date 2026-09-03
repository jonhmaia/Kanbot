import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader';
import { StatCard, SpotlightStat } from '../components/dashboard/StatCards';
import WorkloadSummary from '../components/dashboard/WorkloadSummary';
import CoverageChart from '../components/dashboard/CoverageChart';
import ForecastCard from '../components/dashboard/ForecastCard';
import LiveTaskBoard from '../components/dashboard/LiveTaskBoard';
import AiRail from '../components/dashboard/AiRail';
import { Card, Dropdown } from '../components/ui/Primitives';
import { TaskSheet } from '../components/board/BoardSheets';
import { IconAlert, IconClipboard, IconGauge, IconPlus, IconPulse } from '../lib/icons';
import { api } from '../lib/api';
import { pad2 } from '../lib/format';
import useAllColumns from '../lib/useAllColumns';
import { useApp } from '../context/AppContext';
import useDashboardScope from '../lib/useDashboardScope';
import { taskPath } from '../lib/taskScope';

const PERIODS = [
  { value: 'today', label: 'Hoje' },
  { value: 'week', label: 'Esta semana' },
  { value: 'month', label: 'Este mes' },
  { value: 'quarter', label: 'Trimestre' },
];

export default function ReportsPage() {
  const navigate = useNavigate();
  const { notify } = useApp();
  const { scope, projectId, isMaster, data, setData, reload, error } = useDashboardScope();
  const [period, setPeriod] = useState('week');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const { columns } = useAllColumns();
  const sheetColumns = useMemo(
    () => (projectId ? columns.filter((c) => c.projectId === projectId) : columns),
    [columns, projectId],
  );

  const openCreate = () => setCreating(true);

  const createTask = async (payload) => {
    setCreating(false);
    notify('Tarefa criada', 'success');
    setData((d) => {
      if (!d) return d;
      return {
        ...d,
        stats: {
          ...d.stats,
          activeTasks: (d.stats.activeTasks || 0) + 1,
          totalTasks: (d.stats.totalTasks || 0) + 1,
        },
      };
    });
    try {
      await api.createTask(payload);
      reload();
    } catch (e) {
      notify(e.message, 'warn');
      reload();
    }
  };

  const exportCsv = async () => {
    const tasks = await api.tasks();
    const scoped = projectId ? tasks.filter((t) => t.projectId === projectId) : tasks;
    const head = ['id', 'projeto', 'coluna', 'titulo', 'status', 'prioridade', 'responsavel', 'prazo', 'estimativa'];
    const rows = scoped.map((t) => [
      t.id,
      t.projectName,
      t.columnName,
      t.title.replaceAll(';', ','),
      t.statusKey,
      t.priority,
      t.assignee?.name ?? '',
      t.dueDate ?? '',
      t.estimateHours,
    ]);
    const csv = [head, ...rows].map((r) => r.join(';')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kanbot-tarefas.csv';
    a.click();
    URL.revokeObjectURL(url);
    notify('CSV exportado', 'success');
  };

  if (!data) {
    if (error) {
      return (
        <div className="grid min-h-[420px] place-items-center px-7 pt-24 text-center">
          <div className="max-w-sm">
            <p className="font-display text-[20px] text-chalk">Nao consegui carregar</p>
            <p className="mt-2 text-[13px] leading-relaxed text-smoke">{error.message}</p>
            <button type="button" onClick={() => reload()} className="btn-primary mt-4">
              Tentar de novo
            </button>
          </div>
        </div>
      );
    }
    return <SkeletonReports />;
  }
  const s = data.stats;

  return (
    <>
      <PageHeader
        title="Reports"
        eyebrow={isMaster ? 'Visao consolidada de entrega e capacidade' : 'Metricas deste projeto'}
        searchValue={search}
        onSearch={(v) => {
          setSearch(v);
          if (v.trim().length > 2) navigate(taskPath(scope, 'board'));
        }}
        onExport={exportCsv}
        right={<Dropdown value={period} options={PERIODS} onChange={setPeriod} />}
        action={
          <button type="button" onClick={openCreate} className="btn-primary">
            <IconPlus size={14} />
            Nova tarefa
          </button>
        }
      />

      <div className="grid gap-4 px-5 pb-10 sm:px-7 xl:grid-cols-[minmax(0,1fr)_378px]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="grid grid-cols-2 gap-4">
              <StatCard value={s.velocity} label="Velocity score" icon={IconGauge} />
              <SpotlightStat value={s.activeTasks} label="Tarefas ativas agora" icon={IconPulse} />
              <StatCard value={pad2(s.completed)} label="Tarefas concluidas" icon={IconClipboard} />
              <StatCard value={pad2(s.overdue + s.blocked)} label="Alertas e bloqueios" icon={IconAlert} accent />
            </div>

            <WorkloadSummary total={s.totalTasks} distribution={data.distribution} />
          </div>

          <CoverageChart data={data.coverage} />

          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)]">
            <ForecastCard data={data.forecast} />
            <LiveTaskBoard
              rows={data.timeline}
              onExpand={() => navigate(taskPath(scope, 'board'))}
              onSelect={(row) => navigate(taskPath(row.projectId, 'board'))}
            />
          </div>

          {isMaster && data.projects?.length > 0 && (
            <Card className="grain p-5">
              <h3 className="card-title">Progresso por projeto</h3>
              <div className="mt-5 space-y-4">
                {data.projects.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => navigate(taskPath(p.id, 'reports'))}
                    className="block w-full text-left"
                  >
                    <div className="mb-1.5 flex items-center justify-between text-[12px]">
                      <span className="flex items-center gap-2 text-dust">
                        <i className="h-1.5 w-1.5 rounded-full" style={{ background: p.color }} />
                        {p.name}
                      </span>
                      <span className="tabular-nums text-smoke">
                        {p.doneCount}/{p.taskCount} · {p.progress}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: p.progress + '%', background: p.color }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>

        <AiRail
          insights={data.insights}
          onApplied={reload}
          onExpandInsights={() => navigate(taskPath(scope, 'insights'))}
        />
      </div>

      <TaskSheet
        open={creating}
        columns={sheetColumns}
        onClose={() => setCreating(false)}
        onSave={createTask}
      />
    </>
  );
}

function SkeletonReports() {
  return (
    <div className="grid gap-4 px-5 pb-10 pt-24 sm:px-7 xl:grid-cols-[minmax(0,1fr)_378px]">
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="grid grid-cols-2 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-[112px] animate-pulseSoft rounded-4xl bg-white/[0.04]" />
            ))}
          </div>
          <div className="h-[240px] animate-pulseSoft rounded-4xl bg-white/[0.04]" />
        </div>
        <div className="h-[268px] animate-pulseSoft rounded-4xl bg-white/[0.04]" />
        <div className="h-[210px] animate-pulseSoft rounded-4xl bg-white/[0.04]" />
      </div>
      <div className="h-[640px] animate-pulseSoft rounded-4xl bg-white/[0.04]" />
    </div>
  );
}
