import { Avatar } from '../ui/Primitives';
import { IconChat, IconClock, IconPaperclip } from '../../lib/icons';
import { PRIORITY_META, dueState, formatDate } from '../../lib/format';

const DUE_STYLE = {
  late: 'text-rose',
  today: 'text-amber',
  ahead: 'text-smoke',
  none: 'text-smoke',
};

export default function TaskCard({ task, showProject = false, onOpen, onDragStart, onDragEnd, dragging, staticCard = false }) {
  const priority = PRIORITY_META[task.priority] || PRIORITY_META.medium;
  const due = dueState(task.dueDate);

  return (
    <article
      draggable={!staticCard}
      onDragStart={(e) => {
        if (staticCard) return;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', task.id);
        onDragStart?.(task);
      }}
      onDragEnd={staticCard ? undefined : onDragEnd}
      onClick={() => onOpen?.(task)}
      className={
        'group cursor-pointer select-none rounded-3xl border border-lineSoft bg-white/[0.045] p-3.5 backdrop-blur-md transition-all duration-200 hover:border-white/20 hover:bg-white/[0.075] ' +
        (dragging ? 'opacity-35' : 'opacity-100')
      }
    >
      <div className="flex items-start gap-2">
        <i className={'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ' + priority.dot} title={priority.label} />
        <p className="min-w-0 flex-1 text-[13px] font-medium leading-snug text-chalk/90">{task.title}</p>
      </div>

      {showProject && (
        <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-lineSoft bg-white/[0.04] px-2 py-1 text-[10px] text-dust">
          <i className="h-1.5 w-1.5 rounded-full" style={{ background: task.projectColor }} />
          {task.projectName}
        </span>
      )}

      {task.labels?.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {task.labels.map((l) => (
            <span key={l} className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-smoke">
              {l}
            </span>
          ))}
        </div>
      )}

      {task.progress > 0 && task.progress < 100 && (
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/[0.07]">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: task.progress + '%', background: priority.color }}
          />
        </div>
      )}

      <footer className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {task.assignee ? <Avatar member={task.assignee} size={22} /> : <span className="h-[22px] w-[22px] rounded-full border border-dashed border-white/20" />}
          {task.dueDate && (
            <span className={'flex items-center gap-1 text-[10.5px] ' + DUE_STYLE[due]}>
              <IconClock size={11} />
              {formatDate(task.dueDate)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2.5 text-smoke">
          {task.comments > 0 && (
            <span className="flex items-center gap-1 text-[10.5px]">
              <IconChat size={11} />
              {task.comments}
            </span>
          )}
          {task.attachments > 0 && (
            <span className="flex items-center gap-1 text-[10.5px]">
              <IconPaperclip size={11} />
              {task.attachments}
            </span>
          )}
          <span className="text-[10.5px] tabular-nums">{task.estimateHours}h</span>
        </div>
      </footer>
    </article>
  );
}
