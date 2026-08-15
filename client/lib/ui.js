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

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "2024-07-01" -> "Jul 2024". Parsed by hand so a UTC date never shifts a month.
export function formatMonthYear(value) {
  if (!value) return '';
  const [y, m] = String(value).slice(0, 10).split('-');
  if (!y || !m) return '';
  return `${MONTHS[Number(m) - 1] || ''} ${y}`.trim();
}

// How long a single role lasted: "10 mos", "1 yr", "2 yrs 10 mos".
// An open-ended role counts up to today, which is what makes a "Current" entry
// keep growing rather than reading as zero.
//
// Months are counted inclusively — Mar 2008 to Dec 2010 is 34 months, not 33 —
// because only the month is recorded, and someone who worked in both March and
// December expects both to count.
export function durationLabel(start, end) {
  if (!start) return '';
  const from = new Date(start);
  const to = end ? new Date(end) : new Date();
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return '';

  const months =
    (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()) + 1;
  if (months < 1) return '';

  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts = [];
  if (years) parts.push(`${years} yr${years > 1 ? 's' : ''}`);
  if (rest) parts.push(`${rest} mo${rest > 1 ? 's' : ''}`);
  return parts.join(' ');
}

// Capability level names, indexed by level number — [0] is the "no rating yet"
// case, so LEVEL_TITLES[3] is L3.
//
// These must stay word-for-word identical to the rubric in the database, which
// is the authority: skill_level_definitions (per skill, shown on the skill
// page's Level Definition tab) and the skillLevelScale system setting. A rating
// is meaningless if the same L4 reads as one thing on a profile and another on
// the skill it refers to. Change db/02_seed.sql, the DEFAULT_LEVEL_DEFINITIONS
// constant in server/src/routes/skills.js, and this list together.
export const LEVEL_TITLES = [
  'Not assessed',
  'Awareness',
  'Working Knowledge',
  'Practitioner',
  'Advanced Practitioner',
  'Expert / SME',
];

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

// Shared styling for every Recharts <Tooltip>. Spread it: <Tooltip {...CHART_TOOLTIP} />.
//
// itemStyle is the part that matters. Recharts colours each tooltip row with
// `entry.color || '#000'` (DefaultTooltipContent), and pie slices carry their
// colour as a Cell fill rather than an entry colour — so the row fell back to
// pure black on our dark tooltip and was unreadable. Setting the colour here
// covers pies and bars alike, whatever the series colour happens to be.
export const CHART_TOOLTIP = {
  contentStyle: {
    background: '#111A2C',
    border: '1px solid #1E2A44',
    borderRadius: 8,
    fontSize: 12,
  },
  itemStyle: { color: '#FFFFFF' },
  labelStyle: { color: '#FFFFFF', fontWeight: 600 },
};
