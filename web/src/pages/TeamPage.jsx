import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader';
import { Avatar, Card } from '../components/ui/Primitives';
import { IconArrowUpRight } from '../lib/icons';
import { relativeTime } from '../lib/format';
import useDashboardScope from '../lib/useDashboardScope';
import { taskPath } from '../lib/taskScope';

export default function TeamPage() {
  const navigate = useNavigate();
  const { scope, isMaster, data } = useDashboardScope();
  const [search, setSearch] = useState('');

  if (!data) return <div className="px-7 pt-24"><div className="h-[400px] animate-pulseSoft rounded-4xl bg-white/[0.04]" /></div>;

  const people = data.workload.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <PageHeader
        title="Team"
        eyebrow={data.workload.length + (isMaster ? ' pessoas neste workspace' : ' pessoas neste projeto')}
        searchValue={search}
        onSearch={setSearch}
        searchPlaceholder="Buscar pessoa..."
      />

      <div className="grid gap-4 px-5 pb-10 sm:px-7 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-4 sm:grid-cols-2">
          {people.map((m) => {
            const over = m.utilization > 100;
            return (
              <Card key={m.id} className="grain p-5">
                <div className="flex items-center gap-3">
                  <Avatar member={m} size={42} />
                  <div className="min-w-0">
                    <p className="truncate text-[14px] text-chalk">{m.name}</p>
                    <p className="truncate text-[11.5px] text-smoke">{m.role}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(taskPath(scope, 'board'))}
                    className="ml-auto grid h-8 w-8 place-items-center rounded-full border border-line bg-white/[0.05] text-smoke transition hover:text-chalk"
                    aria-label="Ver tarefas"
                  >
                    <IconArrowUpRight size={13} />
                  </button>
                </div>

                <div className="mt-5 flex items-end justify-between">
                  <div>
                    <p className="metric !text-[32px]">{m.openTasks}</p>
                    <p className="metric-label mt-1">tarefas abertas</p>
                  </div>
                  <div className="text-right">
                    <p className={'font-display text-[22px] tracking-tight ' + (over ? 'text-rose' : 'text-dust')}>
                      {m.utilization}%
                    </p>
                    <p className="metric-label mt-1">{m.hours}h alocadas</p>
                  </div>
                </div>

                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: Math.min(100, m.utilization) + '%',
                      background: over ? '#E5484D' : m.color,
                    }}
                  />
                </div>
                {over && <p className="mt-2 text-[11px] text-rose">Acima da capacidade da semana</p>}
              </Card>
            );
          })}
        </div>

        <Card className="grain h-fit p-5">
          <h3 className="card-title">Atividade recente</h3>
          <div className="mt-4 space-y-3.5">
            {data.activity.map((a) => {
              const member = data.workload.find((m) => m.id === a.memberId);
              return (
                <div key={a.id} className="flex gap-3">
                  <Avatar member={member} size={26} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] leading-snug text-dust">
                      <span className="text-chalk">{member?.name?.split(' ')[0]}</span> {a.action}{' '}
                      <span className="text-chalk/90">{a.target}</span>
                    </p>
                    <p className="mt-0.5 text-[10.5px] text-smoke">ha {relativeTime(a.at)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </>
  );
}
