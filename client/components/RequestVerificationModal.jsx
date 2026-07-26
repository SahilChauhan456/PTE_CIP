'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Send, X } from 'lucide-react';
import { api, fetcher } from '@/lib/api';
import { Card, Avatar } from '@/components/ui';

// Ask someone in your reporting line to verify your profile / CV. The request
// lands in their inbox as an approval they can accept or reject.
//
// This used to be a free search over the whole directory. Under top-down
// visibility the directory is your own subtree, so searching it would only ever
// offer your own reports — the wrong direction, and empty for a leaf employee.
// The server returns the chain above you instead (/verification/approvers), and
// enforces the same list on submit.
export default function RequestVerificationModal({ onClose, onSent }) {
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');

  const { data: candidates, isLoading } = useSWR('/verification/approvers', fetcher);
  const options = candidates || [];

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
            Pick someone in your reporting line to review your profile. They will see the request in
            their inbox and can approve or reject it.
          </p>

          {selected ? (
            <div className="mb-3 flex items-center justify-between rounded-lg border border-accent/40 bg-accent/10 p-3">
              <div className="flex items-center gap-3">
                <Avatar name={selected.full_name} src={selected.photo_url} size={36} />
                <div>
                  <p className="text-sm font-medium text-white">{selected.full_name}</p>
                  <p className="text-xs text-slate-400">
                    {selected.org_title || 'Manager'}
                    {selected.distance === 1 ? ' · your manager' : ''}
                  </p>
                </div>
              </div>
              <button className="text-xs text-slate-400 hover:text-white" onClick={() => setSelected(null)}>
                Change
              </button>
            </div>
          ) : (
            <div className="mb-3 max-h-56 overflow-y-auto rounded-lg border border-line bg-ink-900">
              {isLoading ? (
                <p className="p-3 text-xs text-slate-500">Loading your reporting line…</p>
              ) : options.length ? (
                options.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelected(p)}
                    className="flex w-full items-center gap-3 border-b border-line px-3 py-2 text-left last:border-0 hover:bg-ink-700/50"
                  >
                    <Avatar name={p.full_name} src={p.photo_url} size={28} />
                    <div className="min-w-0">
                      <p className="truncate text-sm text-slate-200">{p.full_name}</p>
                      <p className="truncate text-xs text-slate-500">
                        {p.org_title || '—'}
                        {p.distance === 1 ? ' · your manager' : ''}
                      </p>
                    </div>
                  </button>
                ))
              ) : (
                <p className="p-3 text-xs text-slate-500">
                  There is nobody above you to request verification from.
                </p>
              )}
            </div>
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
