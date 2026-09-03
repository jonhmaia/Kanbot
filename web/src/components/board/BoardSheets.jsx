import { useEffect, useState } from 'react';
import { Avatar, DatePicker, Field, Select, Sheet } from '../ui/Primitives';
import { IconTrash } from '../../lib/icons';
import { PRIORITY_META, STATUS_META } from '../../lib/format';
import { useApp } from '../../context/AppContext';

const COLUMN_COLORS = ['#6E7A85', '#F5A524', '#BFE3F2', '#8FE3B0', '#E5484D', '#C4B5FD', '#7DD3FC', '#EDEDED'];

/* ------------------------------------------------------------ TaskSheet */

export function TaskSheet({ open, task, columns = [], defaultColumnId, onClose, onSave, onDelete }) {
  const { members } = useApp();
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (!open) return;
    setForm({
      title: task?.title ?? '',
      description: task?.description ?? '',
      columnId: task?.columnId ?? defaultColumnId ?? columns[0]?.id ?? '',
      assigneeId: task?.assigneeId ?? '',
      priority: task?.priority ?? 'medium',
      dueDate: task?.dueDate ?? '',
      estimateHours: task?.estimateHours ?? 4,
      progress: task?.progress ?? 0,
      labels: (task?.labels ?? []).join(', '),
    });
  }, [open, task, defaultColumnId, columns]);

  if (!form) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = () => {
    onSave({
      ...form,
      assigneeId: form.assigneeId || null,
      dueDate: form.dueDate || null,
      estimateHours: Number(form.estimateHours) || 1,
      progress: Number(form.progress) || 0,
      labels: form.labels
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    });
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      width="sm:max-w-[560px]"
      eyebrow={task?.projectName}
      title={task ? 'Editar tarefa' : 'Nova tarefa'}
      subtitle={task ? 'Coluna atual: ' + task.columnName : 'Preencha os detalhes do card'}
      footer={
        <>
          {task && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(task)}
              className="btn-ghost mr-auto !border-rose/25 !text-rose hover:!bg-rose/10"
            >
              <IconTrash size={14} /> Excluir
            </button>
          )}
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancelar
          </button>
          <button type="button" onClick={submit} disabled={!form.title.trim()} className="btn-primary">
            {task ? 'Salvar' : 'Criar tarefa'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Titulo">
          <input value={form.title} onChange={set('title')} className="field" placeholder="Ex: Revisar fluxo de checkout" autoFocus />
        </Field>

        <Field label="Descricao">
          <textarea value={form.description} onChange={set('description')} rows={3} className="field resize-none" placeholder="Contexto, criterios de aceite..." />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Coluna">
            <Select
              value={form.columnId}
              onChange={(columnId) => setForm((f) => ({ ...f, columnId }))}
              options={columns.map((c) => ({ value: c.id, label: c.name, dot: c.color }))}
            />
          </Field>

          <Field label="Prioridade">
            <Select
              value={form.priority}
              onChange={(priority) => setForm((f) => ({ ...f, priority }))}
              options={Object.entries(PRIORITY_META).map(([k, v]) => ({ value: k, label: v.label, dot: v.color }))}
            />
          </Field>
        </div>

        <Field label="Responsavel">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, assigneeId: '' }))}
              className={
                'rounded-full border px-3 py-1.5 text-[12px] transition ' +
                (form.assigneeId === '' ? 'border-amber/50 bg-amber/10 text-amber' : 'border-line bg-white/[0.04] text-smoke hover:text-chalk')
              }
            >
              Sem responsavel
            </button>
            {members.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setForm((f) => ({ ...f, assigneeId: m.id }))}
                className={
                  'flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-[12px] transition ' +
                  (form.assigneeId === m.id ? 'border-amber/50 bg-amber/10 text-chalk' : 'border-line bg-white/[0.04] text-dust hover:text-chalk')
                }
              >
                <Avatar member={m} size={22} />
                {m.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Prazo">
            <DatePicker value={form.dueDate || ''} onChange={(dueDate) => setForm((f) => ({ ...f, dueDate }))} />
          </Field>
          <Field label="Estimativa (h)">
            <input type="number" min="1" value={form.estimateHours} onChange={set('estimateHours')} className="field" />
          </Field>
          <Field label={'Progresso · ' + form.progress + '%'}>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={form.progress}
              onChange={set('progress')}
              className="mt-3 w-full accent-[#F5A524]"
            />
          </Field>
        </div>

        <Field label="Etiquetas" hint="Separe por virgula">
          <input value={form.labels} onChange={set('labels')} className="field" placeholder="ui, checkout" />
        </Field>
      </div>
    </Sheet>
  );
}

