'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Search } from 'lucide-react';
import { fetcher } from '@/lib/api';
import { PageHeader, Card, Skeleton, ErrorState, EmptyState, Badge } from '@/components/ui';
import { formatDate, statusClasses } from '@/lib/ui';

const STATUSES = ['Approved', 'Pending', 'Requested', 'Expired', 'Renewal Due', 'Denied'];

export default function CertificationsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const qs = new URLSearchParams();
  if (search) qs.set('search', search);
  if (status) qs.set('status', status);
  const key = `/certifications${qs.toString() ? `?${qs}` : ''}`;
  const { data, error, isLoading } = useSWR(key, fetcher);

  return (
    <div>
      <PageHeader title="Certification Tracker" subtitle="Internal and mandatory certifications across the org" />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className="input pl-9" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input max-w-[200px]" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All Certifications</option>
          {STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      <Card className="overflow-x-auto p-0">
        {error ? (
          <div className="p-5"><ErrorState error={error} /></div>
        ) : isLoading || !data ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : data.length ? (
          <table className="w-full min-w-[820px]">
            <thead className="border-b border-line">
              <tr>
                <th className="th">Employee</th>
                <th className="th">Certification</th>
                <th className="th">Status</th>
                <th className="th">Issued On</th>
                <th className="th">Expiry</th>
                <th className="th">Approved By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.map((c) => (
                <tr key={c.id} className="hover:bg-ink-700/40">
                  <td className="td text-white">{c.employee}</td>
                  <td className="td">{c.certification}</td>
                  <td className="td"><Badge className={statusClasses(c.status)}>{c.status}</Badge></td>
                  <td className="td">{formatDate(c.issued_date)}</td>
                  <td className="td">{formatDate(c.expiry_date)}</td>
                  <td className="td">{c.approved_by || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-5"><EmptyState title="No certifications match your filters" /></div>
        )}
      </Card>
    </div>
  );
}
