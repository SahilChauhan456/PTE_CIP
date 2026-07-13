// Small shared UI helpers.

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Status badge palette (Tailwind class strings).
export function statusClasses(status = '') {
  const s = status.toLowerCase();
  if (['approved', 'completed', 'active', 'published', 'validated', 'ready now'].includes(s))
    return 'bg-good/15 text-good';
  if (['pending', 'in progress', 'requested', 'draft', 'nominated', 'submitted', 'review', 'sme review'].includes(s))
    return 'bg-warn/15 text-warn';
  if (['expired', 'rejected', 'denied', 'failed', 'not ready', 'cancelled'].includes(s))
    return 'bg-bad/15 text-bad';
  return 'bg-slate-500/15 text-slate-300';
}

export function criticalityClasses(value = '') {
  const s = value.toLowerCase();
  if (s === 'critical') return 'bg-bad/15 text-bad';
  if (s === 'high') return 'bg-warn/15 text-warn';
  if (s === 'medium') return 'bg-accent/15 text-accent-soft';
  return 'bg-slate-500/15 text-slate-300';
}

// Heatmap cell color from an average gap value (0 = covered, higher = worse).
export function gapCellClass(gap) {
  const g = Number(gap);
  if (Number.isNaN(g)) return 'bg-slate-700';
  if (g <= 0.5) return 'bg-good/70';
  if (g <= 1.5) return 'bg-warn/70';
  return 'bg-bad/70';
}

export const CHART_COLORS = ['#22C55E', '#06B6D4', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#A855F7'];
