import { formatFocusMinutes, formatSessionWhen, groupHistoryByDay } from '../../lib/focusSession';
import { formatDate } from '../../lib/format';
import { EmptyState } from '../ui/Primitives';

export default function FocusHistoryList({
  entries = [],
  empty = 'Nenhuma sessao ainda.',
  emptyTitle = 'Nenhuma sessao ainda',
  spacious = false,
}) {
  const groups = groupHistoryByDay(entries);

  if (!entries.length) {
    if (spacious) {
      return <EmptyState title={emptyTitle} description={empty} />;
    }
    return <p className="py-6 text-center text-[13px] text-smoke">{empty}</p>;
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <section key={group.key}>
          <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-smoke">{formatDate(group.key)}</p>
          <ul className="space-y-2">
            {group.entries.map((entry) => {
              const titles = (entry.tasks || []).map((task) => task.title).filter(Boolean);
              const label = titles[0] || 'Sessao de foco';
              const extra = titles.length > 1 ? ' +' + (titles.length - 1) : '';
              return (
                <li
                  key={entry.id}
                  className="flex items-start justify-between gap-3 rounded-2xl border border-lineSoft bg-white/[0.03] px-3.5 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] text-chalk/90">
                      {label}
                      {extra}
                    </p>
                    <p className="mt-0.5 text-[11.5px] text-smoke">
                      {formatSessionWhen(entry.endedAt || entry.startedAt)}
                      {entry.completedBlocks ? ' · ' + entry.completedBlocks + ' bloco' + (entry.completedBlocks === 1 ? '' : 's') : ''}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[13px] tabular-nums text-chalk/90">{formatFocusMinutes(entry.focusMinutes)}</p>
                    <p className="mt-0.5 text-[10.5px] uppercase tracking-[0.12em] text-smoke">
                      {entry.reason === 'stopped' ? 'Encerrada' : 'Concluida'}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
