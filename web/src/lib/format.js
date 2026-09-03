export const TODAY = new Date().toISOString().slice(0, 10);

export const pad2 = (n) => String(n).padStart(2, '0');

export const PRIORITY_META = {
  urgent: { label: 'Urgente', color: '#E5484D', dot: 'bg-rose' },
  high: { label: 'Alta', color: '#F5A524', dot: 'bg-amber' },
  medium: { label: 'Media', color: '#BFE3F2', dot: 'bg-ice' },
  low: { label: 'Baixa', color: '#6E7A85', dot: 'bg-smoke' },
};

export const STATUS_META = {
  backlog: { label: 'Backlog', color: '#6E7A85' },
  in_progress: { label: 'In Progress', color: '#F5A524' },
  review: { label: 'In Review', color: '#BFE3F2' },
  blocked: { label: 'Blocked', color: '#E5484D' },
  done: { label: 'Done', color: '#8FE3B0' },
};

export function formatDate(iso) {
  if (!iso) return '--';
  const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export function relativeTime(iso) {
  if (!iso) return '';
  const diff = (new Date(TODAY + 'T12:00:00').getTime() - new Date(iso).getTime()) / 1000;
  if (diff < 3600) return Math.max(1, Math.round(diff / 60)) + ' min';
  if (diff < 86400) return Math.round(diff / 3600) + 'h';
  return Math.round(diff / 86400) + 'd';
}

export const dueState = (iso) => {
  if (!iso) return 'none';
  if (iso < TODAY) return 'late';
  if (iso === TODAY) return 'today';
  return 'ahead';
};

export const initialsOf = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();


/** Converte serie em path SVG suavizado (curva Catmull-Rom -> Bezier). */
export function smoothPath(points) {
  if (points.length < 2) return '';
  let d = 'M ' + points[0].x + ' ' + points[0].y;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ' C ' + c1x + ' ' + c1y + ', ' + c2x + ' ' + c2y + ', ' + p2.x + ' ' + p2.y;
  }
  return d;
}
