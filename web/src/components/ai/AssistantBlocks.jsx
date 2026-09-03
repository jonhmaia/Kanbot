import { useNavigate } from 'react-router-dom';
import TaskCard from '../board/TaskCard';
import { Avatar } from '../ui/Primitives';
import { useApp } from '../../context/AppContext';
import { projectIcons } from '../../lib/icons';
import { PRIORITY_META, STATUS_META, formatDate, relativeTime, smoothPath } from '../../lib/format';
import { taskPath } from '../../lib/taskScope';

export default function AssistantBlocks({ blocks = [], compact = false, onOpenTask }) {
  if (!blocks.length) return null;
  return (
    <div className={'mt-2.5 space-y-2.5 ' + (compact ? '' : 'space-y-3')}>
      {blocks.map((block) => (
        <Block key={block.id} block={block} compact={compact} onOpenTask={onOpenTask} />
      ))}
    </div>
  );
}

function Block({ block, compact, onOpenTask }) {
  if (block.type === 'text' && block.text) {
    return <p className="text-[12.5px] leading-relaxed text-dust">{block.text}</p>;
  }
  if (block.type === 'tasks') return <TaskBlock block={block} compact={compact} onOpenTask={onOpenTask} />;
  if (block.type === 'people') return <PeopleBlock block={block} compact={compact} />;
  if (block.type === 'projects') return <ProjectBlock block={block} compact={compact} />;
  if (block.type === 'stats') return <StatsBlock block={block} />;
  if (block.type === 'chart') return <ChartBlock block={block} compact={compact} />;
  if (block.type === 'table') return <TableBlock block={block} />;
  if (block.type === 'insights') return <InsightBlock block={block} />;
  if (block.type === 'activity') return <ActivityBlock block={block} />;
  if (block.type === 'columns') return <ColumnBlock block={block} />;
  return null;
}

function Frame({ title, children }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-lineSoft bg-black/25">
      {title ? <p className="border-b border-white/[0.05] px-3 py-2 text-[10.5px] uppercase tracking-[0.12em] text-smoke">{title}</p> : null}
      <div className="p-2.5">{children}</div>
    </div>
  );
}

function TaskBlock({ block, compact, onOpenTask }) {
  const items = (block.items || []).slice(0, compact ? 4 : 8);
  return (
    <Frame title={block.title || 'Tarefas'}>
      <div className={compact ? 'space-y-2' : 'grid gap-2 sm:grid-cols-2'}>
        {items.map((task) => (
          <TaskCard key={task.id} task={task} showProject staticCard onOpen={() => onOpenTask?.(task)} />
        ))}
      </div>
    </Frame>
  );
}

