'use client';

import useSWR, { mutate } from 'swr';
import { Circle, CheckCircle2 } from 'lucide-react';
import { fetcher, api } from '@/lib/api';
import { PageHeader, Card, Skeleton, ErrorState, EmptyState, Badge } from '@/components/ui';
import { formatDate, statusClasses } from '@/lib/ui';

export default function InboxPage() {
  const { data, error, isLoading } = useSWR('/inbox', fetcher);
  const { data: approvals } = useSWR('/inbox/approvals', fetcher);

  async function markRead(id) {
    await api.patch(`/inbox/${id}/read`, {});
    mutate('/inbox');
    mutate('/inbox/count');
  }

  return (
    <div>
      <PageHeader title="Inbox" subtitle="Approvals, assessments, training and notifications" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {error ? (
            <ErrorState error={error} />
          ) : isLoading || !data ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : data.items.length ? (
            <div className="space-y-2">
              {data.items.map((item) => (
                <Card key={item.id} className={`flex items-start gap-3 ${item.status === 'Unread' ? 'border-accent/40' : ''}`}>
                  <button onClick={() => item.status === 'Unread' && markRead(item.id)} className="mt-0.5 text-slate-500 hover:text-accent-soft">
                    {item.status === 'Unread' ? <Circle size={16} className="fill-accent text-accent" /> : <CheckCircle2 size={16} />}
                  </button>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-white">{item.title}</p>
                      <Badge className={statusClasses(item.priority)}>{item.priority}</Badge>
                      <span className="chip bg-slate-500/15 text-slate-400">{item.item_type}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-400">{item.body}</p>
                    {item.due_at ? <p className="mt-1 text-xs text-slate-500">Due {formatDate(item.due_at)}</p> : null}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState title="Your inbox is empty" />
          )}
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-white">Pending Approvals</h3>
          {approvals && approvals.length ? (
            <div className="space-y-2">
              {approvals.map((a) => (
                <Card key={a.id} className="card-tight">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-white">{a.approval_type}</p>
                    <Badge className={statusClasses(a.status)}>{a.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Requested by {a.requested_by || '—'}</p>
                  <p className="text-xs text-slate-600">{formatDate(a.requested_at)}</p>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="card-tight"><p className="text-sm text-slate-500">No pending approvals.</p></Card>
          )}
        </div>
      </div>
    </div>
  );
}
