'use client';

import { useState, type FormEvent, type PointerEvent } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  Mail,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Loader2,
  Sparkles,
} from 'lucide-react';

import { authApi } from '@/lib/api';

const ECG_PATH =
  'M0 455 H180 L205 450 L225 460 L250 455 H360 L390 430 L420 485 L450 455 H600 L630 448 L650 462 L675 455 H800 L830 405 L860 510 L890 455 H1040 L1070 447 L1090 463 L1115 455 H1260 L1290 425 L1320 480 L1350 455 H1440';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setMessage('');

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError('Please enter your email address.');
      return;
    }

    try {
      setLoading(true);
      const response = await authApi.forgotPassword({
        email: normalizedEmail,
      });

      setSubmittedEmail(normalizedEmail);
      setMessage(
        response.message ||
          'If an eligible account exists for this email, a password reset code will be sent.',
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to process your request. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'touch') return;

    event.currentTarget.style.setProperty(
      '--pulse-pointer-x',
      `${event.clientX}px`,
    );
    event.currentTarget.style.setProperty(
      '--pulse-pointer-y',
      `${event.clientY}px`,
    );
    event.currentTarget.classList.add('pulse-pointer-active');
  };

  const handlePointerLeave = (event: PointerEvent<HTMLElement>) => {
    event.currentTarget.classList.remove('pulse-pointer-active');
  };

  return (
    <main
      className="auth-page relative flex min-h-[100svh] items-center justify-center overflow-x-hidden px-4 py-4 sm:px-6"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {/* ECG background — decorative only */}
      <div className="auth-ecg-bg" aria-hidden="true">
        <svg
          className="auth-ecg-layer auth-ecg-base"
          viewBox="0 0 1440 900"
          preserveAspectRatio="none"
        >
          <path className="auth-ecg-track" d={ECG_PATH} />
          <path className="auth-ecg-progress" pathLength="1" d={ECG_PATH} />
          <circle className="auth-ecg-marker-halo" r="12">
            <animateMotion
              dur="20s"
              repeatCount="indefinite"
              calcMode="paced"
              path={ECG_PATH}
            />
          </circle>
          <circle className="auth-ecg-marker" r="5">
            <animateMotion
              dur="20s"
              repeatCount="indefinite"
              calcMode="paced"
              path={ECG_PATH}
            />
          </circle>
        </svg>

        <svg
          className="auth-ecg-layer auth-ecg-sharp"
          viewBox="0 0 1440 900"
          preserveAspectRatio="none"
        >
          <path className="auth-ecg-track" d={ECG_PATH} />
          <path className="auth-ecg-progress" pathLength="1" d={ECG_PATH} />
          <circle className="auth-ecg-marker-halo" r="12">
            <animateMotion
              dur="20s"
              repeatCount="indefinite"
              calcMode="paced"
              path={ECG_PATH}
            />
          </circle>
          <circle className="auth-ecg-marker" r="5">
            <animateMotion
              dur="20s"
              repeatCount="indefinite"
              calcMode="paced"
              path={ECG_PATH}
            />
          </circle>
        </svg>
      </div>

      <div className="relative z-10 w-full max-w-[410px]">
        {/* Brand */}
        <Link
          href="/"
          className="brand-link mb-4 flex items-center justify-center gap-3"
          aria-label="PulseWatch home"
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

        {/* Recovery card */}
        <div className="auth-card overflow-hidden rounded-[26px]">
          <div className="card-top-accent" />

          <div className="px-6 py-5 sm:px-7 sm:py-6">
            {/* Heading */}
            <div className="mb-5">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl border border-blue-100 bg-[#edf5fd] text-blue-600 shadow-sm">
                <Sparkles className="h-5 w-5" />
              </div>

              <h1 className="text-[23px] font-bold tracking-tight text-slate-900">
                Reset your password
              </h1>

              <p className="mt-1 text-[13px] leading-5 text-slate-500">
                Enter the email address linked to your PulseWatch account. We&apos;ll
                send you a code to securely reset your password.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div
                role="alert"
                className="mb-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/90 px-3.5 py-3 text-sm text-rose-700"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="leading-5">{error}</p>
              </div>
            )}

            {/* Success */}
            {message && (
              <div
                role="status"
                className="mb-4 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/90 px-3.5 py-3 text-sm text-emerald-800"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="leading-5">{message}</p>
              </div>
            )}

            {/* Recovery form */}
            {!message && (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="forgot-email"
                    className="mb-2 block text-xs font-bold text-slate-700"
                  >
                    Email address
                  </label>

                  <div className="auth-input-wrapper">
                    <Mail className="auth-input-icon h-4 w-4" />
                    <input
                      id="forgot-email"
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

                <button
                  type="submit"
                  disabled={loading}
                  className="login-button group flex w-full items-center justify-center gap-2.5 rounded-xl px-4 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending reset code...
                    </>
                  ) : (
                    <>
                      Send reset code
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Continue to reset */}
            {message && (
              <Link
                href={`/reset-password?email=${encodeURIComponent(submittedEmail)}`}
                className="login-button group mt-2 flex w-full items-center justify-center gap-2.5 rounded-xl px-4 py-3 text-sm font-bold transition"
              >
                Continue to reset password
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            )}

            {/* Security note */}
            <div className="security-note mt-5 flex items-center gap-3 rounded-xl px-3.5 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <ShieldCheck className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700">
                  Secure account recovery
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Your recovery request is handled securely.
                </p>
              </div>
            </div>
          </div>

          {/* Login footer */}
          <div className="card-footer px-6 py-3.5 text-center sm:px-7">
            <p className="text-xs text-slate-500">
              Remember your password?{' '}
              <Link
                href="/login"
                className="font-bold text-blue-600 transition hover:text-violet-600"
              >
                Back to sign in
              </Link>
            </p>
          </div>
        </div>

        <p className="mt-3 text-center text-[10px] text-slate-400">
          © {new Date().getFullYear()} PulseWatch. All rights reserved.
        </p>
      </div>

      <style jsx global>{`
        .auth-page {
          background: #f3f6fa;
          color: #243b53;
          isolation: isolate;
          min-height: 100svh;
          padding-top: 16px;
          padding-bottom: 16px;
        }

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
          -webkit-mask-image: radial-gradient(
            circle 190px at -1000px -1000px,
            #000 0%,
            #000 55%,
            rgba(0, 0, 0, 0.82) 72%,
            rgba(0, 0, 0, 0.28) 88%,
            transparent 100%
          );
          mask-image: radial-gradient(
            circle 190px at -1000px -1000px,
            #000 0%,
            #000 55%,
            rgba(0, 0, 0, 0.82) 72%,
            rgba(0, 0, 0, 0.28) 88%,
            transparent 100%
          );
          -webkit-mask-repeat: no-repeat;
          mask-repeat: no-repeat;
        }

        .auth-page.pulse-pointer-active .auth-ecg-sharp {
          -webkit-mask-image: radial-gradient(
            circle 190px at var(--pulse-pointer-x) var(--pulse-pointer-y),
            #000 0%,
            #000 55%,
            rgba(0, 0, 0, 0.82) 72%,
            rgba(0, 0, 0, 0.28) 88%,
            transparent 100%
          );
          mask-image: radial-gradient(
            circle 190px at var(--pulse-pointer-x) var(--pulse-pointer-y),
            #000 0%,
            #000 55%,
            rgba(0, 0, 0, 0.82) 72%,
            rgba(0, 0, 0, 0.28) 88%,
            transparent 100%
          );
        }

        .auth-ecg-track {
          fill: none;
          stroke: #d66b6b;
          stroke-width: 2.2;
          stroke-linecap: round;
          stroke-linejoin: round;
          opacity: 0.72;
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
          filter: drop-shadow(0 0 3px rgba(22, 131, 79, 0.25));
        }

        @keyframes auth-ecg-loop {
          from {
            stroke-dashoffset: 1;
          }
          to {
            stroke-dashoffset: 0;
          }
        }

        .auth-ecg-marker-halo {
          fill: rgba(22, 131, 79, 0.13);
          stroke: rgba(22, 131, 79, 0.22);
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
          0%,
          100% {
            opacity: 0.48;
            transform: scale(0.82);
          }
          50% {
            opacity: 1;
            transform: scale(1.18);
          }
        }

        @media (max-width: 640px), (hover: none), (pointer: coarse) {
          .auth-ecg-base {
            filter: blur(5px);
            opacity: 0.48;
          }
          .auth-ecg-sharp {
            display: none;
          }
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

        .brand-pulse-line {
          display: block;
          width: 25px;
          height: 20px;
          overflow: visible;
        }

        .brand-pulse-line__path {
          stroke: #16834f;
          stroke-dasharray: none;
          stroke-dashoffset: 0;
          animation: none;
        }

        .brand-accent {
          color: #16834f;
        }

        .auth-card {
          border: 1px solid #e2e8f0;
          background: #ffffff;
          box-shadow: 0 8px 28px rgba(15, 23, 42, 0.06);
          backdrop-filter: none;
          -webkit-backdrop-filter: none;
        }

        .card-top-accent {
          height: 3px;
          background: #8db8df;
        }

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
          height: 42px;
          border: 1px solid rgba(203, 213, 225, 0.85);
          border-radius: 11px;
          background: #ffffff;
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
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(36, 99, 166, 0.12);
        }

        .login-button {
          min-height: 43px;
          border: 1px solid #c4dcf4;
          background: #dcecff;
          color: #244766;
          box-shadow: none;
        }

        .login-button:hover:not(:disabled) {
          transform: none;
          background: #c8e0fa;
          color: #244766;
          box-shadow: none;
        }

        .login-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .security-note {
          border: 1px solid rgba(226, 232, 240, 0.75);
          background: #f8fafc;
        }

        .card-footer {
          border-top: 1px solid rgba(226, 232, 240, 0.75);
          background: #f8fafc;
        }

        @media (max-height: 760px) {
          .auth-page {
            padding-top: 10px;
            padding-bottom: 10px;
          }
          .auth-card > div:nth-child(2) {
            padding-top: 17px;
            padding-bottom: 17px;
          }
        }

        @media (max-width: 480px) {
          .auth-card {
            border-radius: 21px;
          }
        }

        .auth-input:focus-visible,
        .login-button:focus-visible,
        .auth-page a:focus-visible {
          outline: 2px solid #477eae;
          outline-offset: 3px;
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
          .auth-ecg-marker-halo {
            display: none;
          }

          .login-button,
          .auth-input,
          .brand-link {
            transition: none;
          }
        }
      `}</style>
    </main>
  );
}
