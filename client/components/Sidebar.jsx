'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import useSWR from 'swr';
import { Zap } from 'lucide-react';
import { visibleNav } from '@/lib/nav';
import { useAuth } from '@/components/AuthProvider';
import { fetcher } from '@/lib/api';

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const roles = (user && user.roles) || [];
  const items = visibleNav(roles);

  const { data: inbox } = useSWR('/inbox/count', fetcher, { refreshInterval: 60000 });
  const unread = (inbox && inbox.unread) || 0;

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-16 flex-col border-r border-line bg-ink-900 md:w-60">
      <div className="flex h-16 items-center gap-2 border-b border-line px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white">
          <Zap size={18} />
        </div>
        <div className="hidden md:block">
          <p className="text-sm font-semibold leading-tight text-white">PTE CIP</p>
          <p className="text-[10px] leading-tight text-slate-500">Capability Intelligence</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                active
                  ? 'bg-accent/15 text-white'
                  : 'text-slate-400 hover:bg-ink-800 hover:text-slate-100'
              }`}
            >
              <Icon size={18} className="shrink-0" />
              <span className="hidden md:inline">{item.label}</span>
              {item.badge === 'inbox' && unread > 0 ? (
                <span className="ml-auto hidden items-center justify-center rounded-full bg-bad px-1.5 text-[10px] font-semibold text-white md:inline-flex">
                  {unread}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
