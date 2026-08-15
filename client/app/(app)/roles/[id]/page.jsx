'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';
import { fetcher } from '@/lib/api';
import { Card, Skeleton, ErrorState, Badge, ProgressBar, StatTile, EmptyState } from '@/components/ui';
import { criticalityClasses, CHART_TOOLTIP } from '@/lib/ui';

const TABS = ['Overview', 'Skills', 'Training Path', 'People', 'Analytics'];
const READINESS_COLORS = ['#22C55E', '#F59E0B', '#06B6D4', '#3B82F6'];

export default function RoleDetailPage() {
  const { id } = useParams();
  const { data, error, isLoading } = useSWR(`/roles/${id}`, fetcher);
  const [tab, setTab] = useState('Overview');

  if (error) return <ErrorState error={error} />;
  if (isLoading || !data) return <Skeleton className="h-96" />;

  // skillGaps is newer than the rest of the payload; default it so an older API
  // response cannot blank the page.
  const { role, mandatorySkills, peopleReadiness, people, trainingPath, skillGaps = [] } = data;

  // Ordered widest-gap-first by the API, so the first row is the biggest shortfall.
  const gapData = skillGaps.map((g) => ({
    name: g.skill_name,
    Required: Number(g.required_level) || 0,
    'Team average': Number(g.avg_level) || 0,
  }));
  const widestGap = skillGaps[0];

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
                      <Tooltip {...CHART_TOOLTIP} />
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

      {tab === 'Analytics' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              value={people.length}
              label="People Mapped"
              hint={people.length === 1 ? '1 person holds this role' : 'hold this role'}
            />
            <StatTile
              value={`${Number(peopleReadiness.avg_readiness) || 0}%`}
              label="Avg Readiness"
              hint="required levels met"
              tone={Number(peopleReadiness.avg_readiness) >= 75 ? 'good' : 'warn'}
            />
            <StatTile
              value={Number(peopleReadiness.ready_now) || 0}
              label="Ready Now"
              hint="meet every requirement"
              tone="good"
            />
            <StatTile
              value={widestGap ? `L${(widestGap.required_level - Number(widestGap.avg_level)).toFixed(1)}` : '—'}
              label="Widest Gap"
              hint={widestGap ? widestGap.skill_name : 'No requirements set'}
              tone="bad"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <h3 className="text-base font-semibold text-white">Required vs Team Average</h3>
              <p className="mb-3 text-xs text-slate-500">
                What the role demands against the average level of the people in it.
              </p>
              {gapData.length ? (
                // Horizontal bars: skill names are long, and they read far better
                // down the axis than rotated under a vertical chart.
                <div style={{ height: Math.max(200, gapData.length * 58) }}>
                  <ResponsiveContainer>
                    <BarChart data={gapData} layout="vertical" margin={{ left: 4, right: 16, top: 4 }}>
                      <XAxis
                        type="number"
                        domain={[0, 5]}
                        tickCount={6}
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={140}
                        tick={{ fill: '#cbd5e1', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip {...CHART_TOOLTIP} cursor={{ fill: '#ffffff08' }} />
                      <Legend wrapperStyle={{ fontSize: 12, color: '#cbd5e1' }} />
                      <Bar dataKey="Required" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={10} />
                      <Bar dataKey="Team average" fill="#22C55E" radius={[0, 4, 4, 0]} barSize={10} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState title="No skill requirements" hint="Add benchmarks to this role to see the gap." />
              )}
            </Card>

            <Card>
              <h3 className="text-base font-semibold text-white">Skill Coverage</h3>
              <p className="mb-3 text-xs text-slate-500">
                How many of the people in this role already meet each required level.
              </p>
              {skillGaps.length ? (
                <div className="space-y-4">
                  {skillGaps.map((g) => {
                    const pct = g.people ? Math.round((g.meeting / g.people) * 100) : 0;
                    return (
                      <div key={g.skill_id}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="text-slate-300">{g.skill_name}</span>
                          <span className="text-xs text-slate-400">
                            {g.meeting}/{g.people} at L{g.required_level}
                          </span>
                        </div>
                        <ProgressBar
                          value={pct}
                          color={pct >= 75 ? 'bg-good' : pct >= 40 ? 'bg-warn' : 'bg-bad'}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState title="Nothing to measure yet" hint="This role has no skill benchmarks." />
              )}
            </Card>
          </div>
        </div>
      ) : null}

      {tab === 'People' ? (
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

