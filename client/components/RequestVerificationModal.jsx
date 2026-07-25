'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { Search, Send, X } from 'lucide-react';
import { api, fetcher } from '@/lib/api';
import { Card, Avatar } from '@/components/ui';
import { useAuth } from '@/components/AuthProvider';

// Search anyone in the directory and ask them to verify your profile / CV.
// The request lands in their inbox as an approval they can accept or reject.
export default function RequestVerificationModal({ onClose, onSent }) {
  const { user } = useAuth();
  const [term, setTerm] = useState('');
  const [debounced, setDebounced] = useState('');
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term.trim()), 300);
    return () => clearTimeout(timer);
  }, [term]);

  // Empty search returns the full active directory, so this always has results.
  const { data: people, isLoading } = useSWR(
    `/employees${debounced ? `?search=${encodeURIComponent(debounced)}` : ''}`,
    fetcher
  );

  const candidates = (people || []).filter((p) => p.id !== user?.employee_id);

  async function send() {
    if (!selected) return;
    setSending(true);
    setErr('');
    try {
      await api.post('/verification/request', {
        approver_employee_id: selected.id,
        message: message || null,
      });
      onSent();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <Card>
          <div className="mb-1 flex items-center justify-between">
            <h3 className="text-base font-semibold text-white">Request Verification</h3>
            <button onClick={onClose} className="text-slate-500 hover:text-white">
              <X size={18} />
            </button>
          </div>
          <p className="mb-4 text-xs text-slate-500">
            Pick anyone in the organisation to review your profile. They will see the request in their
            inbox and can approve or reject it.
          </p>

          {selected ? (
            <div className="mb-3 flex items-center justify-between rounded-lg border border-accent/40 bg-accent/10 p-3">
              <div className="flex items-center gap-3">
                <Avatar name={selected.full_name} src={selected.photo_url} size={36} />
                <div>
                  <p className="text-sm font-medium text-white">{selected.full_name}</p>
                  <p className="text-xs text-slate-400">
                    {[selected.job_role, selected.department].filter(Boolean).join(' · ') || selected.email}
                  </p>
                </div>
              </div>
              <button className="text-xs text-slate-400 hover:text-white" onClick={() => setSelected(null)}>
                Change
              </button>
            </div>
          ) : (
            <>
              <div className="relative mb-2">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  className="input pl-9"
                  placeholder="Search people by name or email…"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="mb-3 max-h-56 overflow-y-auto rounded-lg border border-line bg-ink-900">
                {isLoading ? (
                  <p className="p-3 text-xs text-slate-500">Loading people…</p>
                ) : candidates.length ? (
                  candidates.slice(0, 30).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelected(p)}
                      className="flex w-full items-center gap-3 border-b border-line px-3 py-2 text-left last:border-0 hover:bg-ink-700/50"
                    >
                      <Avatar name={p.full_name} src={p.photo_url} size={28} />
                      <div className="min-w-0">
                        <p className="truncate text-sm text-slate-200">{p.full_name}</p>
                        <p className="truncate text-xs text-slate-500">
                          {[p.job_role, p.department].filter(Boolean).join(' · ') || p.email}
                        </p>
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="p-3 text-xs text-slate-500">Nobody matches that search.</p>
                )}
              </div>
            </>
          )}

          <div className="mb-3">
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Message (optional)</label>
            <textarea
              className="input"
              rows={3}
              placeholder="Please verify my updated experience and skills."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          {err ? <p className="mb-2 text-xs text-bad">{err}</p> : null}

          <div className="flex justify-end gap-2">
            <button className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-primary" onClick={send} disabled={sending || !selected}>
              <Send size={14} /> {sending ? 'Sending…' : 'Send Request'}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
