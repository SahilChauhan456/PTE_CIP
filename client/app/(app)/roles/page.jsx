'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import { PageHeader, Card, Skeleton, ErrorState, Badge } from '@/components/ui';
import { criticalityClasses } from '@/lib/ui';

export default function RolesPage() {
  const { data, error, isLoading } = useSWR('/roles', fetcher);

  return (
    <div>
      <PageHeader title="Roles / Careers" subtitle="Job roles, benchmarks and future-critical positions" />
      {error ? (
        <ErrorState error={error} />
      ) : isLoading || !data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((r) => (
            <Link key={r.id} href={`/roles/${r.id}`}>
              <Card className="h-full transition hover:border-accent-soft">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-white">{r.role_name}</h3>
                  <Badge className={criticalityClasses(r.criticality)}>{r.criticality}</Badge>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {r.function_area} · {r.role_level}
                </p>
                {r.is_future_role ? (
                  <span className="mt-2 inline-block chip bg-warn/15 text-warn">Future-critical role</span>
                ) : null}
                <div className="mt-4 flex gap-6 text-sm">
                  <div>
                    <p className="text-lg font-semibold text-white">{r.required_skills}</p>
                    <p className="text-xs text-slate-500">Required skills</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-white">{r.employees}</p>
                    <p className="text-xs text-slate-500">People</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
