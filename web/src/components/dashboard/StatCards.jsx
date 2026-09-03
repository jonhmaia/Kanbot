import { Card } from '../ui/Primitives';

/** Card de metrica padrao: numero grande, rotulo curto e icone discreto. */
export function StatCard({ value, label, icon: Icon, suffix, accent = false }) {
  return (
    <Card className="grain flex min-h-[112px] flex-col justify-between overflow-hidden p-5">
      <div className="flex items-start justify-between">
        <p className={'metric ' + (accent ? 'text-amber' : '')}>
          {value}
          {suffix && <span className="ml-1 align-top text-[15px] tracking-normal text-smoke">{suffix}</span>}
        </p>
        {Icon && (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-lineSoft bg-white/[0.05] text-dust [&>svg]:block">
            <Icon size={13} />
          </span>
        )}
      </div>
      <p className="metric-label max-w-[110px]">{label}</p>
    </Card>
  );
}

/**
 * Card em destaque (azul gelo) da referencia: fundo claro com uma mancha
 * organica mais escura no canto superior direito.
 */
export function SpotlightStat({ value, label, icon: Icon }) {
  return (
    <Card tone="ice" className="flex min-h-[112px] flex-col justify-between p-5">
      <svg
        viewBox="0 0 220 150"
        preserveAspectRatio="none"
        className="pointer-events-none absolute -right-2 -top-6 h-[105%] w-[78%] opacity-90"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="blobGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#A8D6EC" />
            <stop offset="100%" stopColor="#8CC6E4" />
          </linearGradient>
          <filter id="blobBlur">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>
        <path
          d="M120 -20C170 -10 220 20 214 62c-6 42-64 44-96 66-32 22-64 34-84 12C14 118 34 76 62 44 90 12 70 -30 120 -20Z"
          fill="url(#blobGrad)"
          filter="url(#blobBlur)"
        />
      </svg>

      <div className="relative flex items-start justify-between">
        <p className="font-display text-[44px] leading-none tracking-[-0.04em] text-[#0F2833]">{value}</p>
        {Icon && (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/45 text-[#0F2833] [&>svg]:block">
            <Icon size={13} />
          </span>
        )}
      </div>
      <p className="relative text-[12px] font-medium text-[#173845]">{label}</p>
    </Card>
  );
}
