'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { Search, Plus, X, FolderPlus } from 'lucide-react';
import { fetcher, api } from '@/lib/api';
import { PageHeader, Card, Skeleton, ErrorState, EmptyState, Badge } from '@/components/ui';
import { useAuth } from '@/components/AuthProvider';
import AddSectionModal from '@/components/AddSectionModal';

const TYPES = ['Course', 'Workshop', 'Seminar', 'Certification', 'Learning Path', 'Webinar'];

export default function TrainingPage() {
  const { user } = useAuth();
  const roles = user?.roles || [];
  const canAdd = roles.includes('admin') || roles.includes('training_coordinator');

  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [category, setCategory] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showAddSection, setShowAddSection] = useState(false);

  const qs = new URLSearchParams();
  if (search) qs.set('search', search);
  if (type) qs.set('type', type);
  if (category) qs.set('category', category);
  const key = `/training${qs.toString() ? `?${qs}` : ''}`;

  const { data, error, isLoading } = useSWR(key, fetcher);
  const { data: categories } = useSWR('/skills/categories', fetcher);

  return (
    <div>
      <PageHeader title="Training Catalog" subtitle="SME-led courses, workshops and certifications">
        {canAdd ? (
          <>
            <button className="btn-ghost" onClick={() => setShowAddSection(true)}>
              <FolderPlus size={16} /> Add Section
            </button>
            <button className="btn-primary" onClick={() => setShowAdd(true)}>
              <Plus size={16} /> Add Training
            </button>
          </>
        ) : null}
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className="input pl-9" placeholder="Search training…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input max-w-[200px]" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All Types</option>
          {TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <select className="input max-w-[200px]" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All Categories</option>
          {(categories || []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <Card className="overflow-x-auto p-0">
        {error ? (
          <div className="p-5"><ErrorState error={error} /></div>
        ) : isLoading || !data ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : data.length ? (
          <table className="w-full min-w-[820px]">
            <thead className="border-b border-line">
              <tr>
                <th className="th">Training / Course</th>
                <th className="th">Type</th>
                <th className="th">Duration</th>
                <th className="th">Skill(s)</th>
                <th className="th">SME / Trainer</th>
                <th className="th">Mode</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.map((c) => (
                <tr key={c.id} className="hover:bg-ink-700/40">
                  <td className="td">
                    <p className="font-medium text-white">{c.title}</p>
                    <p className="max-w-md truncate text-xs text-slate-500">{c.description}</p>
                  </td>
                  <td className="td">{c.course_type}</td>
                  <td className="td">{c.duration_hours ? `${c.duration_hours} hrs` : '—'}</td>
                  <td className="td">
                    <div className="flex flex-wrap gap-1">
                      {(c.skills || []).slice(0, 2).map((s) => (
                        <span key={s} className="chip bg-accent/15 text-accent-soft">
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="td">{c.owner_sme || '—'}</td>
                  <td className="td">
                    <Badge className="bg-slate-500/15 text-slate-300">{c.delivery_mode}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-5"><EmptyState title="No training matches your filters" /></div>
        )}
      </Card>

      {showAdd ? (
        <AddTrainingModal onClose={() => setShowAdd(false)} onCreated={() => { setShowAdd(false); mutate(key); }} />
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

function AddTrainingModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    course_code: '',
    title: '',
    course_type: 'Course',
    delivery_mode: 'ILT',
    duration_hours: '',
    difficulty: 'Foundation',
    description: '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function save() {
    setSaving(true);
    setErr('');
    try {
      await api.post('/training', { ...form, duration_hours: Number(form.duration_hours) || null });
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
            <h3 className="text-base font-semibold text-white">Add Training</h3>
            <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={18} /></button>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input className="input" placeholder="Course code" value={form.course_code} onChange={(e) => setForm({ ...form, course_code: e.target.value })} />
              <input className="input" placeholder="Duration (hrs)" value={form.duration_hours} onChange={(e) => setForm({ ...form, duration_hours: e.target.value })} />
            </div>
            <input className="input" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <select className="input" value={form.course_type} onChange={(e) => setForm({ ...form, course_type: e.target.value })}>
                {TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
              <select className="input" value={form.delivery_mode} onChange={(e) => setForm({ ...form, delivery_mode: e.target.value })}>
                {['ILT', 'Self Paced', 'Mixed', 'Online'].map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <textarea className="input" rows={3} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            {err ? <p className="text-xs text-bad">{err}</p> : null}
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" onClick={onClose}>Cancel</button>
              <button className="btn-primary" onClick={save} disabled={saving || !form.course_code || !form.title}>
                {saving ? 'Saving…' : 'Create'}
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
