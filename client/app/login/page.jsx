'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Loader2 } from 'lucide-react';
import { api, setSession, getToken } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { initials } from '@/lib/ui';

// Shared demo password (checked server-side). One-click persona login uses it.
const DEMO_PASSWORD = 'demo123';

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [personas, setPersonas] = useState([]);
  const [pending, setPending] = useState(null); // email currently signing in
  const [error, setError] = useState('');

  useEffect(() => {
    if (getToken()) {
      router.replace('/dashboard');
      return;
    }
    api
      .personas()
      .then(setPersonas)
      .catch(() => setError('Could not reach the API. Is the server running on port 4000?'));
  }, [router]);

  async function signIn(persona) {
    setError('');
    setPending(persona.title + persona.email);
    try {
      const { token, user } = await api.login(persona.email, DEMO_PASSWORD);
      setSession(token, user);
      setUser(user);
      router.replace('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed');
      setPending(null);
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 bg-ink-950 lg:grid-cols-[380px_1fr]">
      {/* Left branding panel */}
      <div className="flex flex-col justify-between border-b border-line bg-gradient-to-b from-ink-900 to-ink-950 p-8 lg:border-b-0 lg:border-r">
        <div>
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-white">
              <Zap size={22} />
            </div>
            <span className="text-2xl font-semibold text-white">PTE CIP</span>
          </div>
          <p className="text-sm font-medium text-slate-300">
            Powertrain Engineering Capability Intelligence Platform
          </p>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-500">
            Internal enterprise SaaS for skill mapping, SME-led course development, mentor-led
            capability building, certification tracking and workforce capability analytics.
          </p>
        </div>
        <p className="mt-8 max-w-xs text-xs leading-relaxed text-slate-600">
          Demo authentication is role-based and SSO-ready for Supabase Auth, SAML, Entra ID and
          Google Workspace.
        </p>
      </div>

      {/* Right persona grid */}
      <div className="p-6 lg:p-10">
        <div className="mb-5">
          <h1 className="text-lg font-semibold text-white">Choose a demo persona</h1>
          <p className="text-sm text-slate-500">Click any card to sign in — role-based access applies.</p>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad">{error}</div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {personas.map((p) => {
            const busy = pending === p.title + p.email;
            const anyPending = pending !== null;
            return (
              <button
                key={p.title + p.email}
                onClick={() => signIn(p)}
                disabled={anyPending}
                className={`group flex items-start gap-3 rounded-xl border border-line bg-ink-800 p-4 text-left transition hover:border-accent-soft hover:bg-ink-700/60 disabled:opacity-60 ${
                  busy ? 'border-accent-soft' : ''
                }`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-soft text-xs font-semibold text-white">
                  {initials(p.full_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">{p.title}</p>
                  <p className="text-sm text-slate-300">{p.full_name}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">{p.subtitle}</p>
                </div>
                {busy ? <Loader2 size={16} className="mt-1 animate-spin text-accent-soft" /> : null}
              </button>
            );
          })}
        </div>

        {personas.length === 0 && !error ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-ink-800" />
            ))}
          </div>
        ) : null}

      </div>
    </div>
  );
}
