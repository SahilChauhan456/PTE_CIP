'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { Bell, ChevronDown, LogOut, User } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { Avatar } from '@/components/ui';
import { ROLE_LABELS } from '@/lib/nav';
import { fetcher } from '@/lib/api';

export default function Topbar({ title }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const { data: inbox } = useSWR('/inbox/count', fetcher, { refreshInterval: 60000 });
  const unread = (inbox && inbox.unread) || 0;

  // Read the live record rather than trusting the JWT: the token is a 12-hour
  // snapshot, so a picture uploaded on /profile would otherwise not appear here
  // until the next sign-in. Falls back to the token claims for the first paint.
  const { data: me } = useSWR('/employees/me', fetcher);
  const identity = me || user || {};

  const roleLabel = user ? ROLE_LABELS[user.role] || user.role : '';
  // Prefer the hierarchy title (TM, DPM, Sr. DVM…) — it is what the person
  // actually is in the org. The permission role is the fallback.
  const subtitle = identity.org_title || roleLabel;

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line bg-ink-950/80 px-5 backdrop-blur">
      <h2 className="truncate text-lg font-semibold text-white">{title}</h2>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-lg border border-line bg-ink-900 px-3 py-1.5 text-sm text-slate-300 sm:flex">
          FY26 <ChevronDown size={14} className="text-slate-500" />
        </div>

        <button className="relative rounded-lg border border-line bg-ink-900 p-2 text-slate-300 hover:text-white">
          <Bell size={18} />
          {unread > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-bad text-[9px] font-bold text-white">
              {unread}
            </span>
          ) : null}
        </button>

        <div className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg border border-line bg-ink-900 py-1 pl-1 pr-2"
          >
            <Avatar name={identity.full_name || 'User'} src={identity.photo_url} size={30} />
            <div className="hidden text-left sm:block">
              <p className="text-xs font-medium leading-tight text-white">{identity.full_name}</p>
              <p className="text-[10px] leading-tight text-slate-500">{subtitle}</p>
            </div>
            <ChevronDown size={14} className="text-slate-500" />
          </button>

          {open ? (
            <div className="absolute right-0 mt-2 w-48 rounded-lg border border-line bg-ink-800 p-1 shadow-xl">
              <div className="flex items-center gap-2.5 border-b border-line px-3 py-2.5">
                <Avatar name={identity.full_name || 'User'} src={identity.photo_url} size={34} />
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-white">{identity.full_name}</p>
                  <p className="truncate text-[10px] text-slate-500">{identity.email}</p>
                  <p className="truncate text-[10px] text-slate-500">
                    {[identity.org_title, identity.job_role].filter(Boolean).join(' · ') || roleLabel}
                  </p>
                </div>
              </div>
              <Link
                href="/profile"
                onClick={() => setOpen(false)}
                className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-ink-700 hover:text-white"
              >
                <User size={15} /> My Profile
              </Link>
              <button
                onClick={logout}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-ink-700 hover:text-white"
              >
                <LogOut size={15} /> Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
