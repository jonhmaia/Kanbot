import { useId, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

const W = 420;

function buildPaths(lines, height, time) {
  return Array.from({ length: lines }, (_, i) => {
    const t = lines <= 1 ? 0.5 : i / (lines - 1);
    const amp = (16 + Math.sin(t * Math.PI) * 26) * (1 + Math.sin(time * 1.35 + t * 2.4) * 0.14);
    const yBase = height * 0.5 + (t - 0.5) * height * 0.72;
    const phase = t * 2.6 + time;
    const steps = 42;
    let d = '';
    for (let s = 0; s <= steps; s += 1) {
      const x = (s / steps) * W;
      const env = 0.35 + 0.65 * Math.sin((s / steps) * Math.PI);
      const wave =
        Math.sin(s / 5 + phase) * amp * env +
        Math.sin(s / 11 - phase * 1.4 + time * 0.55) * amp * 0.35 +
        Math.sin(s / 17 + time * 0.8 + t) * amp * 0.12;
      d += (s === 0 ? 'M ' : ' L ') + x.toFixed(1) + ' ' + (yBase + wave * 0.5).toFixed(1);
    }
    return d;
  });
}

/**
 * Malha de ondas do assistente: senoides animadas com as cores da atmosfera.
 */
export default function AiWaves({ className = '', lines = 22, height = 150 }) {
  const rawId = useId().replace(/[^a-zA-Z0-9]/g, '');
  const gradId = 'waveGrad-' + rawId;
  const glowId = 'waveGlow-' + rawId;
  const svgRef = useRef(null);
  const groupRef = useRef(null);
  const gradRef = useRef(null);
  const pathEls = useRef([]);
  const initial = buildPaths(lines, height, 0);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const state = { t: 0 };
        const paths = pathEls.current.filter(Boolean);
        gsap.to(state, {
          t: Math.PI * 2,
          duration: 10,
          ease: 'none',
          repeat: -1,
          onUpdate: () => {
            const next = buildPaths(lines, height, state.t);
            paths.forEach((el, i) => el.setAttribute('d', next[i]));
          },
        });
        if (groupRef.current) {
          gsap.to(groupRef.current, {
            y: 3.5,
            duration: 3.4,
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true,
            force3D: true,
          });
        }
        if (gradRef.current) {
          gsap.to(gradRef.current, {
            attr: { x1: 0.35, x2: 1.35 },
            duration: 6.5,
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true,
          });
        }
        if (paths.length) {
          gsap.to(paths, {
            opacity: 0.62,
            duration: 2.6,
            stagger: { each: 0.07, from: 'center', yoyo: true, repeat: -1 },
            ease: 'sine.inOut',
          });
        }
      });
      return () => mm.revert();
    },
    { scope: svgRef, dependencies: [lines, height] },
  );

  return (
    <svg
      ref={svgRef}
      viewBox={'0 0 ' + W + ' ' + height}
      className={className}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient ref={gradRef} id={gradId} x1="0" y1="0" x2="1" y2="0.4">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.15" />
          <stop offset="34%" stopColor="var(--accent-soft)" stopOpacity="0.75" />
          <stop offset="62%" stopColor="var(--cool)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--cool-deep)" stopOpacity="0.12" />
        </linearGradient>
        <filter id={glowId} x="-20%" y="-40%" width="140%" height="180%">
          <feGaussianBlur stdDeviation="3.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g ref={groupRef} filter={'url(#' + glowId + ')'} style={{ willChange: 'transform' }}>
        {initial.map((d, i) => {
          const t = lines <= 1 ? 0.5 : i / (lines - 1);
          return (
            <path
              key={i}
              ref={(el) => {
                pathEls.current[i] = el;
              }}
              d={d}
              fill="none"
              stroke={'url(#' + gradId + ')'}
              strokeWidth={0.7}
              strokeOpacity={0.35 + Math.sin(t * Math.PI) * 0.55}
            />
          );
        })}
      </g>
    </svg>
  );
}
