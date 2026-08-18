'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR, { mutate } from 'swr';
import { Search, UserPlus, X } from 'lucide-react';
import { fetcher, api } from '@/lib/api';
import { PageHeader, Card, Skeleton, ErrorState, EmptyState, Avatar } from '@/components/ui';
import { useAuth } from '@/components/AuthProvider';

// Roles that can onboard people (mirrors the server-side gate).
const MANAGE_ROLES = ['admin', 'executive', 'department_head'];

export default function EmployeesPage() {
  const { user } = useAuth();
  const canManage = (user?.roles || []).some((r) => MANAGE_ROLES.includes(r));

  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const key = `/employees${search ? `?search=${encodeURIComponent(search)}` : ''}`;
  const { data, error, isLoading } = useSWR(key, fetcher);

  // Directory + onboarding is limited to the top-level roles.
  if (!canManage) {
    return (
      <div>
        <PageHeader title="Employees" />
        <EmptyState
          title="Restricted"
          hint="Employee management is available to admins, executives and department heads."
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Employees" subtitle="Directory and onboarding">
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <UserPlus size={16} /> Add Employee
        </button>
      </PageHeader>

      <div className="relative mb-4 max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input className="input pl-9" placeholder="Search employees…" value={search} onChange={(e) => setSearch(e.target.value)} />
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
          <table className="w-full min-w-[640px]">
            <thead className="border-b border-line">
              <tr>
                <th className="th">Employee</th>
                <th className="th">Title</th>
                <th className="th">Email</th>
                <th className="th">Job Role</th>
                <th className="th">Department</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.map((e) => (
                <tr key={e.id} className="hover:bg-ink-700/40">
                  <td className="td">
                    <div className="flex items-center gap-2">
                      <Avatar name={e.full_name} src={e.photo_url} size={30} />
                      <Link href={`/employees/${e.id}`} className="font-medium text-white hover:text-accent-soft">
                        {e.full_name}
                      </Link>
                    </div>
                  </td>
                  <td className="td text-slate-400">{e.org_title || '—'}</td>
                  <td className="td text-slate-400">{e.email}</td>
                  <td className="td text-slate-400">{e.job_role || '—'}</td>
                  <td className="td text-slate-400">{e.department || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-5"><EmptyState title="No employees match your search" /></div>
        )}
      </Card>

      {showAdd ? (
        <AddEmployeeModal
          onClose={() => setShowAdd(false)}
          onCreated={() => {
            setShowAdd(false);
            mutate(key);
          }}
        />
      ) : null}
    </div>
  );
}

function AddEmployeeModal({ onClose, onCreated }) {
  const { data: options } = useSWR('/employees/form-options', fetcher);
  const [form, setForm] = useState({
    employee_code: '',
    full_name: '',
    email: '',
    gender: 'Not Specified',
    grade: '',
    joining_date: '',
    department_id: '',
    team_id: '',
    job_role_id: '',
    manager_id: '',
    location_id: '',
    org_title: '',
    create_login: true,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  // Teams filtered to the selected department (falls back to all).
  const teams = (options?.teams || []).filter(
    (t) => !form.department_id || t.department_id === form.department_id
  );

  async function save() {
    setSaving(true);
    setErr('');
    try {
      await api.post('/employees', form);
      onCreated();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-white">Add Employee</h3>
            <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={18} /></button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Employee Code *">
              <input className="input" placeholder="PTE0021" value={form.employee_code} onChange={set('employee_code')} />
            </Field>
            <Field label="Full Name *">
              <input className="input" placeholder="Priya Nair" value={form.full_name} onChange={set('full_name')} />
            </Field>
            <Field label="Email *">
              <input className="input" placeholder="priya.nair@ptecip.local" value={form.email} onChange={set('email')} />
            </Field>
            <Field label="Gender">
              <select className="input" value={form.gender} onChange={set('gender')}>
                {['Not Specified', 'Male', 'Female', 'Other'].map((g) => <option key={g}>{g}</option>)}
              </select>
            </Field>
            <Field label="Grade">
              <input className="input" placeholder="AM / DM / Manager" value={form.grade} onChange={set('grade')} />
            </Field>
            <Field label="Joining Date">
              <input className="input" style={{ colorScheme: 'dark' }} type="date" value={form.joining_date} onChange={set('joining_date')} />
            </Field>
            <Field label="Department">
              <select className="input" value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value, team_id: '' })}>
                <option value="">Select…</option>
                {(options?.departments || []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
            <Field label="Team">
              <select className="input" value={form.team_id} onChange={set('team_id')}>
                <option value="">Select…</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </Field>
            <Field label="Job Role">
              <select className="input" value={form.job_role_id} onChange={set('job_role_id')}>
                <option value="">Select…</option>
                {(options?.jobRoles || []).map((r) => <option key={r.id} value={r.id}>{r.role_name}</option>)}
              </select>
            </Field>
            {/* Required, and limited to your own subtree: everyone reports to
                someone, and you can only place a hire under yourself or below. */}
            <Field label="Manager *">
              <select className="input" value={form.manager_id} onChange={set('manager_id')}>
                <option value="">Select…</option>
                {(options?.managers || []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.org_title ? `${m.full_name} — ${m.org_title}` : m.full_name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Hierarchy Title">
              <select className="input" value={form.org_title} onChange={set('org_title')}>
                <option value="">Select…</option>
                {(options?.orgTitles || []).map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Location">
              <select className="input" value={form.location_id} onChange={set('location_id')}>
                <option value="">Select…</option>
                {(options?.locations || []).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </Field>
          </div>

          <label className="mt-3 flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={form.create_login}
              onChange={(e) => setForm({ ...form, create_login: e.target.checked })}
            />
            Create a login account (Employee persona) for this person
          </label>

          {err ? <p className="mt-3 text-xs text-bad">{err}</p> : null}

          <div className="mt-4 flex justify-end gap-2">
            <button className="btn-ghost" onClick={onClose}>Cancel</button>
            <button
              className="btn-primary"
              onClick={save}
              disabled={saving || !form.employee_code || !form.full_name || !form.email || !form.manager_id}
            >
              {saving ? 'Saving…' : 'Create Employee'}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-400">{label}</label>
      {children}
    </div>
  );
}
