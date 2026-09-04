import { useEffect, useState } from 'react';
import { useFocus } from '../../context/FocusContext';
import { POMODORO_PRESETS, matchingPreset } from '../../lib/focusSession';
import { Field, Sheet, Switch } from '../ui/Primitives';
import { IconPlay } from '../../lib/icons';

const FIELDS = [
  { key: 'focusMin', label: 'Foco', suffix: 'min' },
  { key: 'shortBreakMin', label: 'Pausa curta', suffix: 'min' },
  { key: 'longBreakMin', label: 'Pausa longa', suffix: 'min' },
  { key: 'cyclesUntilLong', label: 'Ciclos ate a longa', suffix: 'x' },
];

export default function FocusSetupModal() {
  const { pendingTasks, pomodoro, startFocus, dismissSetup } = useFocus();
  const open = pendingTasks.length > 0;
  const [form, setForm] = useState(pomodoro);
  const preset = matchingPreset(form);

  useEffect(() => {
    if (open) setForm(pomodoro);
  }, [open, pomodoro]);

  const set = (key) => (e) => setForm((current) => ({ ...current, [key]: e.target.value }));

  const confirm = () => {
    startFocus(pendingTasks, form);
  };

  const count = pendingTasks.length;
  const first = pendingTasks[0];

  return (
    <Sheet
      open={open}
      onClose={dismissSetup}
      width="sm:max-w-[440px]"
      eyebrow="Modo foco"
      title="Configurar sessao"
      subtitle={
        count === 1
          ? first?.title
          : count + ' tarefas na fila · comeca por "' + (first?.title || '') + '"'
      }
      footer={
        <>
          <button type="button" onClick={dismissSetup} className="btn-ghost">
            Cancelar
          </button>
          <button type="button" onClick={confirm} className="btn-primary">
            <IconPlay size={13} /> Iniciar foco
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap gap-1.5">
          {POMODORO_PRESETS.map((item) => {
            const selected = preset?.id === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setForm((current) => ({ ...current, ...item }))}
                className={
                  'rounded-full border px-2.5 py-1 text-[11.5px] transition ' +
                  (selected
                    ? 'border-white/30 bg-white/[0.07] text-chalk'
                    : 'border-line text-dust hover:border-white/20')
                }
              >
                {item.name}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {FIELDS.map((field) => (
            <Field key={field.key} label={field.label}>
              <span className="relative block">
                <input
                  type="number"
                  min="1"
                  className="field pr-10"
                  value={form[field.key]}
                  onChange={set(field.key)}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-smoke">
                  {field.suffix}
                </span>
              </span>
            </Field>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-lineSoft bg-white/[0.03] px-3.5 py-2.5">
            <p className="text-[13px] text-chalk/90">Comecar pausas sozinho</p>
            <Switch
              checked={form.autoStartBreaks !== false}
              onChange={(autoStartBreaks) => setForm((current) => ({ ...current, autoStartBreaks }))}
              label="Comecar pausas sozinho"
            />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-lineSoft bg-white/[0.03] px-3.5 py-2.5">
            <p className="text-[13px] text-chalk/90">Comecar o proximo foco sozinho</p>
            <Switch
              checked={form.autoStartFocus !== false}
              onChange={(autoStartFocus) => setForm((current) => ({ ...current, autoStartFocus }))}
              label="Comecar o proximo foco sozinho"
            />
          </div>
        </div>

        <div>
          <p className="label">Fila</p>
          <ul className="space-y-1.5">
            {pendingTasks.map((task, index) => (
              <li
                key={task.id}
                className="flex items-start gap-2.5 rounded-2xl border border-lineSoft bg-white/[0.03] px-3 py-2.5"
              >
                <span className="mt-0.5 grid h-5 w-5 place-items-center rounded-full bg-white/[0.06] text-[10.5px] text-smoke">
                  {index + 1}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] text-chalk/90">{task.title}</span>
                  {task.projectName && <span className="mt-0.5 block text-[11px] text-smoke">{task.projectName}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Sheet>
  );
}
