'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

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
  // Remember *which* url failed rather than a boolean: if the picture is
  // replaced the src changes and the image is tried again, instead of the
  // avatar staying stuck on initials for the rest of the session.
  const [failedSrc, setFailedSrc] = useState(null);

  if (src && src !== failedSrc) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name || 'Profile picture'}
        // A dead url (bucket cleaned, object removed) must degrade to initials
        // rather than a broken-image glyph.
        onError={() => setFailedSrc(src)}
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

// Styled stand-in for window.confirm — centred, on-theme, and safe to open from
// inside another modal. Renders nothing until `open`.
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  busyLabel = 'Working…',
  tone = 'bad',
  busy = false,
  onConfirm,
  onCancel,
}) {
  // Esc cancels, the one habit worth keeping from the native dialog.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  const danger = tone === 'bad';

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      // Swallow the click: this usually sits on top of another modal whose own
      // backdrop handler would otherwise close everything behind it.
      onClick={(e) => {
        e.stopPropagation();
        if (!busy) onCancel();
      }}
    >
      <div className="animate-pop-in w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <Card>
          <div className="flex items-start gap-3">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                danger ? 'bg-bad/15 text-bad' : 'bg-accent/15 text-accent-soft'
              }`}
            >
              <AlertTriangle size={18} />
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-white">{title}</h3>
              {message ? <p className="mt-1 text-sm text-slate-400">{message}</p> : null}
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button className="btn-ghost" onClick={onCancel} disabled={busy}>
              {cancelLabel}
            </button>
            <button
              className={
                danger
                  ? 'inline-flex items-center gap-2 rounded-lg bg-bad px-4 py-2 text-sm font-medium text-white transition hover:bg-bad/85 disabled:opacity-50'
                  : 'btn-primary'
              }
              onClick={onConfirm}
              disabled={busy}
            >
              {busy ? busyLabel : confirmLabel}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}

// Brief centred confirmation that something went through. Click-through by
// design: it reports what already happened, so it must never block the UI.
// Give it a `key` that changes per event so repeat messages restart the timer.
export function Toast({ message, tone = 'good', duration = 2600, onDone }) {
  // Held in a ref so an inline onDone arrow can't restart the timer on rerender.
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(() => done.current && done.current(), duration);
    return () => clearTimeout(timer);
  }, [message, duration]);

  if (!message) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* A plain centred card gets read as page content — it lands mid-screen on
          top of whatever card happens to be there, while the eye is still down
          at the row that was just deleted. The scrim is what makes it register
          as a popup. Visual only: the whole overlay stays click-through. */}
      <div className="animate-fade-in absolute inset-0 bg-black/50" />
      <div
        className={`animate-pop-in relative flex items-center gap-4 rounded-2xl border bg-ink-800 px-7 py-5 shadow-2xl shadow-black/70 ${
          tone === 'bad' ? 'border-bad/40' : 'border-good/40'
        }`}
      >
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
            tone === 'bad' ? 'bg-bad/15 text-bad' : 'bg-good/15 text-good'
          }`}
        >
          {tone === 'bad' ? <AlertTriangle size={22} /> : <CheckCircle2 size={22} />}
        </span>
        <span className="text-base font-semibold text-white">{message}</span>
      </div>
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
