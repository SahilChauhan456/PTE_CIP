'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { fetcher } from '@/lib/api';
import { PageHeader, Card, Skeleton, ErrorState, EmptyState, Avatar, Badge } from '@/components/ui';

// Org chart for whatever the signed-in user is allowed to see: themselves plus
// their whole subtree. A leaf employee gets a chart of exactly one person, which
// falls out of the same rule rather than being a special case.
//
// The API returns a flat, ordered list; nesting is done here on manager_id so
// the same payload works for a mid-tree manager and for an admin viewing the
// whole organisation.
function buildForest(nodes) {
  const byId = new Map(nodes.map((n) => [n.id, { ...n, children: [] }]));
  const roots = [];
  for (const node of byId.values()) {
    const parent = node.manager_id ? byId.get(node.manager_id) : null;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

function TreeNode({ node, depth }) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children.length > 0;

  return (
    <li>
      <div
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-ink-700/40"
        style={{ marginLeft: depth * 20 }}
      >
        <button
          onClick={() => setOpen((v) => !v)}
          className={`text-slate-500 hover:text-slate-200 ${hasChildren ? '' : 'invisible'}`}
          aria-label={open ? 'Collapse' : 'Expand'}
        >
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        <Avatar name={node.full_name} src={node.photo_url} size={28} />

        <Link href={`/employees/${node.id}`} className="min-w-0 flex-1">
          <span className="text-sm text-slate-200 hover:text-white">{node.full_name}</span>
          <span className="ml-2 text-xs text-slate-500">
            {[node.job_role, node.department].filter(Boolean).join(' · ')}
          </span>
        </Link>

        {node.org_title ? (
          <Badge className="border-accent/40 bg-accent/10 text-accent">{node.org_title}</Badge>
        ) : null}
        {hasChildren ? (
          <span className="text-xs text-slate-500">{node.children.length}</span>
        ) : null}
      </div>

      {hasChildren && open ? (
        <ul>
          {node.children.map((c) => (
            <TreeNode key={c.id} node={c} depth={depth + 1} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export default function OrgChartPage() {
  const { data, error, isLoading } = useSWR('/employees/org-chart', fetcher);

  const forest = useMemo(() => buildForest(data?.nodes || []), [data]);
  const chain = data?.managerChain || [];

  return (
    <div>
      <PageHeader
        title="Org Chart"
        subtitle={
          data ? `${data.nodes.length} ${data.nodes.length === 1 ? 'person' : 'people'} in your organisation` : null
        }
      />

      {/* The chain above you: name and title only, and not clickable — you can
          see who you report to, not their record. */}
      {chain.length ? (
        <Card className="mb-4">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            Above you
          </h3>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm">
            {[...chain].reverse().map((m, i) => (
              <span key={m.id} className="flex items-center gap-2">
                {i > 0 ? <ChevronRight size={12} className="text-slate-600" /> : null}
                <Avatar name={m.full_name} src={m.photo_url} size={22} />
                <span className="text-slate-300">{m.full_name}</span>
                <span className="text-xs text-slate-500">{m.org_title || '—'}</span>
              </span>
            ))}
          </div>
        </Card>
      ) : null}

      <Card>
        {error ? (
          <ErrorState error={error} />
        ) : isLoading || !data ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-9" />
            ))}
          </div>
        ) : forest.length ? (
          <ul>
            {forest.map((n) => (
              <TreeNode key={n.id} node={n} depth={0} />
            ))}
          </ul>
        ) : (
          <EmptyState title="Nothing to show" hint="Your organisation is empty." />
        )}
      </Card>
    </div>
  );
}