function PeopleBlock({ block, compact }) {
  const navigate = useNavigate();
  const { taskScope } = useApp();
  const items = block.items || [];
  return (
    <Frame title={block.title || 'Time'}>
      <div className={compact ? 'space-y-2' : 'grid gap-2 sm:grid-cols-2'}>
        {items.map((m) => {
          const over = (m.utilization || 0) > 100;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => navigate(taskPath(taskScope, 'team'))}
              className="flex w-full items-center gap-3 rounded-2xl border border-white/[0.05] bg-white/[0.03] px-3 py-2.5 text-left transition hover:bg-white/[0.06]"
            >
              <Avatar member={m} size={compact ? 32 : 40} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] text-chalk">{m.name}</p>
                <p className="truncate text-[11px] text-smoke">{m.role || 'membro'}</p>
                {m.openTasks != null && (
                  <p className="mt-1 text-[10.5px] text-dust">
                    {m.openTasks} abertas · {m.hours || 0}h
                    {m.utilization != null && (
                      <span className={over ? ' text-rose' : ''}> · {m.utilization}%</span>
                    )}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </Frame>
  );
}

function ProjectBlock({ block, compact }) {
  const navigate = useNavigate();
  return (
    <Frame title={block.title || 'Projetos'}>
      <div className="space-y-2">
        {(block.items || []).map((p) => {
          const Icon = projectIcons[p.icon] || projectIcons.layers;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => navigate(taskPath(p.id, 'board'))}
              className="flex w-full items-center gap-3 rounded-2xl border border-white/[0.05] bg-white/[0.03] px-3 py-2.5 text-left transition hover:bg-white/[0.06]"
            >
              <span
                className="grid h-9 w-9 place-items-center rounded-2xl"
                style={{ background: (p.color || '#F5A524') + '22', color: p.color || '#F5A524' }}
              >
                <Icon size={15} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] text-chalk">{p.name}</p>
                <p className="text-[11px] text-smoke">
                  {p.key} · {p.doneCount || 0}/{p.taskCount || 0} · {p.progress || 0}%
                </p>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.07]">
                  <div className="h-full rounded-full" style={{ width: (p.progress || 0) + '%', background: p.color }} />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </Frame>
  );
}

function StatsBlock({ block }) {
  const toneClass = { default: 'text-chalk', warn: 'text-rose', ok: 'text-mint' };
  return (
    <Frame title={block.title || 'Metricas'}>
      <div className="grid grid-cols-3 gap-2">
        {block.stats.map((s) => (
          <div key={s.label} className="rounded-2xl bg-white/[0.03] px-2.5 py-2">
            <p className={'font-display text-[20px] leading-none ' + (toneClass[s.tone] || 'text-chalk')}>{s.value}</p>
            <p className="mt-1 text-[10.5px] text-smoke">{s.label}</p>
          </div>
        ))}
      </div>
    </Frame>
  );
}

function ChartBlock({ block, compact }) {
  const h = compact ? 92 : 128;
  const series = block.series || [];
  return (
    <Frame title={block.title || 'Grafico'}>
      {block.chartType === 'donut' ? <Donut series={series} size={compact ? 112 : 140} /> : null}
      {block.chartType === 'line' ? <Line series={series} height={h} /> : null}
      {(block.chartType === 'bar' || block.chartType === 'none') && <Bars series={series} height={h} />}
    </Frame>
  );
}

function Bars({ series, height }) {
  const max = Math.max(1, ...series.map((s) => s.value));
  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {series.map((s) => (
        <div key={s.label} className="flex min-w-0 flex-1 flex-col items-center justify-end">
          <span className="mb-1 text-[10px] tabular-nums text-dust">{s.value}</span>
          <div
            className="w-full max-w-[28px] rounded-full"
            style={{ height: Math.max(10, (s.value / max) * (height - 28)), background: s.color || '#F5A524' }}
          />
          <span className="mt-1 w-full truncate text-center text-[9.5px] text-smoke">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

function Donut({ series, size }) {
  const total = series.reduce((n, s) => n + s.value, 0) || 1;
  const r = size / 2 - 10;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex items-center gap-3">
      <svg width={size} height={size} viewBox={'0 0 ' + size + ' ' + size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        {series.map((s) => {
          const len = (s.value / total) * c;
          const node = (
            <circle
              key={s.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color || '#F5A524'}
              strokeWidth="8"
              strokeDasharray={len + ' ' + (c - len)}
              strokeDashoffset={-offset}
              strokeLinecap="round"
            />
          );
          offset += len;
          return node;
        })}
      </svg>
      <ul className="min-w-0 space-y-1">
        {series.map((s) => (
          <li key={s.label} className="flex items-center gap-1.5 text-[11px] text-dust">
            <i className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
            <span className="truncate">{s.label}</span>
            <span className="ml-auto tabular-nums text-smoke">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Line({ series, height }) {
  const w = 260;
  const max = Math.max(1, ...series.map((s) => s.value));
  const points = series.map((s, i) => ({
    x: series.length === 1 ? w / 2 : (i / (series.length - 1)) * (w - 8) + 4,
    y: height - 18 - (s.value / max) * (height - 28),
  }));
  return (
    <svg width="100%" viewBox={'0 0 ' + w + ' ' + height} className="overflow-visible">
      <path d={smoothPath(points)} fill="none" stroke="#F5A524" strokeWidth="2" />
      {points.map((p, i) => (
        <circle key={series[i].label} cx={p.x} cy={p.y} r="3" fill="#F5A524" />
      ))}
    </svg>
  );
}

function TableBlock({ block }) {
  return (
    <Frame title={block.title || 'Tabela'}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[240px] text-left text-[11.5px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.12em] text-smoke">
              {block.columns.map((c) => (
                <th key={c} className="px-2 py-1 font-normal">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, i) => (
              <tr key={i} className="border-t border-white/[0.05] text-dust">
                {row.map((cell, j) => (
                  <td key={j} className="px-2 py-1.5">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Frame>
  );
}

function InsightBlock({ block }) {
  return (
    <Frame title={block.title || 'Insights'}>
      <div className="space-y-2">
        {(block.items || []).map((i) => (
          <div key={i.id} className="rounded-2xl bg-white/[0.04] px-3 py-2.5">
            <p className="text-[12.5px] text-chalk">{i.title}</p>
            {i.detail ? <p className="mt-1 text-[11px] text-smoke">{i.detail}</p> : null}
          </div>
        ))}
      </div>
    </Frame>
  );
}

function ActivityBlock({ block }) {
  return (
    <Frame title={block.title || 'Atividade'}>
      <div className="space-y-2">
        {(block.items || []).map((a) => (
          <div key={a.id} className="flex items-center gap-2">
            <Avatar member={a.member} size={22} />
            <p className="min-w-0 flex-1 text-[12px] text-dust">
              <span className="text-chalk">{a.member?.name?.split(' ')[0] || 'Alguem'}</span> {a.action} {a.target}
            </p>
            <span className="text-[10px] text-smoke">{relativeTime(a.at)}</span>
          </div>
        ))}
      </div>
    </Frame>
  );
}

function ColumnBlock({ block }) {
  return (
    <Frame title={block.title || 'Colunas'}>
      <div className="flex flex-wrap gap-1.5">
        {(block.items || []).map((c) => (
          <span
            key={c.id}
            className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-dust"
            style={{ borderColor: (STATUS_META[c.statusKey]?.color || '#6E7A85') + '55' }}
          >
            {c.projectName ? c.projectName + ' — ' : ''}
            {c.name}
            {c.wipLimit != null ? ' · WIP ' + c.wipLimit : ''}
          </span>
        ))}
      </div>
    </Frame>
  );
}

export function TaskMetaChip({ task }) {
  const meta = PRIORITY_META[task.priority] || PRIORITY_META.medium;
  return (
    <span className="text-[10.5px]" style={{ color: meta.color }}>
      {meta.label} · {formatDate(task.dueDate)}
    </span>
  );
}
