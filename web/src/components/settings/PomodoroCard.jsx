import { useFocus } from '../../context/FocusContext';
import { Card } from '../ui/Primitives';

const FIELDS = [
  { key: 'focusMin', label: 'Foco', suffix: 'min' },
  { key: 'shortBreakMin', label: 'Pausa curta', suffix: 'min' },
  { key: 'longBreakMin', label: 'Pausa longa', suffix: 'min' },
  { key: 'cyclesUntilLong', label: 'Ciclos ate a longa', suffix: 'x' },
];

export default function PomodoroCard() {
  const { pomodoro, setPomodoroSettings } = useFocus();

  return (
    <Card className="grain p-5">
      <h3 className="card-title">Foco</h3>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-smoke">
        Duracao da sessao Pomodoro. Vale no notch e no play dos cards. Um bloco concluido soma o tempo em
        horas registradas da tarefa.
      </p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        {FIELDS.map((field) => (
          <label key={field.key} className="block">
            <span className="label">{field.label}</span>
            <span className="relative block">
              <input
                type="number"
                min="1"
                className="field pr-10"
                value={pomodoro[field.key]}
                onChange={(e) => setPomodoroSettings({ [field.key]: e.target.value })}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-smoke">
                {field.suffix}
              </span>
            </span>
          </label>
        ))}
      </div>
    </Card>
  );
}
