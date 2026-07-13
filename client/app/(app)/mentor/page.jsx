'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Search, MessageSquare } from 'lucide-react';
import { fetcher } from '@/lib/api';
import { PageHeader, Card, Skeleton, ErrorState, EmptyState, Avatar, ProgressBar } from '@/components/ui';
import { formatDate } from '@/lib/ui';
import { useAuth } from '@/components/AuthProvider';

export default function MentorPage() {
  const { user } = useAuth();
  const mentorId = user?.employee_id;
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const { data, error, isLoading } = useSWR(mentorId ? `/mentor/${mentorId}/dashboard` : null, fetcher);

  const summary = data?.summary;
  let mentees = data?.mentees || [];
  if (search) mentees = mentees.filter((m) => m.mentee_name.toLowerCase().includes(search.toLowerCase()));
  if (status) mentees = mentees.filter((m) => m.status === status);

  return (
    <div>
      <PageHeader title="Mentor Dashboard — My Mentees" subtitle="Track mentee progress and project application" />

      {error ? (
        <ErrorState error={error} />
      ) : isLoading || !data ? (
        <Skeleton className="h-72" />
      ) : (
        <>
          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat label="Active Mentees" value={summary.active_mentees} />
            <Stat label="Open Support Requests" value={summary.open_support_requests} />
            <Stat label="Submitted Recommendations" value={summary.submitted_recommendations} />
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input className="input pl-9" placeholder="Search mentees…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="input max-w-[180px]" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All Status</option>
              {['Active', 'Completed', 'Paused', 'Cancelled'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>

          <Card className="overflow-x-auto p-0">
            {mentees.length ? (
              <table className="w-full min-w-[760px]">
                <thead className="border-b border-line">
                  <tr>
                    <th className="th">Mentee</th>
                    <th className="th text-center">Target Skill</th>
                    <th className="th text-center">Current Level</th>
                    <th className="th">Project</th>
                    <th className="th">Last Interaction</th>
                    <th className="th text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {mentees.map((m) => (
                    <tr key={m.assignment_id} className="hover:bg-ink-700/40">
                      <td className="td">
                        <div className="flex items-center gap-2">
                          <Avatar name={m.mentee_name} size={30} />
                          <a href={`/employees/${m.mentee_id}`} className="font-medium text-white hover:text-accent-soft">
                            {m.mentee_name}
                          </a>
                        </div>
                      </td>
                      <td className="td text-center font-semibold text-warn">{m.target_level ?? '—'}</td>
                      <td className="td text-center font-semibold text-warn">{m.current_level ?? 0}</td>
                      <td className="td">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-warn">{m.project_level ?? '—'}</span>
                          <div className="w-24">
                            <ProgressBar
                              value={((Number(m.project_level) || 0) / 5) * 100}
                              color={(Number(m.current_level) || 0) >= (Number(m.target_level) || 0) ? 'bg-accent-soft' : 'bg-warn'}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="td text-slate-400">{formatDate(m.last_interaction)}</td>
                      <td className="td text-center">
                        <button className="rounded-lg border border-line p-1.5 text-slate-400 hover:text-white" title="Message">
                          <MessageSquare size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-5">
                <EmptyState title="No mentees found" hint="This persona may not be a mentor. Try Gurpreet Singh." />
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <Card>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-2xl font-semibold text-white">{value ?? 0}</p>
    </Card>
  );
}