/* ---------------------------------------------------------- ColumnSheet */

export function ColumnSheet({ open, column, columns = [], onClose, onSave, onDelete }) {
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (!open) return;
    setForm({
      name: column?.name ?? '',
      statusKey: column?.statusKey ?? 'backlog',
      color: column?.color ?? '#6E7A85',
      wipLimit: column?.wipLimit ?? '',
    });
  }, [open, column]);

  if (!form) return null;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      width="sm:max-w-[440px]"
      eyebrow="Fluxo do projeto"
      title={column ? 'Editar coluna' : 'Nova coluna'}
      subtitle="O status master decide onde os cards aparecem no board geral"
      footer={
        <>
          {column && onDelete && columns.length > 1 && (
            <button
              type="button"
              onClick={() => onDelete(column)}
              className="btn-ghost mr-auto !border-rose/25 !text-rose hover:!bg-rose/10"
            >
              <IconTrash size={14} /> Excluir
            </button>
          )}
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() =>
              onSave({
                ...form,
                wipLimit: form.wipLimit === '' ? null : Number(form.wipLimit),
              })
            }
            disabled={!form.name.trim()}
            className="btn-primary"
          >
            Salvar
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Nome">
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="field"
            placeholder="Ex: Em revisao"
            autoFocus
          />
        </Field>

        <Field label="Status master" hint="Une esta coluna ao board geral de tarefas">
          <Select
            value={form.statusKey}
            onChange={(statusKey) => setForm((f) => ({ ...f, statusKey }))}
            options={Object.entries(STATUS_META).map(([k, v]) => ({ value: k, label: v.label, dot: v.color }))}
          />
        </Field>

        <Field label="Cor">
          <div className="flex flex-wrap gap-2">
            {COLUMN_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setForm((f) => ({ ...f, color: c }))}
                className={
                  'h-8 w-8 rounded-full transition ' +
                  (form.color === c ? 'ring-2 ring-white/70 ring-offset-2 ring-offset-[#171718]' : 'ring-1 ring-white/10')
                }
                style={{ background: c }}
                aria-label={c}
              />
            ))}
          </div>
        </Field>

        <Field label="Limite WIP" hint="Deixe vazio para nao limitar">
          <input
            type="number"
            min="1"
            value={form.wipLimit}
            onChange={(e) => setForm((f) => ({ ...f, wipLimit: e.target.value }))}
            className="field"
            placeholder="Sem limite"
          />
        </Field>
      </div>
    </Sheet>
  );
}

/* --------------------------------------------------------- ProjectSheet */

const PROJECT_COLORS = ['#F5A524', '#BFE3F2', '#8FE3B0', '#C4B5FD', '#FDA4AF', '#7DD3FC'];
const TEMPLATES = {
  simples: [
    { name: 'A fazer', statusKey: 'backlog', color: '#6E7A85' },
    { name: 'Fazendo', statusKey: 'in_progress', color: '#F5A524', wipLimit: 4 },
    { name: 'Feito', statusKey: 'done', color: '#8FE3B0' },
  ],
  completo: [
    { name: 'Backlog', statusKey: 'backlog', color: '#6E7A85' },
    { name: 'Em progresso', statusKey: 'in_progress', color: '#F5A524', wipLimit: 4 },
    { name: 'Revisao', statusKey: 'review', color: '#BFE3F2', wipLimit: 3 },
    { name: 'Bloqueado', statusKey: 'blocked', color: '#E5484D' },
    { name: 'Concluido', statusKey: 'done', color: '#8FE3B0' },
  ],
  design: [
    { name: 'Ideias', statusKey: 'backlog', color: '#6E7A85' },
    { name: 'Desenhando', statusKey: 'in_progress', color: '#F5A524', wipLimit: 3 },
    { name: 'Review do cliente', statusKey: 'review', color: '#BFE3F2', wipLimit: 2 },
    { name: 'Entregue', statusKey: 'done', color: '#8FE3B0' },
  ],
};

