'use client';

import useSWR from 'swr';
import { Star } from 'lucide-react';
import { fetcher } from '@/lib/api';
import { PageHeader, Card, Skeleton, ErrorState } from '@/components/ui';

export default function RoadmapPage() {
  const { data, error, isLoading } = useSWR('/roadmap', fetcher);

  return (
    <div>
      <PageHeader title="Future Skills Roadmap" subtitle="Current vs required capability across 2026 / 2028 / 2032" />

      {error ? (
        <ErrorState error={error} />
      ) : isLoading || !data ? (
        <Skeleton className="h-96" />
      ) : (
        <Card className="overflow-x-auto">
          <div className="min-w-[720px]">
            {/* Header row */}
            <div className="mb-3 grid grid-cols-[180px_1fr_40px] gap-3 border-b border-line pb-2 text-xs font-semibold text-slate-400">
              <span>SKILL AREA</span>
              <div className="grid grid-cols-3 gap-3 text-center">
                <span>2026 · New</span>
                <span>2028 · Mid Term</span>
                <span>2032 · Future Ready</span>
              </div>
              <span></span>
            </div>

            <div className="space-y-3">
              {data.map((row) => (
                <div key={row.skill_area} className="grid grid-cols-[180px_1fr_40px] items-center gap-3">
                  <span className="truncate text-sm text-slate-200">{row.skill_area}</span>
                  <div className="grid grid-cols-3 gap-3">
                    {[2026, 2028, 2032].map((yr) => (
                      <RoadmapBar
                        key={yr}
                        current={row.current_capability}
                        required={row.required[yr]}
                        gap={row.gap[yr]}
                      />
                    ))}
                  </div>
                  <div className="flex justify-center">
                    {row.strategic ? <Star size={16} className="fill-warn text-warn" /> : null}
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="mt-6 flex flex-wrap items-center gap-5 border-t border-line pt-4 text-xs text-slate-400">
              <Legend color="bg-good" label="Current Capability" />
              <Legend color="bg-accent-soft" label="Required Capability" />
              <Legend color="bg-warn" label="Gap" />
              <span className="flex items-center gap-1.5">
                <Star size={13} className="fill-warn text-warn" /> Strategic Priority
              </span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

// A single stacked capability bar: green current, blue required-overlay, orange gap.
function RoadmapBar({ current, required, gap }) {
  const currentPct = Math.min(current, 100);
  const reqPct = Math.min(required, 100);
  const gapPct = Math.min(gap, 100);
  return (
    <div className="relative h-5 w-full overflow-hidden rounded bg-ink-700" title={`Current ${current}% · Required ${required}% · Gap ${gap}%`}>
      {/* required band (lighter) up to required */}
      <div className="absolute inset-y-0 left-0 bg-accent-soft/40" style={{ width: `${reqPct}%` }} />
      {/* current filled */}
      <div className="absolute inset-y-0 left-0 bg-good" style={{ width: `${currentPct}%` }} />
      {/* gap segment at the end */}
      {gapPct > 0 ? (
        <div className="absolute inset-y-0 bg-warn" style={{ left: `${currentPct}%`, width: `${Math.min(gapPct, 100 - currentPct)}%` }} />
      ) : null}
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-3 w-4 rounded ${color}`} /> {label}
    </span>
  );
}
