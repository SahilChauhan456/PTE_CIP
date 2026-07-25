'use client';

import { initials } from '@/lib/ui';

// Reusable page header.
export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-white">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
      </div>
      {children ? <div className="flex items-center gap-2">{children}</div> : null}
    </div>
  );
}

// Shows the uploaded profile picture when `src` is set, otherwise initials.
export function Avatar({ name, size = 36, src, className = '' }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name || 'Profile picture'}
        className={`shrink-0 rounded-full object-cover ring-1 ring-line ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-soft font-semibold text-white ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials(name)}
    </div>
  );
}

// Compact metric tile: coloured leading value + label + hint.
export function StatTile({ value, label, hint, tone = 'accent' }) {
  const tones = {
    accent: 'bg-accent/15 text-accent-soft',
    good: 'bg-good/15 text-good',
    warn: 'bg-warn/15 text-warn',
    bad: 'bg-bad/15 text-bad',
  };
  return (
    <div className="card-tight flex items-center gap-3">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
          tones[tone] || tones.accent
        }`}
      >
        {value}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="truncate text-sm font-medium text-white">{hint}</p>
      </div>
    </div>
  );
}

export function Badge({ children, className = '' }) {
  return <span className={`chip ${className}`}>{children}</span>;
}

export function Card({ children, className = '' }) {
  return <div className={`card ${className}`}>{children}</div>;
}

// Loading skeleton block.
export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-ink-700 ${className}`} />;
}

export function LoadingCards({ count = 8 }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-24" />
      ))}
    </div>
  );
}

export function EmptyState({ title = 'Nothing here yet', hint }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-ink-800/50 py-14 text-center">
      <p className="text-sm font-medium text-slate-300">{title}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function ErrorState({ error }) {
  return (
    <div className="rounded-xl border border-bad/30 bg-bad/10 p-4 text-sm text-bad">
      {error?.message || 'Something went wrong loading this data.'}
    </div>
  );
}

// Horizontal progress bar.
export function ProgressBar({ value = 0, color = 'bg-accent-soft' }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-ink-700">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}