export function ProjectSheet({ open, project, onClose, onSave }) {
  const { members } = useApp();
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (!open) return;
    setForm({
      name: project?.name ?? '',
      key: project?.key ?? '',
      description: project?.description ?? '',
      color: project?.color ?? '#F5A524',
      ownerId: project?.ownerId ?? members[0]?.id ?? '',
      dueDate: project?.dueDate ?? '',
      template: 'completo',
    });
  }, [open, project, members]);

  if (!form) return null;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      width="sm:max-w-[540px]"
      eyebrow="Workspace"
      title={project ? 'Editar projeto' : 'Novo projeto'}
      subtitle={project ? 'Ajuste os dados do projeto' : 'Cada projeto nasce com o proprio kanban customizavel'}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancelar
          </button>
          <button
            type="button"
            disabled={!form.name.trim()}
            onClick={() =>
              onSave({
                name: form.name,
                key: form.key || form.name.slice(0, 3),
                description: form.description,
                color: form.color,
                ownerId: form.ownerId,
                dueDate: form.dueDate || null,
                columns: project ? undefined : TEMPLATES[form.template],
              })
            }
            className="btn-primary"
          >
            {project ? 'Salvar' : 'Criar projeto'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1fr,120px]">
          <Field label="Nome do projeto">
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="field"
              placeholder="Ex: Storefront Redesign"
              autoFocus
            />
          </Field>
          <Field label="Sigla">
            <input
              value={form.key}
              onChange={(e) => setForm((f) => ({ ...f, key: e.target.value.toUpperCase().slice(0, 4) }))}
              className="field uppercase"
              placeholder="SFR"
            />
          </Field>
        </div>

        <Field label="Descricao">
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={2}
            className="field resize-none"
            placeholder="O que este projeto entrega?"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Responsavel">
            <Select
              value={form.ownerId}
              onChange={(ownerId) => setForm((f) => ({ ...f, ownerId }))}
              options={members.map((m) => ({ value: m.id, label: m.name, dot: m.color }))}
              placeholder="Escolher responsavel"
            />
          </Field>
          <Field label="Entrega prevista">
            <DatePicker
              value={form.dueDate || ''}
              onChange={(dueDate) => setForm((f) => ({ ...f, dueDate }))}
              placeholder="Sem prazo"
            />
          </Field>
        </div>

        <Field label="Cor">
          <div className="flex gap-2">
            {PROJECT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setForm((f) => ({ ...f, color: c }))}
                className={
                  'h-8 w-8 rounded-full transition ' +
                  (form.color === c ? 'ring-2 ring-white/70 ring-offset-2 ring-offset-[#171718]' : 'ring-1 ring-white/10')
                }
                style={{ background: c }}
                aria-label={c}
              />
            ))}
          </div>
        </Field>

        {!project && (
          <Field label="Modelo de fluxo" hint="Voce pode renomear, colorir e reordenar as colunas depois">
            <div className="grid gap-2 sm:grid-cols-3">
              {Object.entries(TEMPLATES).map(([key, cols]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, template: key }))}
                  className={
                    'rounded-2xl border p-3 text-left transition ' +
                    (form.template === key ? 'border-amber/50 bg-amber/[0.07]' : 'border-line bg-white/[0.03] hover:border-white/20')
                  }
                >
                  <p className="text-[12.5px] capitalize text-chalk">{key}</p>
                  <p className="mt-1 text-[10.5px] text-smoke">{cols.length} colunas</p>
                  <div className="mt-2 flex gap-1">
                    {cols.map((c) => (
                      <i key={c.name} className="h-1.5 w-5 rounded-full" style={{ background: c.color }} />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </Field>
        )}
      </div>
    </Sheet>
  );
}
