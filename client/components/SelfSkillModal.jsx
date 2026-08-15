'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { Check, Plus, Search, X } from 'lucide-react';
import { api, fetcher } from '@/lib/api';
import { Card } from '@/components/ui';
import { LEVEL_TITLES } from '@/lib/ui';

// Adds a skill to your own passport: pick one from the library, or type a name
// that isn't there yet and it gets created. Recorded as a Self assessment.
export default function SelfSkillModal({ employeeId, onClose, onSaved }) {
  const [term, setTerm] = useState('');
  const [debounced, setDebounced] = useState('');
  const [selected, setSelected] = useState(null);
  const [level, setLevel] = useState(3);
  const [comments, setComments] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  // Only needed when typing a name that isn't in the library yet.
  const { data: categories } = useSWR('/skills/categories', fetcher);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term.trim()), 300);
    return () => clearTimeout(timer);
  }, [term]);

  const { data: results, isLoading } = useSWR(
    debounced.length >= 2 ? `/skills?search=${encodeURIComponent(debounced)}` : null,
    fetcher
  );

  const typed = term.trim();
  const exactMatch = (results || []).some((r) => r.skill_name.toLowerCase() === typed.toLowerCase());
  const canCreate = typed.length >= 2 && !exactMatch && !selected;

  async function save() {
    setSaving(true);
    setErr('');
    try {
      await api.post(`/employees/${employeeId}/skills`, {
        ...(selected ? { skill_id: selected.id } : { skill_name: typed, category_id: categoryId }),
        self_level: level,
        comments: comments || null,
      });
      onSaved();
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

          {selected ? (
            <div className="mb-3 flex items-center justify-between rounded-lg border border-accent/40 bg-accent/10 p-3">
              <div>
                <p className="text-sm font-medium text-white">{selected.skill_name}</p>
                <p className="text-xs text-slate-400">{selected.category || 'Uncategorised'}</p>
              </div>
              <button
                className="text-xs text-slate-400 hover:text-white"
                onClick={() => {
                  setSelected(null);
                  setTerm('');
                }}
              >
                Change
              </button>
            </div>
          ) : (
            <>
              <div className="relative mb-2">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  className="input pl-9"
                  placeholder="Search the skill library, or type a new skill…"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="mb-3 max-h-48 overflow-y-auto rounded-lg border border-line bg-ink-900">
                {debounced.length < 2 ? (
                  <p className="p-3 text-xs text-slate-500">Type at least 2 characters to search.</p>
                ) : isLoading ? (
                  <p className="p-3 text-xs text-slate-500">Searching…</p>
                ) : (results || []).length ? (
                  (results || []).slice(0, 25).map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelected(s)}
                      className="flex w-full items-center justify-between border-b border-line px-3 py-2 text-left last:border-0 hover:bg-ink-700/50"
                    >
                      <span className="text-sm text-slate-200">{s.skill_name}</span>
                      <span className="text-xs text-slate-500">{s.category || '—'}</span>
                    </button>
                  ))
                ) : (
                  <p className="p-3 text-xs text-slate-500">No library skill matches “{debounced}”.</p>
                )}
              </div>

              {canCreate ? (
                <>
                  <p className="mb-3 flex items-start gap-2 rounded-lg border border-warn/30 bg-warn/10 p-2.5 text-xs text-warn">
                    <Plus size={14} className="mt-0.5 shrink-0" />
                    <span>
                      “{typed}” isn’t in the library yet — saving will add it as a new skill and put it on
                      your passport.
                    </span>
                  </p>
                  {/* Required: this row joins the company-wide library, and one
                      with no category shows up blank in the Skills Library. */}
                  <div className="mb-3">
                    <label className="mb-1.5 block text-xs font-medium text-slate-400">
                      Category for the new skill *
                    </label>
                    <select
                      className="input"
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                    >
                      <option value="">Choose a category…</option>
                      {(categories || []).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : null}
            </>
          )}

          <div className="mb-3">
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Your level</label>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setLevel(n)}
                  className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                    level === n
                      ? 'border-accent-soft bg-accent/15 text-white'
                      : 'border-line bg-ink-900 text-slate-400 hover:text-white'
                  }`}
                >
                  L{n} · {LEVEL_TITLES[n]}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Evidence / note (optional)</label>
            <textarea
              className="input"
              rows={2}
              placeholder="Where you used this skill…"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
            />
          </div>

          {err ? <p className="mb-2 text-xs text-bad">{err}</p> : null}

          <div className="flex justify-end gap-2">
            <button className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={save}
              disabled={saving || (!selected && typed.length < 2) || (canCreate && !categoryId)}
            >
              <Check size={14} /> {saving ? 'Saving…' : 'Add to Passport'}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
