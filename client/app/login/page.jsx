'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { Zap } from 'lucide-react';
import { api, setSession, getToken } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    if (getToken()) {
      router.replace('/dashboard');
    }
  }, [router]);

  async function handleGoogle(credential) {
    setError('');
    try {
      const { token, user } = await api.google(credential);
      setSession(token, user);
      setUser(user);
      router.replace('/dashboard');
    } catch (err) {
      // 403 = email not in the employees table; other codes = auth/config errors.
      setError(err.message || 'Sign-in failed');
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
          Sign in with your Google account. Access is restricted to registered employees.
        </p>
      </div>

      {/* Right sign-in panel */}
      <div className="flex items-center justify-center p-6 lg:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-6">
            <h1 className="text-lg font-semibold text-white">Sign in</h1>
            <p className="text-sm text-slate-500">
              Use your registered Google account to continue.
            </p>
          </div>

          {error ? (
            <div className="mb-4 rounded-lg border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad">
              {error}
            </div>
          ) : null}

          {GOOGLE_CLIENT_ID ? (
            <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={(cred) => handleGoogle(cred.credential)}
                  onError={() => setError('Google sign-in was cancelled or failed.')}
                  theme="filled_black"
                  shape="pill"
                  size="large"
                  text="signin_with"
                />
              </div>
            </GoogleOAuthProvider>
          ) : (
            <div className="rounded-lg border border-line bg-ink-800 px-3 py-2 text-sm text-slate-400">
              Google sign-in is not configured. Set{' '}
              <code className="text-slate-300">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> in{' '}
              <code className="text-slate-300">client/.env.local</code>.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
