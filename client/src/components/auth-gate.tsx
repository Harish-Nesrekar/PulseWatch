
'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  Activity,
  AlertCircle,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { api, type AuthUser } from '@/lib/api';

type AuthState = 'checking' | 'authenticated' | 'error';

const publicPaths = new Set([
  '/',
  '/login',
  '/register',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
]);

function isPublicPath(pathname: string) {
  return (
    publicPaths.has(pathname) ||
    /^\/status\/[^/]+\/?$/.test(pathname)
  );
}

export function AuthGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() || '/';

  const [state, setState] = useState<AuthState>('checking');
  const [checkedPath, setCheckedPath] = useState('');
  const [retry, setRetry] = useState(0);

  const verifySession = useCallback(async () => {
    if (isPublicPath(pathname)) {
      setCheckedPath(pathname);
      return;
    }

    setState('checking');
    setCheckedPath('');

    try {
      await api<{ user: AuthUser }>('/auth/me');

      setCheckedPath(pathname);
      setState('authenticated');
    } catch {
      setState('error');
    }
  }, [pathname, retry]);

  useEffect(() => {
    void verifySession();
  }, [verifySession]);

  // Public pages do not require an authenticated session.
  if (isPublicPath(pathname)) {
    return <>{children}</>;
  }

  // Render protected content only after its session is verified.
  if (state === 'authenticated' && checkedPath === pathname) {
    return <>{children}</>;
  }

  if (state === 'error') {
    return (
      <main className="auth-gate min-h-screen flex items-center justify-center px-5 py-10">
        <div className="auth-gate-card w-full max-w-md rounded-3xl border border-white/70 bg-white/75 p-8 text-center shadow-2xl shadow-indigo-900/10 backdrop-blur-2xl sm:p-10">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50 text-rose-500 shadow-sm">
            <AlertCircle size={30} strokeWidth={1.8} />
          </div>

          <div className="mb-2 flex items-center justify-center gap-2">
            <ShieldCheck size={16} className="text-indigo-500" />
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
              Session verification
            </span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Unable to verify your session
          </h1>

          <p
            role="alert"
            className="mt-3 text-sm leading-6 text-slate-600"
          >
            Your session could not be verified. Check your internet
            connection and try again.
          </p>

          <button
            type="button"
            onClick={() => setRetry(value => value + 1)}
            className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-indigo-600/30 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"
          >
            <RefreshCw size={16} />
            Try again
          </button>

          <p className="mt-5 text-xs text-slate-400">
            PulseWatch security · Your protected session stays private
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      aria-label="Verifying session"
      aria-live="polite"
      className="auth-gate flex min-h-screen items-center justify-center px-5 py-10"
    >
      <div className="auth-gate-card w-full max-w-sm rounded-3xl border border-white/70 bg-white/75 px-8 py-10 text-center shadow-2xl shadow-indigo-900/10 backdrop-blur-2xl">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-600 shadow-sm">
          <Activity size={30} strokeWidth={1.8} />
        </div>

        <div className="mb-2 flex items-center justify-center gap-2">
          <ShieldCheck size={15} className="text-indigo-500" />
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
            PulseWatch Security
          </span>
        </div>

        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Verifying your session
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Securely checking your authentication before loading your
          workspace.
        </p>

        <div className="mt-7 flex items-center justify-center gap-2 text-sm font-medium text-indigo-600">
          <Loader2 size={17} className="animate-spin" />
          Please wait...
        </div>

        <div className="mt-7 h-1.5 overflow-hidden rounded-full bg-indigo-50">
          <div className="auth-gate-progress h-full w-1/2 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-sky-400" />
        </div>
      </div>
    </main>
  );
}
