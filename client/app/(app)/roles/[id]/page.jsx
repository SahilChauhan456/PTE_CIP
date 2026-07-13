'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { fetcher } from '@/lib/api';
import { Card, Skeleton, ErrorState, Badge, ProgressBar } from '@/components/ui';
import { criticalityClasses } from '@/lib/ui';

const TABS = ['Overview', 'Skills', 'Training Path', 'People', 'Analytics'];
const READINESS_COLORS = ['#22C55E', '#F59E0B', '#06B6D4', '#3B82F6'];

export default function RoleDetailPage() {
  const { id } = useParams();
  const { data, error, isLoading } = useSWR(`/roles/${id}`, fetcher);
  const [tab, setTab] = useState('Overview');

  if (error) return <ErrorState error={error} />;
  if (isLoading || !data) return <Skeleton className="h-96" />;

  const { role, mandatorySkills, peopleReadiness, people, trainingPath } = data;

  const readinessData = [
    { name: 'Ready Now', value: Number(peopleReadiness.ready_now) || 0 },
    { name: 'Ready in 3M', value: Number(peopleReadiness.ready_3m) || 0 },
    { name: 'Ready in 6M', value: Number(peopleReadiness.ready_6m) || 0 },
    { name: 'Not Ready', value: Number(peopleReadiness.not_ready) || 0 },
  ];
  const totalPeople = readinessData.reduce((a, b) => a + b.value, 0);

  return (
    <div>
      <div className="mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-white">{role.role_name}</h1>
          <Badge className={criticalityClasses(role.criticality)}>{role.criticality}</Badge>
          {role.is_future_role ? <Badge className="bg-warn/15 text-warn">Future-critical</Badge> : null}
        </div>
        <p className="mt-1 max-w-3xl text-sm text-slate-400">{role.description}</p>
      </div>

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

      {tab === 'Overview' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">Mandatory Skills</h3>
              <span className="text-xs text-slate-500">Required Level</span>
            </div>
            <div className="space-y-4">
              {mandatorySkills.map((s) => (
                <div key={s.skill_id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-slate-300">{s.skill_name}</span>
                    <span className="font-medium text-slate-200">L{s.required_level}</span>
                  </div>
                  <ProgressBar
                    value={(s.required_level / 5) * 100}
                    color={s.priority === 'Strategic' ? 'bg-good' : 'bg-accent-soft'}
                  />
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="mb-2 text-base font-semibold text-white">People Readiness</h3>
            {totalPeople ? (
              <div className="flex items-center gap-4">
                <div className="h-52 w-52">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={readinessData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                        {readinessData.map((_, i) => (
                          <Cell key={i} fill={READINESS_COLORS[i]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5">
                  {readinessData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2 text-sm">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: READINESS_COLORS[i] }} />
                      <span className="w-24 text-slate-300">{d.name}</span>
                      <span className="text-slate-400">
                        {totalPeople ? Math.round((d.value / totalPeople) * 100) : 0}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No people currently mapped to this role.</p>
            )}
          </Card>
        </div>
      ) : null}

      {tab === 'Skills' ? (
        <Card className="overflow-x-auto p-0">
          <table className="w-full">
            <thead className="border-b border-line">
              <tr>
                <th className="th">Skill</th>
                <th className="th">Priority</th>
                <th className="th">Required</th>
                <th className="th">Mandatory</th>
                <th className="th">Target Year</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {mandatorySkills.map((s) => (
                <tr key={s.skill_id} className="hover:bg-ink-700/40">
                  <td className="td text-white">{s.skill_name}</td>
                  <td className="td">{s.priority}</td>
                  <td className="td">L{s.required_level}</td>
                  <td className="td">{s.mandatory ? 'Yes' : 'No'}</td>
                  <td className="td">{s.target_year}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : null}

      {tab === 'Training Path' ? (
        <div className="space-y-3">
          {trainingPath.length ? (
            trainingPath.map((t, i) => (
              <Card key={t.id} className="flex items-center gap-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-sm font-semibold text-accent-soft">
                  {i + 1}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{t.title}</p>
                  <p className="text-xs text-slate-500">
                    {t.course_type} · {t.delivery_mode} · {t.difficulty}
                  </p>
                </div>
              </Card>
            ))
          ) : (
            <Card><p className="text-sm text-slate-500">No linked training path.</p></Card>
          )}
        </div>
      ) : null}

      {tab === 'People' || tab === 'Analytics' ? (
        <Card className="overflow-x-auto p-0">
          <table className="w-full">
            <thead className="border-b border-line">
              <tr>
                <th className="th">Employee</th>
                <th className="th text-right">Skills Met</th>
                <th className="th text-right">Required</th>
                <th className="th">Readiness</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {people.map((p) => (
                <tr key={p.employee_id} className="hover:bg-ink-700/40">
                  <td className="td">
                    <Link href={`/employees/${p.employee_id}`} className="text-white hover:text-accent-soft">
                      {p.employee_name}
                    </Link>
                  </td>
                  <td className="td text-right">{p.skills_meeting_target}</td>
                  <td className="td text-right">{p.required_skills}</td>
                  <td className="td">
                    <div className="flex items-center gap-2">
                      <div className="w-32">
                        <ProgressBar value={Number(p.readiness_percent) || 0} />
                      </div>
                      <span className="text-xs text-slate-400">{p.readiness_percent ?? 0}%</span>
                    </div>
                  </td>
                </tr>
              ))}
              {people.length === 0 ? (
                <tr>
                  <td className="td text-slate-500" colSpan={4}>
                    No people mapped to this role.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </Card>
      ) : null}
    </div>
  );
}

const tooltipStyle = {
  background: '#111A2C',
  border: '1px solid #1E2A44',
  borderRadius: 8,
  color: '#e2e8f0',
  fontSize: 12,
};
