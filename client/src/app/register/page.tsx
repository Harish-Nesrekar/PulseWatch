
'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  User,
  Mail,
  LockKeyhole,
  CheckCircle2,
} from 'lucide-react';
import { authApi } from '../../lib/api';

const ECG_PATH =
  'M0 455 H180 L205 450 L225 460 L250 455 H360 L390 430 L420 485 L450 455 H600 L630 448 L650 462 L675 455 H800 L830 405 L860 510 L890 455 H1040 L1070 447 L1090 463 L1115 455 H1260 L1290 425 L1320 480 L1350 455 H1440';

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (loading) return;

    setError('');

    const normalizedEmail = email.trim().toLowerCase();

    if (password.length < 8 || password.length > 72) {
      setError('Password must contain between 8 and 72 characters.');
      return;
    }

    try {
      setLoading(true);

      const response = await authApi.register({
        name: name.trim(),
        email: normalizedEmail,
        password,
      });

      if (response.verificationRequired) {
        router.push(
          `/verify-email?email=${encodeURIComponent(normalizedEmail)}`
        );
      } else {
        setError('Unexpected response from the server.');
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to create your account. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePointerMove = (
    event: React.PointerEvent<HTMLElement>
  ) => {
    if (event.pointerType === 'touch') return;

    // The background is fixed to the viewport, so use viewport coordinates.
    event.currentTarget.style.setProperty(
      '--pulse-pointer-x',
      `${event.clientX}px`
    );

    event.currentTarget.style.setProperty(
      '--pulse-pointer-y',
      `${event.clientY}px`
    );

    event.currentTarget.classList.add('pulse-pointer-active');
  };

  const handlePointerLeave = (
    event: React.PointerEvent<HTMLElement>
  ) => {
    event.currentTarget.classList.remove('pulse-pointer-active');
  };

  return (
    <main
      className="register-page relative flex min-h-[100svh] items-center justify-center overflow-x-hidden px-4 py-4 sm:px-6"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {/* ECG background */}
      <div className="auth-ecg-bg" aria-hidden="true">
        {/* Permanently blurred ECG */}
        <svg
          className="auth-ecg-layer auth-ecg-base"
          viewBox="0 0 1440 900"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient
              id="authEcgGreenBase"
              x1="0"
              y1="0"
              x2="1"
              y2="0"
            >
              <stop offset="0%" stopColor="#16834f" />
              <stop offset="100%" stopColor="#22a66b" />
            </linearGradient>
          </defs>

          <path
            className="auth-ecg-track"
            d={ECG_PATH}
          />

          <path
            className="auth-ecg-progress"
            d={ECG_PATH}
          />

          <circle
            className="auth-ecg-marker-halo"
            r="12"
            cx="0"
            cy="0"
          >
            <animateMotion
              dur="20s"
              repeatCount="indefinite"
              calcMode="paced"
              path={ECG_PATH}
            />
          </circle>

          <circle
            className="auth-ecg-marker"
            r="5"
            cx="0"
            cy="0"
          >
            <animateMotion
              dur="20s"
              repeatCount="indefinite"
              calcMode="paced"
              path={ECG_PATH}
            />
          </circle>
        </svg>

        {/* Sharp ECG revealed only around the cursor */}
        <svg
          className="auth-ecg-layer auth-ecg-sharp"
          viewBox="0 0 1440 900"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient
              id="authEcgGreenSharp"
              x1="0"
              y1="0"
              x2="1"
              y2="0"
            >
              <stop offset="0%" stopColor="#16834f" />
              <stop offset="100%" stopColor="#22a66b" />
            </linearGradient>
          </defs>

          <path
            className="auth-ecg-track"
            d={ECG_PATH}
          />

          <path
            className="auth-ecg-progress"
            d={ECG_PATH}
          />

          <circle
            className="auth-ecg-marker-halo"
            r="12"
            cx="0"
            cy="0"
          >
            <animateMotion
              dur="20s"
              repeatCount="indefinite"
              calcMode="paced"
              path={ECG_PATH}
            />
          </circle>

          <circle
            className="auth-ecg-marker"
            r="5"
            cx="0"
            cy="0"
          >
            <animateMotion
              dur="20s"
              repeatCount="indefinite"
              calcMode="paced"
              path={ECG_PATH}
            />
          </circle>
        </svg>
      </div>

      {/* Registration content */}
      <div className="relative z-10 w-full max-w-[410px]">
        {/* Brand */}
        <Link
          href="/login"
          className="mb-4 flex items-center justify-center gap-3"
          aria-label="PulseWatch"
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
            PulseWatch
          </span>
        </Link>

        {/* Registration card */}
        <div className="register-card">
          <div className="mb-4 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-100 bg-[#edf5fd]">
              <User className="h-6 w-6 text-blue-600" />
            </div>

            <h1 className="text-[22px] font-bold tracking-tight text-slate-900">
              Create your account
            </h1>

            <p className="mt-1 text-[13px] leading-5 text-slate-500">
              Start monitoring your services in less than 2 minutes.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/90 px-4 py-3.5"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />

              <p className="text-sm leading-5 text-rose-700">
                {error}
              </p>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-5">
            {/* Full name */}
            <div>
              <label htmlFor="register-name" className="form-label">
                Full name
              </label>

              <div className="input-wrapper">
                <User className="input-icon" />

                <input
                  id="register-name"
                  type="text"
                  required
                  minLength={2}
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  autoComplete="name"
                  className="register-input"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="register-email" className="form-label">
                Email address
              </label>

              <div className="input-wrapper">
                <Mail className="input-icon" />

                <input
                  id="register-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  autoComplete="email"
                  className="register-input"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="register-password" className="form-label">
                Password
              </label>

              <div className="input-wrapper">
                <LockKeyhole className="input-icon" />

                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  maxLength={72}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  className="register-input password-input"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="password-toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              <p className="mt-2 text-[11px] text-slate-400">
                Use between 8 and 72 characters.
              </p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="register-submit"
            >
              {loading ? (
                <>
                  <span className="submit-spinner" />
                  Creating account...
                </>
              ) : (
                <>
                  Create account
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Verification note */}
          <div className="verification-note mt-5">
            <ShieldCheck className="h-4 w-4 shrink-0 text-blue-500" />

            <p>
              Email verification is required before you can access your account.
            </p>
          </div>

          {/* Login link */}
          <div className="mt-4 border-t border-slate-100 pt-4 text-center">
            <p className="text-sm text-slate-500">
              Already have an account?{' '}
              <Link
                href="/login"
                className="font-bold text-blue-600 transition hover:text-violet-600"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-3 flex items-center justify-center gap-2 text-[10px] text-slate-400">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          Secure account registration with email verification
        </div>
      </div>

      <style jsx global>{`
        /* =========================================
           ECG BACKGROUND
        ========================================= */

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
          display: block;
          width: 100%;
          height: 100%;
          overflow: visible;
        }

        /* Always blurred background */
        .auth-ecg-base {
          opacity: 0.58;
          filter: blur(5px);
          transform: scale(1.01);
        }

        /* Sharp layer, hidden until cursor enters */
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

        /* Cursor-following sharp spotlight */
        .register-page.pulse-pointer-active .auth-ecg-sharp {
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

        /* ECG red / unfollowed path */
        .auth-ecg-track {
          fill: none;
          stroke: #d66b6b;
          stroke-width: 2.2;
          stroke-linecap: round;
          stroke-linejoin: round;
          opacity: 0.72;
        }

        /* ECG green / followed path */
        .auth-ecg-progress {
          fill: none;
          stroke: url(#authEcgGreenBase);
          stroke-width: 2.8;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-dasharray: 1000 1000;
          stroke-dashoffset: 1000;
          animation: auth-ecg-draw 20s linear infinite;
          filter: drop-shadow(0 0 3px rgba(22, 131, 79, 0.25));
        }

        .auth-ecg-sharp .auth-ecg-progress {
          stroke: url(#authEcgGreenSharp);
        }

        @keyframes auth-ecg-draw {
          from {
            stroke-dashoffset: 1000;
          }

          to {
            stroke-dashoffset: 0;
          }
        }

        /* Moving marker glow */
        .auth-ecg-marker-halo {
          fill: rgba(22, 131, 79, 0.12);
          stroke: rgba(22, 131, 79, 0.2);
          stroke-width: 1;
          animation: auth-ecg-halo 1.8s ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: center;
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

        .auth-ecg-marker {
          fill: #087443;
          stroke: #f3f6fa;
          stroke-width: 2;
        }

        /* =========================================
           MOBILE / REDUCED MOTION
        ========================================= */

        @media (max-width: 640px), (hover: none), (pointer: coarse) {
          .auth-ecg-base {
            filter: blur(5px);
            opacity: 0.52;
          }

          .auth-ecg-sharp {
            display: none;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .auth-ecg-progress,
          .auth-ecg-marker,
          .auth-ecg-marker-halo {
            animation: none !important;
          }

          .auth-ecg-progress {
            stroke-dasharray: none;
            stroke-dashoffset: 0;
          }

          .auth-ecg-marker,
          .auth-ecg-marker-halo {
            display: none;
          }
        }

        /* =========================================
           PAGE
        ========================================= */

        .register-page {
          isolation: isolate;
          min-height: 100svh;
          padding-top: 16px;
          padding-bottom: 16px;
          background: #f3f6fa;
          color: #243b53;
        }

        .aurora-background {
          display: none;
        }

        /* =========================================
           BRAND
        ========================================= */

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
          stroke-dasharray: 46;
          stroke-dashoffset: 46;
          animation: brand-pulse-draw 2.4s linear infinite;
        }

        @keyframes brand-pulse-draw {
          0% {
            stroke-dashoffset: 46;
            opacity: 0.72;
          }

          58%,
          78% {
            stroke-dashoffset: 0;
            opacity: 1;
          }

          100% {
            stroke-dashoffset: -46;
            opacity: 0.72;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .brand-pulse-line__path {
            animation: none;
            stroke-dasharray: none;
            stroke-dashoffset: 0;
          }
        }

        /* =========================================
           REGISTRATION CARD
        ========================================= */

        .register-card {
          padding: 22px 24px;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          background: #ffffff;
          box-shadow: 0 8px 28px rgba(15, 23, 42, 0.06);
        }

        .form-label {
          display: block;
          margin-bottom: 8px;
          color: #42566f;
          font-size: 12px;
          font-weight: 700;
        }

        .input-wrapper {
          position: relative;
        }

        .input-icon {
          position: absolute;
          top: 50%;
          left: 13px;
          z-index: 1;
          width: 16px;
          height: 16px;
          transform: translateY(-50%);
          color: #8192a7;
          pointer-events: none;
        }

        .register-input {
          width: 100%;
          min-height: 42px;
          border: 1px solid rgba(203, 213, 225, 0.85);
          border-radius: 11px;
          background: #ffffff;
          padding: 11px 13px 11px 40px;
          color: #243b53;
          font-size: 13px;
          outline: none;
          transition:
            border-color 180ms ease,
            box-shadow 180ms ease,
            background 180ms ease;
        }

        .register-input::placeholder {
          color: #8b9aab;
        }

        .register-input:focus {
          border-color: #4c83b8;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(36, 99, 166, 0.12);
        }

        .password-input {
          padding-right: 44px;
        }

        .password-toggle {
          position: absolute;
          top: 50%;
          right: 10px;
          display: flex;
          width: 30px;
          height: 30px;
          align-items: center;
          justify-content: center;
          transform: translateY(-50%);
          border-radius: 8px;
          color: #8292a6;
          transition: all 160ms ease;
        }

        .password-toggle:hover {
          background: #edf3f8;
          color: #477eae;
        }

        .register-submit {
          display: flex;
          width: 100%;
          min-height: 43px;
          align-items: center;
          justify-content: center;
          gap: 9px;
          margin-top: 3px;
          border: 1px solid #c4dcf4;
          border-radius: 11px;
          background: #dcecff;
          padding: 12px 16px;
          color: #244766;
          font-size: 13px;
          font-weight: 700;
          box-shadow: none;
          transition: background 180ms ease;
        }

        .register-submit:hover:not(:disabled) {
          background: #c8e0fa;
          color: #244766;
          box-shadow: none;
          transform: none;
        }

        .register-submit:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        .submit-spinner {
          width: 15px;
          height: 15px;
          border: 2px solid rgba(255, 255, 255, 0.4);
          border-top-color: white;
          border-radius: 50%;
          animation: register-spin 0.7s linear infinite;
        }

        @keyframes register-spin {
          to {
            transform: rotate(360deg);
          }
        }

        .verification-note {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          border: 1px solid #dce7f0;
          border-radius: 11px;
          background: #f5f8fc;
          padding: 9px 10px;
          color: #53677f;
          font-size: 11px;
          line-height: 1.6;
        }

        /* =========================================
           RESPONSIVE
        ========================================= */

        @media (max-height: 760px) {
          .register-page {
            padding-top: 10px;
            padding-bottom: 10px;
          }

          .register-card {
            padding: 17px 22px;
          }

          .register-page .register-card form {
            gap: 12px;
          }

          .register-page .register-card .verification-note {
            margin-top: 10px;
          }

          .register-page .register-card > div:last-child {
            margin-top: 12px;
            padding-top: 12px;
          }

          .register-page .register-card .mb-4 {
            margin-bottom: 10px;
          }

          .register-page .register-card .text-center > .mb-3 {
            margin-bottom: 7px;
          }

          .register-page .register-card .text-center > p {
            line-height: 1.35;
          }
        }

        @media (max-width: 480px) and (min-height: 650px) {
          .register-page {
            padding-left: 16px;
            padding-right: 16px;
          }

          .register-card {
            padding: 20px 18px;
          }
        }

        @media (max-width: 480px) {
          .register-card {
            padding: 23px 20px;
            border-radius: 20px;
          }
        }

        @media (max-height: 560px) {
          .register-page {
            align-items: flex-start;
          }
        }

        /* =========================================
           ACCESSIBILITY
        ========================================= */

        .register-input:focus-visible,
        .register-submit:focus-visible,
        .password-toggle:focus-visible,
        .register-page a:focus-visible {
          outline: 2px solid #477eae;
          outline-offset: 3px;
        }

        @media (prefers-reduced-motion: reduce) {
          .register-input,
          .register-submit,
          .password-toggle {
            transition: none;
          }

          .register-submit:hover {
            transform: none;
          }

          .submit-spinner {
            animation-duration: 1.5s;
          }
        }
      `}</style>
    </main>
  );
}
