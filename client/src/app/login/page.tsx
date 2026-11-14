
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Activity,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
  LockKeyhole,
  Mail,
  AlertCircle,
  Loader2,
} from 'lucide-react';

import { authApi } from '@/lib/api';

const ECG_PATH =
  'M0 455 H180 L205 450 L225 460 L250 455 H360 L390 430 L420 485 L450 455 H600 L630 448 L650 462 L675 455 H800 L830 405 L860 510 L890 455 H1040 L1070 447 L1090 463 L1115 455 H1260 L1290 425 L1320 480 L1350 455 H1440';

function getSafeNextPath() {
  const next = new URLSearchParams(window.location.search).get('next');

  if (
    !next ||
    !next.startsWith('/') ||
    next.startsWith('//') ||
    next.includes('\\')
  ) {
    return '/dashboard';
  }

  const destination = new URL(next, window.location.origin);

  if (
    destination.pathname === '/' ||
    [
      '/login',
      '/register',
      '/verify-email',
      '/forgot-password',
      '/reset-password',
    ].includes(destination.pathname) ||
    destination.pathname.startsWith('/status/')
  ) {
    return '/dashboard';
  }

  return destination.origin === window.location.origin
    ? `${destination.pathname}${destination.search}${destination.hash}`
    : '/dashboard';
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();

    try {
      const response = await authApi.login({
        email: normalizedEmail,
        password,
      });

      localStorage.setItem(
        'pulsewatch_user',
        JSON.stringify(response.user),
      );

      router.replace(getSafeNextPath());
    } catch (err) {
      const loginError = err as Error & { code?: string };

      if (loginError.code === 'EMAIL_NOT_VERIFIED') {
        router.push(
          `/verify-email?email=${encodeURIComponent(normalizedEmail)}`,
        );
        return;
      }

      setError(
        loginError.message || 'Login failed. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'touch') return;

    event.currentTarget.style.setProperty('--pulse-pointer-x', `${event.clientX}px`);
    event.currentTarget.style.setProperty('--pulse-pointer-y', `${event.clientY}px`);
    event.currentTarget.classList.add('pulse-pointer-active');
  };

  const handlePointerLeave = (event: React.PointerEvent<HTMLElement>) => {
    event.currentTarget.classList.remove('pulse-pointer-active');
  };

  return (
    <main
      className="auth-page relative flex min-h-[100svh] items-center justify-center overflow-x-hidden px-4 py-4 sm:px-6"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {/* Continuously animated ECG background */}
      <div className="auth-ecg-bg" aria-hidden="true">
        <svg className="auth-ecg-layer auth-ecg-base" viewBox="0 0 1440 900" preserveAspectRatio="none">
          <path className="auth-ecg-track" d={ECG_PATH} />
          <path className="auth-ecg-progress" pathLength="1" d={ECG_PATH} />
          <circle className="auth-ecg-marker-halo" r="12">
            <animateMotion dur="20s" repeatCount="indefinite" calcMode="paced" path={ECG_PATH} />
          </circle>
          <circle className="auth-ecg-marker" r="5">
            <animateMotion dur="20s" repeatCount="indefinite" calcMode="paced" path={ECG_PATH} />
          </circle>
        </svg>

        <svg className="auth-ecg-layer auth-ecg-sharp" viewBox="0 0 1440 900" preserveAspectRatio="none">
          <path className="auth-ecg-track" d={ECG_PATH} />
          <path className="auth-ecg-progress" pathLength="1" d={ECG_PATH} />
          <circle className="auth-ecg-marker-halo" r="12">
            <animateMotion dur="20s" repeatCount="indefinite" calcMode="paced" path={ECG_PATH} />
          </circle>
          <circle className="auth-ecg-marker" r="5">
            <animateMotion dur="20s" repeatCount="indefinite" calcMode="paced" path={ECG_PATH} />
          </circle>
        </svg>
      </div>

<div className="relative z-10 w-full max-w-[410px]">
        {/* Brand */}
        <Link
          href="/"
          className="brand-link mb-4 flex items-center justify-center gap-3"
        >
          <div className="brand-icon" aria-hidden="true">
            <svg
              className="brand-pulse-line"
              viewBox="0 0 32 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                className="brand-pulse-line__path"
                d="M1 12h7l3.2-8 5.2 16 4.1-11 2.3 3H31"
                stroke="#16834f"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <span className="text-xl font-extrabold tracking-tight text-slate-900">
            Pulse<span className="brand-accent">Watch</span>
          </span>
        </Link>

        {/* Login card */}
        <div className="auth-card overflow-hidden rounded-[26px]">
          {/* Decorative top accent */}
          <div className="card-top-accent" />

          <div className="px-6 py-5 sm:px-7 sm:py-6">
            {/* Heading */}
            <div className="mb-5">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl border border-blue-100 bg-[#edf5fd] text-blue-600 shadow-sm">
                <Sparkles className="h-5 w-5" />
              </div>

              <h1 className="text-[23px] font-bold tracking-tight text-slate-900">
                Welcome back
              </h1>

              <p className="mt-1 text-[13px] leading-5 text-slate-500">
                Sign in to access your organization dashboard and monitor
                your services.
              </p>
            </div>

            {/* Login form */}
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-xs font-bold text-slate-700"
                >
                  Email address
                </label>

                <div className="auth-input-wrapper">
                  <Mail className="auth-input-icon h-4 w-4" />

                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    className="auth-input"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label
                    htmlFor="password"
                    className="block text-xs font-bold text-slate-700"
                  >
                    Password
                  </label>

                  <Link
                    href="/forgot-password"
                    className="text-xs font-semibold text-blue-600 transition hover:text-violet-600"
                  >
                    Forgot password?
                  </Link>
                </div>

                <div className="auth-input-wrapper">
                  <LockKeyhole className="auth-input-icon h-4 w-4" />

                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="auth-input password-input"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={
                      showPassword ? 'Hide password' : 'Show password'
                    }
                    aria-pressed={showPassword}
                    className="password-toggle"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/90 px-3.5 py-3 text-sm text-rose-700"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

                  <p className="leading-5">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="login-button group flex w-full items-center justify-center gap-2.5 rounded-xl px-4 py-3 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    Sign in to PulseWatch
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-100" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Secure access
              </span>
              <div className="h-px flex-1 bg-slate-100" />
            </div>

            {/* Security note */}
            <div className="security-note flex items-center gap-3 rounded-xl px-3.5 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <ShieldCheck className="h-4.5 w-4.5" />
              </div>

              <div>
                <p className="text-xs font-bold text-slate-700">
                  Secure authentication
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Your account access is protected.
                </p>
              </div>
            </div>
          </div>

          {/* Register footer */}
          <div className="card-footer px-6 py-3.5 text-center sm:px-7">
            <p className="text-xs text-slate-500">
              Don&apos;t have an account?{' '}
              <Link
                href="/register"
                className="font-bold text-blue-600 transition hover:text-violet-600"
              >
                Create an account
              </Link>
            </p>
          </div>
        </div>

        {/* Bottom note */}
        <p className="mt-3 text-center text-[10px] text-slate-400">
          © {new Date().getFullYear()} PulseWatch. All rights reserved.
        </p>
      </div>

      <style jsx global>{`
        .auth-page {
          background: #f3f6fa;
          color: #243b53;
          isolation: isolate;
        }
        .aurora-background { display: none; }

        .auth-ecg-bg {
          position: fixed;
          z-index: 0;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
        }

        .auth-ecg-layer {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          overflow: visible;
        }

        .auth-ecg-base {
          opacity: 0.52;
          filter: blur(5px);
          transform: scale(1.01);
        }

        .auth-ecg-sharp {
          opacity: 1;
          filter: none;
          -webkit-mask-image: radial-gradient(circle 190px at -1000px -1000px, #000 0%, #000 55%, rgba(0,0,0,.82) 72%, rgba(0,0,0,.28) 88%, transparent 100%);
          mask-image: radial-gradient(circle 190px at -1000px -1000px, #000 0%, #000 55%, rgba(0,0,0,.82) 72%, rgba(0,0,0,.28) 88%, transparent 100%);
          -webkit-mask-repeat: no-repeat;
          mask-repeat: no-repeat;
        }

        .auth-page.pulse-pointer-active .auth-ecg-sharp {
          -webkit-mask-image: radial-gradient(circle 190px at var(--pulse-pointer-x) var(--pulse-pointer-y), #000 0%, #000 55%, rgba(0,0,0,.82) 72%, rgba(0,0,0,.28) 88%, transparent 100%);
          mask-image: radial-gradient(circle 190px at var(--pulse-pointer-x) var(--pulse-pointer-y), #000 0%, #000 55%, rgba(0,0,0,.82) 72%, rgba(0,0,0,.28) 88%, transparent 100%);
        }

        .auth-ecg-track {
          fill: none;
          stroke: #d66b6b;
          stroke-width: 2.2;
          stroke-linecap: round;
          stroke-linejoin: round;
          opacity: .72;
        }

        .auth-ecg-progress {
          fill: none;
          stroke: #16834f;
          stroke-width: 2.8;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-dasharray: 1 1;
          stroke-dashoffset: 1;
          animation: auth-ecg-loop 20s linear infinite;
          filter: drop-shadow(0 0 3px rgba(22,131,79,.25));
        }

        @keyframes auth-ecg-loop {
          from { stroke-dashoffset: 1; }
          to { stroke-dashoffset: 0; }
        }

        .auth-ecg-marker-halo {
          fill: rgba(22,131,79,.13);
          stroke: rgba(22,131,79,.22);
          stroke-width: 1;
          animation: auth-ecg-halo 1.8s ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }

        .auth-ecg-marker {
          fill: #087443;
          stroke: #f3f6fa;
          stroke-width: 2;
        }

        @keyframes auth-ecg-halo {
          0%, 100% { opacity: .48; transform: scale(.82); }
          50% { opacity: 1; transform: scale(1.18); }
        }

        @media (max-width: 640px), (hover: none), (pointer: coarse) {
          .auth-ecg-base { filter: blur(5px); opacity: .48; }
          .auth-ecg-sharp { display: none; }
        }

        @media (prefers-reduced-motion: reduce) {
          .auth-ecg-progress,
          .auth-ecg-marker,
          .auth-ecg-marker-halo {
            animation: none !important;
          }
          .auth-ecg-progress {
            stroke-dasharray: 1 0;
            stroke-dashoffset: 0;
          }
          .auth-ecg-marker,
          .auth-ecg-marker-halo { display: none; }
        }


        .auth-page {
          background: #f3f6fa;
          color: #243b53;
        }


        .brand-link {
          width: fit-content;
          margin-right: auto;
          margin-left: auto;
          transition: opacity 180ms ease;
        }

        .brand-link:hover {
          opacity: 0.85;
        }

        .brand-icon {
          display: flex;
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          align-items: center;
          justify-content: center;
          border: 1px solid #d8eee0;
          border-radius: 13px;
          background: #eff8f2;
          color: #16834f;
          box-shadow: none;
        }


        .brand-accent {
          color: #16834f;
        }

        .brand-pulse-line {
          display: block;
          width: 25px;
          height: 20px;
          overflow: visible;
        }

        .brand-pulse-line__path {
          stroke: #16834f;
          stroke-dasharray: 46;
          stroke-dashoffset: 46;
          animation: brand-pulse-draw 2.4s linear infinite;
        }

        @keyframes brand-pulse-draw {
          0% {
            stroke-dashoffset: 46;
            opacity: .72;
          }
          58%, 78% {
            stroke-dashoffset: 0;
            opacity: 1;
          }
          100% {
            stroke-dashoffset: -46;
            opacity: .72;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .brand-pulse-line__path {
            animation: none;
            stroke-dasharray: none;
            stroke-dashoffset: 0;
          }
        }

        .auth-card {
          border: 1px solid rgba(255, 255, 255, 0.88);
          background: rgba(255, 255, 255, 0.76);
          box-shadow:
            0 24px 70px rgba(64, 77, 130, 0.09),
            0 5px 16px rgba(64, 77, 130, 0.035),
            inset 0 1px 0 rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(28px);
          -webkit-backdrop-filter: blur(28px);
        }

        .card-top-accent { height: 3px; background: #8db8df; }

        .auth-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .auth-input-icon {
          position: absolute;
          left: 13px;
          z-index: 1;
          color: #8292a6;
          pointer-events: none;
        }

        .auth-input {
          width: 100%;
          height: 46px;
          border: 1px solid rgba(203, 213, 225, 0.85);
          border-radius: 11px;
          background: rgba(255, 255, 255, 0.82);
          padding: 0 13px 0 40px;
          color: #243b53;
          font-size: 13px;
          outline: none;
          transition:
            border-color 180ms ease,
            box-shadow 180ms ease,
            background 180ms ease;
        }

        .auth-input::placeholder {
          color: #8b9aab;
        }

        .auth-input:hover {
          border-color: #b7c5e7;
        }

        .auth-input:focus {
          border-color: #4c83b8;
          background: white;
          box-shadow: 0 0 0 3px rgba(36, 99, 166, 0.12);
        }

        .password-input {
          padding-right: 44px;
        }

        .password-toggle {
          position: absolute;
          right: 12px;
          display: flex;
          height: 30px;
          width: 30px;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          color: #8292a6;
          transition:
            color 160ms ease,
            background 160ms ease;
        }

        .password-toggle:hover {
          color: #477eae;
          background: #edf3f8;
        }

        .login-button { min-height: 43px; background: #dcecff; color: #244766; box-shadow: none; border: 1px solid #c4dcf4; }

        .login-button:hover:not(:disabled) { background: #c8e0fa; color: #244766; box-shadow: none; transform: none; }

        .login-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .security-note {
          border: 1px solid rgba(226, 232, 240, 0.75);
          background: rgba(248, 250, 252, 0.72);
        }

        .card-footer {
          border-top: 1px solid rgba(226, 232, 240, 0.75);
          background: rgba(248, 250, 252, 0.42);
        }


        .auth-page {
          min-height: 100svh;
          padding-top: 16px;
          padding-bottom: 16px;
        }

        .auth-card {
          border: 1px solid #e2e8f0;
          background: #ffffff;
          box-shadow: 0 8px 28px rgba(15, 23, 42, 0.06);
          backdrop-filter: none;
          -webkit-backdrop-filter: none;
        }

        .card-top-accent { height: 3px; background: #8db8df; }

        .auth-input {
          height: 42px;
          background: #ffffff;
        }

        .login-button { min-height: 43px; background: #dcecff; color: #244766; box-shadow: none; border: 1px solid #c4dcf4; }

        .login-button:hover:not(:disabled) { background: #c8e0fa; color: #244766; box-shadow: none; transform: none; }

        .security-note,
        .card-footer { background: #f8fafc; }

        @media (max-height: 760px) {
          .auth-page { padding-top: 10px; padding-bottom: 10px; }
          .auth-page .auth-card > div:nth-child(2) { padding-top: 17px; padding-bottom: 17px; }
          .auth-page .auth-card form { gap: 12px; }
          .auth-page .auth-card .mb-5 { margin-bottom: 9px; }
          .auth-page .auth-card .my-4 { margin-top: 11px; margin-bottom: 11px; }
          .auth-page .auth-card .security-note { padding-top: 8px; padding-bottom: 8px; }
          .auth-page .auth-card .card-footer { padding-top: 10px; padding-bottom: 10px; }
        }

        @media (max-width: 480px) {
          .auth-card {
            border-radius: 21px;
          }
        }

        .auth-input:focus-visible,
        .login-button:focus-visible,
        .password-toggle:focus-visible,
        .auth-page a:focus-visible {
          outline: 2px solid #477eae;
          outline-offset: 3px;
        }

        @media (max-height: 560px) {
          .auth-page { align-items: flex-start; }
        }

        @media (prefers-reduced-motion: reduce) {

          .login-button,
          .auth-input,
          .password-toggle {
            transition: none;
          }

          .login-button:hover {
            transform: none;
          }
        }
      `}</style>
    </main>
  );
}
