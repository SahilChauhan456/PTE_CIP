'use client';

import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import { PageHeader, Card, Skeleton, ErrorState, EmptyState, Badge } from '@/components/ui';
import { formatDate, statusClasses } from '@/lib/ui';

// The capability pipeline reflects the core operating model:
// Skill Gap → SME Assigned → Coordinator Assigned → Course Developed → Published.
export default function AssessmentsPage() {
  const { data, error, isLoading } = useSWR('/course-development', fetcher);

  return (
    <div>
      <PageHeader
        title="Assessments & Capability Pipeline"
        subtitle="Skill gaps flowing through SME-led course development to readiness"
      />

      {error ? (
        <ErrorState error={error} />
      ) : isLoading || !data ? (
        <Skeleton className="h-64" />
      ) : data.length ? (
        <div className="space-y-4">
          {data.map((r) => (
            <Card key={r.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-white">{r.capability_gap_title}</p>
                  <p className="text-xs text-slate-500">
                    {r.request_code} · {r.skill || '—'} · Source: {r.source}
                  </p>
                </div>
                <Badge className={statusClasses(r.status)}>{r.status}</Badge>
              </div>
              <p className="mt-2 text-sm text-slate-400">{r.business_need}</p>
              <div className="mt-3 flex flex-wrap gap-6 border-t border-line pt-3 text-xs">
                <Meta label="SME" value={r.sme} />
                <Meta label="Coordinator" value={r.coordinator} />
                <Meta label="Volunteer" value={r.volunteer} />
                <Meta label="Target Launch" value={formatDate(r.target_launch_date)} />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No capability development requests" />
      )}
    </div>
  );
}

function Meta({ label, value }) {
  return (
    <div>
      <p className="text-slate-500">{label}</p>
      <p className="text-slate-200">{value || '—'}</p>
    </div>
  );
}
