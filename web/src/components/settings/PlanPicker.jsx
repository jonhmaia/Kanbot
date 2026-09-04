import { WORKSPACE_PLANS, normalizePlan } from '../../lib/plans';
import { useApp } from '../../context/AppContext';

export default function PlanPicker({ compact = false }) {
  const { workspaces, workspaceId, setWorkspacePlan } = useApp();
  const workspace = workspaces.find((w) => w.id === workspaceId) || workspaces[0];
  const current = normalizePlan(workspace?.plan);

  return (
    <div className={compact ? 'grid grid-cols-1 gap-2' : 'grid gap-2 sm:grid-cols-3'}>
      {WORKSPACE_PLANS.map((item) => {
        const selected = current === item.id;
        return (
          <button
            key={item.id}
            type="button"
            title={item.hint}
            onClick={() => {
              if (item.id !== current) setWorkspacePlan(item.id);
            }}
            aria-pressed={selected}
            className={
              'rounded-2xl border px-3 py-2.5 text-left transition ' +
              (selected
                ? 'border-white/30 bg-white/[0.06] shadow-[0_0_0_1px_rgba(255,255,255,0.08)]'
                : 'border-line bg-white/[0.03] hover:border-white/20')
            }
          >
            <span className={'block text-chalk/90 ' + (compact ? 'text-[12.5px]' : 'text-[13px]')}>{item.name}</span>
            <span className="mt-0.5 block text-[11px] text-smoke">{item.hint}</span>
          </button>
        );
      })}
    </div>
  );
}
