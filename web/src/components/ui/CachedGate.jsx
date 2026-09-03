export default function CachedGate({ error, onRetry, flush }) {
  if (error) {
    return (
      <div className={'grid min-h-[420px] place-items-center text-center ' + (flush ? '' : 'px-7 pt-24')}>
        <div className="max-w-sm">
          <p className="font-display text-[20px] text-chalk">Nao consegui carregar</p>
          <p className="mt-2 text-[13px] leading-relaxed text-smoke">{error.message}</p>
          {onRetry && (
            <button type="button" onClick={() => onRetry()} className="btn-primary mt-4">
              Tentar de novo
            </button>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className={flush ? '' : 'px-7 pt-24'}>
      <div className="h-[420px] animate-pulseSoft rounded-4xl bg-white/[0.04]" />
    </div>
  );
}
