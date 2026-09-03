import { IconExport, IconSearch } from '../../lib/icons';

/**
 * Cabecalho de pagina: titulo grande a esquerda e a fileira de controles
 * (busca, export, periodo, acao primaria) alinhada a direita.
 */
export default function PageHeader({
  title,
  eyebrow,
  searchValue,
  onSearch,
  searchPlaceholder = 'Buscar tarefa, projeto...',
  onExport,
  right,
  action,
}) {
  return (
    <div className="flex flex-col gap-5 px-5 pb-6 pt-7 sm:px-7 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1.5 text-[11.5px] uppercase tracking-[0.18em] text-smoke">{eyebrow}</p>}
        <h1 className="font-display text-[38px] font-light leading-none tracking-[-0.035em] text-chalk/85 sm:text-[42px]">
          {title}
        </h1>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {onSearch && (
          <div className="relative min-w-[210px] flex-1 sm:w-[260px] sm:flex-none">
            <IconSearch size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-smoke" />
            <input
              value={searchValue}
              onChange={(e) => onSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="input !py-2.5 !pl-10"
            />
          </div>
        )}
        {onExport && (
          <button type="button" onClick={onExport} className="btn-ghost">
            Export
            <IconExport size={14} />
          </button>
        )}
        {right}
        {action}
      </div>
    </div>
  );
}
