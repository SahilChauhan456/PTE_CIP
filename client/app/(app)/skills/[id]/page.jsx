'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { fetcher } from '@/lib/api';
import { Card, Skeleton, ErrorState, Badge, Avatar, EmptyState } from '@/components/ui';
import { criticalityClasses, CHART_COLORS, CHART_TOOLTIP } from '@/lib/ui';

// Analytics leads: it is what the page opens on, so it belongs in the first
// position rather than landing the reader on the last tab in the row.
const TABS = ['Analytics', 'Overview', 'Level Definition', 'Roles', 'Training', 'Certifications', 'Mentors'];

export default function SkillDetailPage() {
  const { id } = useParams();
  const { data, error, isLoading } = useSWR(`/skills/${id}`, fetcher);
  // Driven off the list so the opening tab and the leading tab cannot drift apart.
  const [tab, setTab] = useState(TABS[0]);

  if (error) return <ErrorState error={error} />;
  if (isLoading || !data) return <Skeleton className="h-96" />;

  const { skill, labels, levelDefinitions, proficiencyDistribution, benchmark, mentors, linkedTraining, roles, certifications } = data;

  const distData = proficiencyDistribution.map((d) => ({
    name: `Level ${d.level}`,
    value: Number(d.count),
  }));
  const totalAssessed = distData.reduce((a, b) => a + b.value, 0);

  const benchData = [
    { name: 'Employee Avg', value: Number(benchmark.employee_avg) || 0 },
    { name: 'Benchmark', value: Number(benchmark.benchmark) || 0 },
  ];

  return (
    <div>
      {/* Skill header */}
      <div className="mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-white">{skill.name}</h1>
          <Badge className={criticalityClasses(skill.criticality)}>{skill.criticality}</Badge>
          <span className="text-xs text-slate-500">Future relevance: {skill.future_relevance}</span>
        </div>
        <p className="mt-1 max-w-3xl text-sm text-slate-400">{skill.description}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {labels.map((l) => (
            <span key={l.name} className="chip" style={{ backgroundColor: `${l.color}22`, color: l.color }}>
              {l.name}
            </span>
          ))}
        </div>
      </div>

      {/* Tabs */}
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

      {tab === 'Analytics' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <h3 className="text-base font-semibold text-white">Proficiency Distribution</h3>
            <p className="mb-2 text-xs text-slate-500">{totalAssessed} assessed employees</p>
            {distData.length ? (
              <div className="flex items-center gap-4">
                <div className="h-52 w-52">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={distData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                        {distData.map((entry, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip {...CHART_TOOLTIP} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5">
                  {distData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2 text-sm">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="w-16 text-slate-300">{d.name}</span>
                      <span className="text-slate-400">
                        {totalAssessed ? Math.round((d.value / totalAssessed) * 100) : 0}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No assessment data yet.</p>
            )}
          </Card>

          <Card>
            <h3 className="text-base font-semibold text-white">Benchmark Comparison</h3>
            <p className="mb-2 text-xs text-slate-500">Average level</p>
            <div className="h-52">
              <ResponsiveContainer>
                <BarChart data={benchData}>
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 5]} tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip {...CHART_TOOLTIP} cursor={{ fill: '#ffffff08' }} />
                  <Bar dataKey="value" label={{ fill: '#FFFFFF', fontSize: 12 }} radius={[6, 6, 0, 0]}>
                    <Cell fill="#2563EB" />
                    <Cell fill="#8B5CF6" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <h3 className="mb-3 text-base font-semibold text-white">Top Mentors / SMEs</h3>
            <div className="grid grid-cols-2 gap-3">
              {mentors.length ? (
                mentors.map((m) => (
                  <div key={m.id} className="flex items-center gap-2 rounded-lg border border-line bg-ink-900 p-3">
                    <Avatar name={m.full_name} src={m.photo_url} size={34} />
                    <div>
                      <p className="text-sm text-white">{m.full_name}</p>
                      <p className="text-xs text-slate-500">Level {m.mentor_level}{m.can_certify ? ' · Can certify' : ''}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No mentors mapped.</p>
              )}
            </div>
          </Card>

          <Card>
            <h3 className="mb-3 text-base font-semibold text-white">Linked Training ({linkedTraining.length})</h3>
            <ol className="space-y-2">
              {linkedTraining.map((t, i) => (
                <li key={t.id} className="flex items-center gap-3 text-sm text-slate-300">
                  <span className="text-slate-500">{i + 1}.</span>
                  <span>{t.title}</span>
                  <span className="ml-auto text-xs text-slate-500">{t.delivery_mode}</span>
                </li>
              ))}
              {linkedTraining.length === 0 ? <p className="text-sm text-slate-500">No linked training.</p> : null}
            </ol>
          </Card>
        </div>
      ) : null}

      {tab === 'Level Definition' ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-400">
            What each proficiency level means for <strong className="text-slate-200">{skill.name}</strong>.
            Self, manager and mentor ratings on the Skills Passport all refer to this scale.
          </p>
          {levelDefinitions.map((l) => (
            <Card key={l.level_no} className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/15 font-semibold text-accent-soft">
                L{l.level_no}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{l.level_title}</p>
                <p className="text-sm text-slate-400">{l.level_definition}</p>
              </div>
            </Card>
          ))}
          {levelDefinitions.length === 0 ? (
            <EmptyState
              title="No level definitions for this skill yet"
              hint="Skills normally carry a 1–5 rubric. Run db/10_skill_level_backfill.sql to add the standard ladder."
            />
          ) : null}
        </div>
      ) : null}

      {tab === 'Roles' ? (
        <SimpleTable
          columns={['Role', 'Function', 'Required Level', 'Priority', 'Mandatory']}
          rows={roles.map((r) => [r.role_name, r.function_area, `L${r.required_level}`, r.priority, r.mandatory ? 'Yes' : 'No'])}
          empty="No roles benchmark this skill."
        />
      ) : null}

      {tab === 'Training' ? (
        <SimpleTable
          columns={['Course', 'Type', 'Mode']}
          rows={linkedTraining.map((t) => [t.title, t.course_type, t.delivery_mode])}
          empty="No linked training."
        />
      ) : null}

      {tab === 'Certifications' ? (
        <SimpleTable
          columns={['Certification', 'Type', 'Required Level']}
          rows={certifications.map((c) => [c.title, c.certification_type, `L${c.required_level}`])}
          empty="No certifications linked."
        />
      ) : null}

      {tab === 'Mentors' ? (
        <SimpleTable
          columns={['Mentor', 'Level', 'Can Certify']}
          rows={mentors.map((m) => [m.full_name, `L${m.mentor_level}`, m.can_certify ? 'Yes' : 'No'])}
          empty="No mentors mapped."
        />
      ) : null}

      {tab === 'Overview' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <h3 className="mb-2 text-base font-semibold text-white">About this skill</h3>
            <p className="text-sm text-slate-400">{skill.description}</p>
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <Meta label="Code" value={skill.code} />
              <Meta label="Category" value={skill.category_name} />
              <Meta label="Criticality" value={skill.criticality} />
              <Meta label="Future Relevance" value={skill.future_relevance} />
            </dl>
          </Card>
          <Card>
            <h3 className="mb-2 text-base font-semibold text-white">At a glance</h3>
            <div className="space-y-2 text-sm text-slate-300">
              <Row label="Benchmark avg" value={benchmark.benchmark ?? '—'} />
              <Row label="Employee avg" value={benchmark.employee_avg ?? '—'} />
              <Row label="Mentors / SMEs" value={mentors.length} />
              <Row label="Linked training" value={linkedTraining.length} />
              <Row label="Roles requiring" value={roles.length} />
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function Meta({ label, value }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-slate-200">{value || '—'}</dd>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between border-b border-line pb-1.5">
      <span className="text-slate-400">{label}</span>
      <span className="text-white">{value}</span>
    </div>
  );
}

function SimpleTable({ columns, rows, empty }) {
  if (!rows.length) return <Card><p className="text-sm text-slate-500">{empty}</p></Card>;
  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full">
        <thead className="border-b border-line">
          <tr>
            {columns.map((c) => (
              <th key={c} className="th">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-ink-700/40">
              {r.map((cell, j) => (
                <td key={j} className="td">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
