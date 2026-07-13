'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR, { mutate } from 'swr';
import { Search, Plus, X, FolderPlus } from 'lucide-react';
import { fetcher, api } from '@/lib/api';
import { PageHeader, Card, Skeleton, ErrorState, EmptyState, Badge } from '@/components/ui';
import { criticalityClasses } from '@/lib/ui';
import { useAuth } from '@/components/AuthProvider';
import AddSectionModal from '@/components/AddSectionModal';

export default function SkillsPage() {
  const { user } = useAuth();
  const isAdmin = (user?.roles || []).includes('admin');

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [label, setLabel] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showAddSection, setShowAddSection] = useState(false);

  const qs = new URLSearchParams();
  if (search) qs.set('search', search);
  if (category) qs.set('category', category);
  if (label) qs.set('label', label);
  const key = `/skills${qs.toString() ? `?${qs}` : ''}`;

  const { data, error, isLoading } = useSWR(key, fetcher);
  const { data: categories } = useSWR('/skills/categories', fetcher);
  const { data: labels } = useSWR('/skills/labels', fetcher);

  return (
    <div>
      <PageHeader title="Skills Library" subtitle="Strategic capability taxonomy for powertrain engineering">
        {isAdmin ? (
          <>
            <button className="btn-ghost" onClick={() => setShowAddSection(true)}>
              <FolderPlus size={16} /> Add Section
            </button>
            <button className="btn-primary" onClick={() => setShowAdd(true)}>
              <Plus size={16} /> Add Skill
            </button>
          </>
        ) : null}
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="input pl-9"
            placeholder="Search skills…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input max-w-[200px]" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All Categories</option>
          {(categories || []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select className="input max-w-[200px]" value={label} onChange={(e) => setLabel(e.target.value)}>
          <option value="">All Labels</option>
          {(labels || []).map((l) => (
            <option key={l.id} value={l.id}>
              {l.label_name}
            </option>
          ))}
        </select>
      </div>

      <Card className="overflow-x-auto p-0">
        {error ? (
          <div className="p-5">
            <ErrorState error={error} />
          </div>
        ) : isLoading ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : data?.length ? (
          <table className="w-full min-w-[760px]">
            <thead className="border-b border-line">
              <tr>
                <th className="th">Skill Name</th>
                <th className="th">Category</th>
                <th className="th">Labels</th>
                <th className="th">Criticality</th>
                <th className="th text-right">Assigned</th>
                <th className="th text-right">Linked Roles</th>
                <th className="th text-right">Mentors / SMEs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.map((s) => (
                <tr key={s.id} className="hover:bg-ink-700/40">
                  <td className="td">
                    <Link href={`/skills/${s.id}`} className="font-medium text-white hover:text-accent-soft">
                      {s.skill_name}
                    </Link>
                  </td>
                  <td className="td text-slate-400">{s.category || '—'}</td>
                  <td className="td">
                    <div className="flex flex-wrap gap-1">
                      {(s.labels || []).map((l) => (
                        <span
                          key={l.name}
                          className="chip"
                          style={{ backgroundColor: `${l.color}22`, color: l.color }}
                        >
                          {l.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="td">
                    <Badge className={criticalityClasses(s.criticality)}>{s.criticality}</Badge>
                  </td>
                  <td className="td text-right">{s.assigned_employees}</td>
                  <td className="td text-right">{s.linked_roles}</td>
                  <td className="td text-right">{s.mentors}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-5">
            <EmptyState title="No skills match your filters" />
          </div>
        )}
      </Card>

      {showAdd ? (
        <AddSkillModal
          categories={categories || []}
          onClose={() => setShowAdd(false)}
          onCreated={() => {
            setShowAdd(false);
            mutate(key);
          }}
        />
      ) : null}

      {showAddSection ? (
        <AddSectionModal
          onClose={() => setShowAddSection(false)}
          onCreated={() => {
            setShowAddSection(false);
            mutate('/skills/categories');
          }}
        />
      ) : null}
    </div>
  );
}

function AddSkillModal({ categories, onClose, onCreated }) {
  const [form, setForm] = useState({
    code: '',
    name: '',
    category_id: '',
    criticality: 'Medium',
    future_relevance: 'Medium',
    description: '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function save() {
    setSaving(true);
    setErr('');
    try {
      await api.post('/skills', form);
      onCreated();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-white">Add Skill</h3>
            <button onClick={onClose} className="text-slate-500 hover:text-white">
              <X size={18} />
            </button>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input className="input" placeholder="Code (e.g. EV-SYS)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              <input className="input" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <select className="input" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
              <option value="">Select category…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <select className="input" value={form.criticality} onChange={(e) => setForm({ ...form, criticality: e.target.value })}>
                {['Low', 'Medium', 'High', 'Critical'].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
              <select className="input" value={form.future_relevance} onChange={(e) => setForm({ ...form, future_relevance: e.target.value })}>
                {['Low', 'Medium', 'High', 'Very High'].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </div>
            <textarea className="input" rows={3} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            {err ? <p className="text-xs text-bad">{err}</p> : null}
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button className="btn-primary" onClick={save} disabled={saving || !form.code || !form.name}>
                {saving ? 'Saving…' : 'Create Skill'}
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
