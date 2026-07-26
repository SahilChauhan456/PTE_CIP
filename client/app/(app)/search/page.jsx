'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { Search as SearchIcon } from 'lucide-react';
import { fetcher } from '@/lib/api';
import { PageHeader, Card, Avatar, EmptyState } from '@/components/ui';

export default function SearchPage() {
  const [q, setQ] = useState('');

  const empKey = q ? `/employees?search=${encodeURIComponent(q)}` : '/employees';
  const skillKey = q ? `/skills?search=${encodeURIComponent(q)}` : '/skills';
  const { data: employees } = useSWR(empKey, fetcher);
  const { data: skills } = useSWR(skillKey, fetcher);

  return (
    <div>
      <PageHeader title="Search" subtitle="Find people and skills across the organization" />

      <div className="relative mb-5 max-w-xl">
        <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input className="input pl-9" placeholder="Search people or skills…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 text-sm font-semibold text-white">People</h3>
          <div className="space-y-2">
            {(employees || []).slice(0, 12).map((e) => (
              <Link key={e.id} href={`/employees/${e.id}`}>
                <Card className="card-tight flex items-center gap-3 transition hover:border-accent-soft">
                  <Avatar name={e.full_name} src={e.photo_url} size={34} />
                  <div>
                    <p className="text-sm text-white">{e.full_name}</p>
                    <p className="text-xs text-slate-500">{e.job_role} · {e.department}</p>
                  </div>
                </Card>
              </Link>
            ))}
            {employees && employees.length === 0 ? <EmptyState title="No people found" /> : null}
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-white">Skills</h3>
          <div className="space-y-2">
            {(skills || []).slice(0, 12).map((s) => (
              <Link key={s.id} href={`/skills/${s.id}`}>
                <Card className="card-tight flex items-center justify-between transition hover:border-accent-soft">
                  <div>
                    <p className="text-sm text-white">{s.skill_name}</p>
                    <p className="text-xs text-slate-500">{s.category}</p>
                  </div>
                  <span className="chip bg-accent/15 text-accent-soft">{s.assigned_employees} people</span>
                </Card>
              </Link>
            ))}
            {skills && skills.length === 0 ? <EmptyState title="No skills found" /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
