import { useEffect, useState } from 'react';
import { useFocus } from '../../context/FocusContext';
import {
  POMODORO_PRESETS,
  formatFocusMinutes,
  matchingPreset,
  todayFocusMinutes,
} from '../../lib/focusSession';
import { Card, Switch } from '../ui/Primitives';

const FIELDS = [
  { key: 'focusMin', label: 'Foco', suffix: 'min', min: 1, max: 180 },
  { key: 'shortBreakMin', label: 'Pausa curta', suffix: 'min', min: 1, max: 60 },
  { key: 'longBreakMin', label: 'Pausa longa', suffix: 'min', min: 1, max: 90 },
  { key: 'cyclesUntilLong', label: 'Ciclos ate a longa', suffix: 'x', min: 1, max: 12 },
];

export default function PomodoroCard() {
  const { pomodoro, setPomodoroSettings, applySettingsToSession, idle, history } = useFocus();
  const [draft, setDraft] = useState(pomodoro);
  const preset = matchingPreset(draft);
  const today = todayFocusMinutes(history);
  const goal = draft.dailyGoalMin || 0;

  useEffect(() => {
    setDraft(pomodoro);
  }, [pomodoro]);

  const save = (patch, applyCurrent = false) => {
    const next = setPomodoroSettings(patch, { applyCurrent });
    setDraft(next);
    return next;
  };

  const commitField = (key) => {
    if (String(draft[key]) === String(pomodoro[key])) return;
    save({ [key]: draft[key] });
  };

  return (
    <Card className="grain p-5 sm:p-6">
      <h3 className="card-title">Tempos e regras</h3>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-smoke">
        O app e a unica fonte do timer. O notch so espelha — pause, pule ou encerre de qualquer
        lado que o outro segue.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {POMODORO_PRESETS.map((item) => {
          const selected = preset?.id === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => save(item, !idle)}
              className={
                'rounded-full border px-3 py-1.5 text-[12px] transition ' +
                (selected
                  ? 'border-white/30 bg-white/[0.07] text-chalk'
                  : 'border-line text-dust hover:border-white/20 hover:text-chalk')
              }
            >
              {item.name}
              <span className="ml-1.5 text-smoke">{item.hint}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {FIELDS.map((field) => (
          <label key={field.key} className="block">
            <span className="label">{field.label}</span>
            <span className="relative block">
              <input
                type="number"
                min={field.min}
                max={field.max}
                className="field pr-10"
                value={draft[field.key]}
                onChange={(e) => setDraft((current) => ({ ...current, [field.key]: e.target.value }))}
                onBlur={() => commitField(field.key)}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-smoke">
                {field.suffix}
              </span>
            </span>
          </label>
        ))}
      </div>

      {!idle && (
        <button
          type="button"
          className="btn-ghost mt-4"
          onClick={() => applySettingsToSession(pomodoro)}
        >
          Aplicar nesta sessao
        </button>
      )}

      <div className="mt-6 space-y-2">
        <Toggle
          title="Comecar pausa sozinho"
          hint="Ao terminar um bloco de foco, a pausa ja dispara"
          checked={draft.autoStartBreaks}
          onChange={(autoStartBreaks) => save({ autoStartBreaks })}
        />
        <Toggle
          title="Comecar o proximo foco sozinho"
          hint="Depois da pausa, o proximo bloco inicia sem toque"
          checked={draft.autoStartFocus}
          onChange={(autoStartFocus) => save({ autoStartFocus })}
        />
        <Toggle
          title="Som ao trocar de fase"
          hint="Um toque curto no fim do bloco"
          checked={draft.sound}
          onChange={(sound) => save({ sound })}
        />
        <Toggle
          title="Notificacao no desktop"
          hint="Avisa quando muda para foco ou pausa"
          checked={draft.desktopNotify}
          onChange={(desktopNotify) => save({ desktopNotify })}
        />
        <Toggle
          title="Pausa conta como disponivel"
          hint="No intervalo o perfil volta a Disponivel; no foco fica Em foco"
          checked={draft.breakPresence === 'available'}
          onChange={(on) => save({ breakPresence: on ? 'available' : 'focusing' })}
        />
      </div>

      <div className="mt-6">
        <label className="block">
          <span className="label">Meta diaria de foco</span>
          <span className="relative block">
            <input
              type="number"
              min="0"
              max="720"
              className="field pr-10"
              value={draft.dailyGoalMin}
              onChange={(e) => setDraft((current) => ({ ...current, dailyGoalMin: e.target.value }))}
              onBlur={() => commitField('dailyGoalMin')}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-smoke">
              min
            </span>
          </span>
        </label>
        <p className="mt-1.5 text-[11.5px] text-smoke">0 desliga a meta. Hoje: {formatFocusMinutes(today)}</p>
        {goal > 0 && (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
            <div
              className="h-full rounded-full bg-amber"
              style={{ width: Math.min(100, Math.round((today / goal) * 100)) + '%' }}
            />
          </div>
        )}
      </div>
    </Card>
  );
}

function Toggle({ title, hint, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-lineSoft bg-white/[0.03] px-3.5 py-2.5">
      <div className="min-w-0">
        <p className="text-[13px] text-chalk/90">{title}</p>
        <p className="mt-0.5 text-[11.5px] text-smoke">{hint}</p>
      </div>
      <Switch checked={checked} onChange={onChange} label={title} />
    </div>
  );
}
