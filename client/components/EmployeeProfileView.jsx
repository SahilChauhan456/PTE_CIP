'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import { Card, Skeleton, ErrorState, Avatar, Badge } from '@/components/ui';
import { formatDate, statusClasses } from '@/lib/ui';

const TABS = ['Summary', 'Skills Passport', 'Learning Plan', 'Certifications', 'Mentor Notes'];

// Full employee profile UI, driven by an employeeId. Shared by /employees/[id]
// (viewing anyone) and /profile (the logged-in user's own profile).
export default function EmployeeProfileView({ employeeId }) {
  const { data, error, isLoading } = useSWR(
    employeeId ? `/employees/${employeeId}/profile` : null,
    fetcher
  );
  const [tab, setTab] = useState('Summary');

  if (error) return <ErrorState error={error} />;
  if (isLoading || !data) return <Skeleton className="h-96" />;

  const { header, skillsPassport, recentLearning, certifications, mentorNotes } = data;

  return (
    <div>
      {/* Profile header */}
      <Card className="mb-5">
        <div className="flex flex-wrap items-center gap-5">
          <Avatar name={header.full_name} size={64} />
          <div className="min-w-[180px]">
            <h1 className="text-xl font-semibold text-white">{header.full_name}</h1>
            <p className="text-sm text-slate-400">{header.job_role}</p>
            <p className="text-xs text-slate-500">{header.department}</p>
          </div>
          <div className="flex flex-wrap gap-8 border-l border-line pl-6">
            <Field label="Manager" value={header.manager_name} />
            <Field label="Mentor" value={header.mentor_name} />
            <Field label="Target Role" value={header.target_role} />
          </div>
        </div>
      </Card>

      <div className="mb-5 flex flex-wrap gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-t-lg px-3 py-2 text-sm transition ${
              tab === t ? 'border-b-2 border-accent-soft text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Summary' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="p-0">
            <h3 className="p-4 pb-2 text-base font-semibold text-white">Top Skills</h3>
            <table className="w-full">
              <thead className="border-y border-line">
                <tr>
                  <th className="th">Skill</th>
                  <th className="th text-right">Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {skillsPassport.slice(0, 6).map((s) => (
                  <tr key={s.skill_id}>
                    <td className="td">{s.skill_name}</td>
                    <td className="td text-right font-medium text-white">Level {s.effective_level}</td>
                  </tr>
                ))}
                {skillsPassport.length === 0 ? (
                  <tr><td className="td text-slate-500" colSpan={2}>No skills assigned yet.</td></tr>
                ) : null}
              </tbody>
            </table>
          </Card>

          <Card>
            <h3 className="mb-3 text-base font-semibold text-white">Recent Learning</h3>
            <div className="space-y-2">
              {recentLearning.map((l, i) => (
                <div key={i} className="flex items-center justify-between border-b border-line pb-2 last:border-0">
                  <div>
                    <p className="text-sm text-slate-200">{l.title}</p>
                    <p className="text-xs text-slate-500">{l.course_type}</p>
                  </div>
                  <span className="text-xs text-slate-400">
                    {l.completed_at ? formatDate(l.completed_at) : `${l.progress_percent || 0}%`}
                  </span>
                </div>
              ))}
              {recentLearning.length === 0 ? <p className="text-sm text-slate-500">No learning records.</p> : null}
            </div>
          </Card>
        </div>
      ) : null}

      {tab === 'Skills Passport' ? (
        <Card className="overflow-x-auto p-0">
          <table className="w-full">
            <thead className="border-b border-line">
              <tr>
                <th className="th">Skill</th>
                <th className="th text-center">Self</th>
                <th className="th text-center">Manager</th>
                <th className="th text-center">Mentor</th>
                <th className="th text-center">Effective</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {skillsPassport.map((s) => (
                <tr key={s.skill_id} className="hover:bg-ink-700/40">
                  <td className="td text-white">{s.skill_name}</td>
                  <td className="td text-center text-slate-400">{s.self_level ?? '—'}</td>
                  <td className="td text-center text-slate-400">{s.manager_level ?? '—'}</td>
                  <td className="td text-center text-slate-400">{s.mentor_level ?? '—'}</td>
                  <td className="td text-center font-semibold text-white">{s.effective_level}</td>
                </tr>
              ))}
              {skillsPassport.length === 0 ? (
                <tr><td className="td text-slate-500" colSpan={5}>No skills assigned yet.</td></tr>
              ) : null}
            </tbody>
          </table>
        </Card>
      ) : null}

      {tab === 'Learning Plan' ? (
        <Card>
          <p className="text-sm text-slate-400">
            View the full Kanban board on the <a href="/learning-plan" className="text-accent-soft">Learning Plan</a> page.
          </p>
          <div className="mt-3 space-y-2">
            {recentLearning.map((l, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-line bg-ink-900 p-3">
                <span className="text-sm text-slate-200">{l.title}</span>
                <Badge className={statusClasses(l.status)}>{l.status}</Badge>
              </div>
            ))}
            {recentLearning.length === 0 ? <p className="text-sm text-slate-500">No learning items.</p> : null}
          </div>
        </Card>
      ) : null}

      {tab === 'Certifications' ? (
        <Card className="overflow-x-auto p-0">
          <table className="w-full">
            <thead className="border-b border-line">
              <tr>
                <th className="th">Certification</th>
                <th className="th">Status</th>
                <th className="th">Issued</th>
                <th className="th">Expiry</th>
                <th className="th">Approved By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {certifications.map((c, i) => (
                <tr key={i} className="hover:bg-ink-700/40">
                  <td className="td text-white">{c.title}</td>
                  <td className="td"><Badge className={statusClasses(c.status)}>{c.status}</Badge></td>
                  <td className="td">{formatDate(c.issued_date)}</td>
                  <td className="td">{formatDate(c.expiry_date)}</td>
                  <td className="td">{c.approved_by || '—'}</td>
                </tr>
              ))}
              {certifications.length === 0 ? (
                <tr><td className="td text-slate-500" colSpan={5}>No certifications.</td></tr>
              ) : null}
            </tbody>
          </table>
        </Card>
      ) : null}

      {tab === 'Mentor Notes' ? (
        <div className="space-y-3">
          {mentorNotes.length ? (
            mentorNotes.map((n, i) => (
              <Card key={i}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-white">{n.topic}</p>
                  <span className="text-xs text-slate-500">{formatDate(n.session_date)} · {n.mode}</span>
                </div>
                <p className="mt-1 text-sm text-slate-400">{n.notes}</p>
                {n.action_items ? (
                  <p className="mt-2 text-xs text-slate-500">Action: {n.action_items}</p>
                ) : null}
                <p className="mt-2 text-xs text-slate-600">— {n.mentor_name}</p>
              </Card>
            ))
          ) : (
            <Card><p className="text-sm text-slate-500">No mentor notes yet.</p></Card>
          )}
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-medium text-slate-200">{value || '—'}</p>
    </div>
  );
}
