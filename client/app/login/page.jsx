'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
// Commented out together with the <GoogleLogin> block below — with the button
// disabled this import is the only thing pulling in @react-oauth/google, and it
// fails to resolve until that package is installed. Uncomment both together.
// import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { Zap, ShieldCheck, Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { api, setSession, getToken } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // The globe artwork lives at /public/earth.png; fall back to the inline SVG if it is missing.
  const [artOk, setArtOk] = useState(true);

  useEffect(() => {
    if (getToken()) {
      router.replace('/profile');
    }
  }, [router]);

  async function handlePasswordLogin(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { token, user } = await api.login(email.trim(), password);
      setSession(token, user);
      setUser(user);
      router.replace('/profile');
    } catch (err) {
      // 403 = email not in the employees table; 401 = wrong password.
      setError(err.message || 'Sign-in failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle(credential) {
    setError('');
    try {
      const { token, user } = await api.google(credential);
      setSession(token, user);
      setUser(user);
      // Land on the user's own profile — their capability record is the entry point.
      router.replace('/profile');
    } catch (err) {
      // 403 = email not in the employees table; other codes = auth/config errors.
      setError(err.message || 'Sign-in failed');
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink-950 p-4 sm:p-6 lg:p-10">
      {/* Ambient backdrop glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[560px] w-[560px] rounded-full bg-accent/20 blur-[150px]" />
        <div className="absolute -bottom-48 -right-32 h-[600px] w-[600px] rounded-full bg-accent-soft/10 blur-[170px]" />
      </div>

      {/* Floating card */}
      <div className="relative grid w-full max-w-[1060px] gap-3 overflow-hidden rounded-[28px] border border-line bg-gradient-to-br from-ink-800 via-ink-900 to-ink-950 p-3 shadow-2xl shadow-black/60 lg:grid-cols-2 lg:gap-4 lg:p-4">
        {/* ---------- Left: sign-in ---------- */}
        <div className="flex flex-col justify-between px-4 py-6 sm:px-8">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-line bg-ink-800/70 py-1.5 pl-1.5 pr-4">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-white">
              <Zap size={14} />
            </span>
            <span className="text-sm font-semibold tracking-wide text-white">PTE CIP</span>
          </div>

          <div className="mx-auto w-full max-w-[320px] py-12 text-center lg:py-16">
            <h1 className="text-[26px] font-semibold leading-tight text-white sm:text-3xl">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Sign in to the Capability Intelligence Platform
            </p>

            {error ? (
              <div className="mt-6 rounded-xl border border-bad/30 bg-bad/10 px-3 py-2 text-left text-sm text-bad">
                {error}
              </div>
            ) : null}

            <form onSubmit={handlePasswordLogin} className="mt-8 space-y-3 text-left">
              <div className="relative">
                <Mail
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full rounded-xl border border-line bg-ink-800/70 py-2.5 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="relative">
                <Lock
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full rounded-xl border border-line bg-ink-800/70 py-2.5 pl-9 pr-10 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-accent focus:ring-1 focus:ring-accent"
                />
                {/* type="button" so it never submits the form; tabIndex={-1} keeps
                    Tab going straight from password to Sign in. */}
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 transition hover:text-slate-300"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-2.5 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Signing in…
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>

            {/* <div className="mt-8">
              {GOOGLE_CLIENT_ID ? (
                <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
                  <div className="flex justify-center [color-scheme:light]">
                    <GoogleLogin
                      onSuccess={(cred) => handleGoogle(cred.credential)}
                      onError={() => setError('Google sign-in was cancelled or failed.')}
                      theme="filled_blue"
                      shape="pill"
                      size="large"
                      width="300"
                      text="continue_with"
                    />
                  </div>
                </GoogleOAuthProvider>
              ) : (
                <div className="rounded-xl border border-line bg-ink-800 px-3 py-2.5 text-left text-sm text-slate-400">
                  Google sign-in is not configured. Set{' '}
                  <code className="text-slate-300">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> in{' '}
                  <code className="text-slate-300">client/.env.local</code>.
                </div>
              )}
            </div> */}

            <div className="mt-8 flex items-center gap-3">
              <span className="h-px flex-1 bg-line" />
              <span className="text-[11px] uppercase tracking-widest text-slate-600">
                Employees only
              </span>
              <span className="h-px flex-1 bg-line" />
            </div>

            <p className="mt-4 flex items-center justify-center gap-1.5 text-xs leading-relaxed text-slate-500">
              <ShieldCheck size={13} className="shrink-0 text-accent-soft" />
              Access is restricted to registered accounts
            </p>
          </div>

          <div className="flex items-center justify-between px-1 text-xs text-slate-600">
            <span>Powertrain Engineering · Internal</span>
            <span className="hidden sm:inline">Terms &amp; Privacy</span>
          </div>
        </div>

        {/* ---------- Right: artwork ---------- */}
        <div className="relative hidden min-h-[520px] overflow-hidden rounded-[20px] border border-line bg-gradient-to-b from-ink-900 via-[#0A1526] to-[#060E1C] lg:block">
          {/* Grid + halo */}
          <div
            className="absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                'linear-gradient(to right, #1E2A44 1px, transparent 1px), linear-gradient(to bottom, #1E2A44 1px, transparent 1px)',
              backgroundSize: '44px 44px',
              maskImage: 'radial-gradient(circle at 50% 45%, black, transparent 72%)',
              WebkitMaskImage: 'radial-gradient(circle at 50% 45%, black, transparent 72%)',
            }}
          />
          <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/25 blur-[120px]" />

          {/* Orbit rings */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="animate-spin-slow h-[560px] w-[560px] rounded-full border border-accent-soft/15" />
          </div>
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="h-[470px] w-[470px] rounded-full border border-dashed border-accent-soft/10" />
          </div>

          {/* Globe */}
          <div className="animate-float absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2">
            {artOk ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/earth.png"
                alt=""
                className="h-full w-full object-contain drop-shadow-[0_0_70px_rgba(37,99,235,0.55)]"
                onError={() => setArtOk(false)}
              />
            ) : (
              <GlobeFallback />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Wireframe network globe — used only when /earth.png is absent.
function GlobeFallback() {
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden="true">
      <defs>
        <radialGradient id="g-core" cx="38%" cy="32%">
          <stop offset="0%" stopColor="#1E3A8A" />
          <stop offset="60%" stopColor="#0E1E3C" />
          <stop offset="100%" stopColor="#060E1C" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="72" fill="url(#g-core)" stroke="#3B82F6" strokeOpacity="0.4" />
      <g fill="none" stroke="#3B82F6" strokeOpacity="0.35">
        <ellipse cx="100" cy="100" rx="72" ry="26" />
        <ellipse cx="100" cy="100" rx="72" ry="52" />
        <ellipse cx="100" cy="100" rx="26" ry="72" />
        <ellipse cx="100" cy="100" rx="52" ry="72" />
        <line x1="28" y1="100" x2="172" y2="100" />
      </g>
      <g fill="#60A5FA">
        {[
          [64, 62],
          [136, 74],
          [100, 48],
          [52, 118],
          [148, 128],
          [92, 150],
          [118, 104],
        ].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2.4" />
        ))}
      </g>
    </svg>
  );
}
