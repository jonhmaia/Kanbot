/**
 * Malha de ondas do assistente: varias senoides sobrepostas com gradiente
 * ambar -> gelo, como na referencia.
 */
export default function AiWaves({ className = '', lines = 22, height = 150 }) {
  const W = 420;
  const paths = Array.from({ length: lines }, (_, i) => {
    const t = i / (lines - 1);
    const amp = 16 + Math.sin(t * Math.PI) * 26;
    const yBase = height * 0.5 + (t - 0.5) * height * 0.72;
    const phase = t * 2.6;
    const steps = 42;
    let d = '';
    for (let s = 0; s <= steps; s += 1) {
      const x = (s / steps) * W;
      const wave =
        Math.sin(s / 5 + phase) * amp * (0.35 + 0.65 * Math.sin((s / steps) * Math.PI)) +
        Math.sin(s / 11 - phase * 1.4) * amp * 0.35;
      const y = yBase + wave * 0.5;
      d += (s === 0 ? 'M ' : ' L ') + x.toFixed(1) + ' ' + y.toFixed(1);
    }
    return { d, t };
  });

  return (
    <svg
      viewBox={'0 0 ' + W + ' ' + height}
      className={className}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="waveGrad" x1="0" y1="0" x2="1" y2="0.4">
          <stop offset="0%" stopColor="#F5A524" stopOpacity="0.15" />
          <stop offset="34%" stopColor="#FFC15E" stopOpacity="0.75" />
          <stop offset="62%" stopColor="#BFE3F2" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#5FA8C9" stopOpacity="0.12" />
        </linearGradient>
        <filter id="waveGlow" x="-20%" y="-40%" width="140%" height="180%">
          <feGaussianBlur stdDeviation="3.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#waveGlow)">
        {paths.map((p, i) => (
          <path
            key={i}
            d={p.d}
            fill="none"
            stroke="url(#waveGrad)"
            strokeWidth={0.7}
            strokeOpacity={0.35 + Math.sin(p.t * Math.PI) * 0.55}
          />
        ))}
      </g>
    </svg>
  );
}
