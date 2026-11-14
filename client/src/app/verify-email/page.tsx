
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Activity,
  Mail,
  ArrowRight,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  LockKeyhole,
  Sparkles,
} from 'lucide-react';
import { authApi } from '@/lib/api';

export default function VerifyEmailPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');

    if (emailParam) {
      setEmail(emailParam);
    } else {
      setError('Email address is missing. Please register again.');
    }
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;

    const timer = window.setTimeout(() => {
      setCountdown((current) => current - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [countdown]);

  const handleVerify = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!/^\d{6}$/.test(otp)) {
      setError('Please enter a valid 6-digit OTP.');
      return;
    }

    setLoading(true);

    try {
      const response = await authApi.verifyEmail({
        email,
        otp,
      });

      localStorage.setItem(
        'pulsewatch_user',
        JSON.stringify(response.user)
      );

      router.replace('/dashboard');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Verification failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email || resending || countdown > 0) return;

    setError('');
    setMessage('');
    setResending(true);

    try {
      const response = await authApi.resendOtp({ email });

      setMessage(response.message || 'A new OTP has been sent.');
      setCountdown(60);
      setOtp('');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to resend OTP. Please try again.'
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="verify-page relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-12 sm:px-8">
      {/* Aurora background */}
      <div className="verify-aurora" aria-hidden="true">
        <div className="verify-blob verify-blob-one" />
        <div className="verify-blob verify-blob-two" />
        <div className="verify-blob verify-blob-three" />
        <div className="verify-grid" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Brand */}
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-3"
          aria-label="PulseWatch home"
        >
          <div className="verify-brand-icon">
            <Activity className="h-5 w-5 text-white" />
          </div>

          <span className="text-2xl font-extrabold tracking-tight text-slate-900">
            PulseWatch
          </span>
        </Link>

        {/* Main card */}
        <section className="verify-card">
          {/* Decorative top */}
          <div className="verify-card-glow" aria-hidden="true" />

          <div className="relative z-10">
            {/* Icon */}
            <div className="mb-7 flex justify-center">
              <div className="verify-icon-wrapper">
                <div className="verify-icon-inner">
                  <Mail className="h-7 w-7 text-indigo-600" />
                </div>

                <span className="verify-icon-badge">
                  <ShieldCheck className="h-4 w-4 text-white" />
                </span>
              </div>
            </div>

            {/* Heading */}
            <div className="text-center">
              <div className="verify-eyebrow">
                <Sparkles className="h-3.5 w-3.5" />
                ACCOUNT SECURITY
              </div>

              <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                Verify your email
              </h1>

              <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500">
                One last step! Enter the six-digit verification code
                we sent to your email address.
              </p>
            </div>

            {/* Email display */}
            <div className="email-display mt-7">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Mail className="h-4 w-4" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Verification email
                </p>

                <p className="mt-1 break-all text-sm font-bold text-slate-800">
                  {email || 'Loading email...'}
                </p>
              </div>

              <CheckCircle2 className="h-4 w-4 shrink-0 text-indigo-400" />
            </div>

            {/* Verification form */}
            <form onSubmit={handleVerify} className="mt-7 space-y-5">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <label
                    htmlFor="verification-code"
                    className="text-xs font-bold text-slate-700"
                  >
                    Verification code
                  </label>

                  <span className="text-[10px] font-semibold text-slate-400">
                    6 digits
                  </span>
                </div>

                <input
                  id="verification-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) =>
                    setOtp(
                      e.target.value.replace(/\D/g, '').slice(0, 6)
                    )
                  }
                  placeholder="000000"
                  aria-label="Six-digit verification code"
                  aria-describedby={
                    error ? 'verify-error' : undefined
                  }
                  className="otp-input"
                />

                <div className="mt-2 flex items-center justify-between">
                  <p className="text-[10px] text-slate-400">
                    Enter the code from your inbox.
                  </p>

                  <span
                    className={`text-[10px] font-bold ${
                      otp.length === 6
                        ? 'text-emerald-600'
                        : 'text-slate-400'
                    }`}
                  >
                    {otp.length}/6
                  </span>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div
                  id="verify-error"
                  role="alert"
                  className="verify-alert verify-alert-error"
                >
                  <span className="verify-alert-dot bg-rose-500" />
                  <p>{error}</p>
                </div>
              )}

              {/* Success */}
              {message && (
                <div
                  role="status"
                  className="verify-alert verify-alert-success"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <p>{message}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || otp.length !== 6 || !email}
                className="verify-submit-button"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Verifying your email...
                  </>
                ) : (
                  <>
                    Verify email
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* Resend */}
            <div className="resend-section mt-7">
              <p className="text-xs font-semibold text-slate-500">
                Didn't receive the code?
              </p>

              <button
                type="button"
                onClick={handleResend}
                disabled={resending || countdown > 0 || !email}
                className="resend-button mt-3"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${
                    resending ? 'animate-spin' : ''
                  }`}
                />

                {resending
                  ? 'Sending verification code...'
                  : countdown > 0
                    ? `Resend available in ${countdown}s`
                    : 'Resend verification code'}
              </button>
            </div>

            {/* Footer */}
            <div className="mt-7 border-t border-slate-100 pt-6 text-center">
              <p className="text-xs text-slate-500">
                Already verified?{' '}
                <button
                  type="button"
                  onClick={() => router.push('/login')}
                  className="font-bold text-indigo-600 transition hover:text-indigo-700 hover:underline"
                >
                  Sign in
                </button>
              </p>
            </div>
          </div>
        </section>

        {/* Security note */}
        <div className="mt-6 flex items-center justify-center gap-2 text-[10px] font-medium text-slate-400">
          <LockKeyhole className="h-3.5 w-3.5" />
          Your account verification is protected by PulseWatch.
        </div>

        <p className="mt-3 text-center text-[10px] text-slate-400">
          © {new Date().getFullYear()} PulseWatch. All rights reserved.
        </p>
      </div>

      <style jsx global>{`
        .verify-page {
          isolation: isolate;
          background: #f5f6ff;
        }

        .verify-aurora {
          position: fixed;
          inset: 0;
          z-index: -1;
          overflow: hidden;
          pointer-events: none;
          background:
            radial-gradient(
              ellipse at 12% 10%,
              rgba(203, 213, 255, 0.5),
              transparent 42%
            ),
            radial-gradient(
              ellipse at 90% 15%,
              rgba(248, 215, 244, 0.42),
              transparent 40%
            ),
            linear-gradient(135deg, #f8f9ff, #f0f2ff 55%, #f8f7ff);
        }

        .verify-blob {
          position: absolute;
          width: 430px;
          height: 430px;
          border-radius: 50%;
          filter: blur(110px);
          opacity: 0.38;
          animation: verify-float 23s ease-in-out infinite alternate;
        }

        .verify-blob-one {
          top: -210px;
          left: 5%;
          background: rgba(112, 139, 255, 0.4);
        }

        .verify-blob-two {
          top: 25%;
          right: -220px;
          background: rgba(237, 148, 219, 0.34);
          animation-delay: -8s;
        }

        .verify-blob-three {
          bottom: -250px;
          left: 30%;
          background: rgba(108, 211, 230, 0.28);
          animation-delay: -14s;
        }

        .verify-grid {
          position: absolute;
          inset: 0;
          opacity: 0.12;
          background-image: radial-gradient(
            #9aa8d5 0.7px,
            transparent 0.7px
          );
          background-size: 26px 26px;
          mask-image: linear-gradient(to bottom, black, transparent 85%);
        }

        .verify-brand-icon {
          display: flex;
          width: 42px;
          height: 42px;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 255, 255, 0.5);
          border-radius: 13px;
          background: linear-gradient(135deg, #4777f5, #7962e9);
          box-shadow: 0 7px 18px rgba(71, 119, 245, 0.22);
        }

        .verify-card {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.95);
          border-radius: 25px;
          background: rgba(255, 255, 255, 0.79);
          padding: 32px;
          box-shadow:
            0 30px 80px rgba(67, 79, 144, 0.1),
            0 8px 25px rgba(67, 79, 144, 0.045),
            inset 0 1px 0 white;
          backdrop-filter: blur(28px);
          -webkit-backdrop-filter: blur(28px);
        }

        .verify-card-glow {
          position: absolute;
          top: -160px;
          left: 50%;
          width: 330px;
          height: 260px;
          transform: translateX(-50%);
          border-radius: 50%;
          background: rgba(133, 151, 255, 0.13);
          filter: blur(70px);
          pointer-events: none;
        }

        .verify-icon-wrapper {
          position: relative;
          display: flex;
          width: 76px;
          height: 76px;
          align-items: center;
          justify-content: center;
          border: 1px solid #e4e9ff;
          border-radius: 23px;
          background: linear-gradient(145deg, #f0f3ff, #f9f2ff);
          box-shadow: 0 10px 25px rgba(91, 105, 220, 0.08);
        }

        .verify-icon-inner {
          display: flex;
          width: 53px;
          height: 53px;
          align-items: center;
          justify-content: center;
          border: 1px solid white;
          border-radius: 17px;
          background: rgba(255, 255, 255, 0.8);
        }

        .verify-icon-badge {
          position: absolute;
          right: -5px;
          bottom: -5px;
          display: flex;
          width: 27px;
          height: 27px;
          align-items: center;
          justify-content: center;
          border: 3px solid white;
          border-radius: 50%;
          background: linear-gradient(135deg, #4777f5, #7962e9);
          box-shadow: 0 4px 10px rgba(71, 119, 245, 0.2);
        }

        .verify-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border: 1px solid #e8eaff;
          border-radius: 999px;
          background: rgba(243, 244, 255, 0.8);
          padding: 6px 11px;
          color: #6873c6;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.1em;
        }

        .email-display {
          display: flex;
          align-items: center;
          gap: 12px;
          border: 1px solid #e9edff;
          border-radius: 14px;
          background: rgba(247, 248, 255, 0.85);
          padding: 13px;
        }

        .otp-input {
          display: block;
          width: 100%;
          min-height: 65px;
          border: 1px solid #e2e7f3;
          border-radius: 13px;
          outline: none;
          background: rgba(255, 255, 255, 0.85);
          padding: 12px 15px;
          color: #29345c;
          text-align: center;
          font-size: 25px;
          font-weight: 800;
          letter-spacing: 0.55em;
          font-variant-numeric: tabular-nums;
          box-shadow: inset 0 2px 5px rgba(64, 77, 130, 0.025);
          transition:
            border-color 180ms ease,
            box-shadow 180ms ease,
            background 180ms ease;
        }

        .otp-input::placeholder {
          color: #cbd2e4;
        }

        .otp-input:focus {
          border-color: #8296f6;
          background: white;
          box-shadow:
            0 0 0 4px rgba(99, 119, 237, 0.1),
            0 5px 15px rgba(64, 77, 130, 0.04);
        }

        .verify-alert {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          border: 1px solid transparent;
          border-radius: 11px;
          padding: 11px 12px;
          font-size: 12px;
          line-height: 1.6;
        }

        .verify-alert-error {
          border-color: #fee2e2;
          background: #fff5f5;
          color: #be4545;
        }

        .verify-alert-success {
          border-color: #d1fae5;
          background: #f0fdf7;
          color: #16815b;
        }

        .verify-alert-dot {
          width: 7px;
          height: 7px;
          flex-shrink: 0;
          margin-top: 5px;
          border-radius: 50%;
        }

        .verify-submit-button {
          display: flex;
          width: 100%;
          min-height: 49px;
          align-items: center;
          justify-content: center;
          gap: 9px;
          border: 1px solid transparent;
          border-radius: 12px;
          background: linear-gradient(110deg, #4777f5, #665ee8);
          color: white;
          font-size: 13px;
          font-weight: 800;
          box-shadow: 0 8px 20px rgba(71, 119, 245, 0.2);
          transition: all 180ms ease;
        }

        .verify-submit-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 12px 25px rgba(71, 119, 245, 0.27);
        }

        .verify-submit-button:disabled {
          cursor: not-allowed;
          opacity: 0.48;
          box-shadow: none;
        }

        .resend-section {
          border: 1px solid #edf0fa;
          border-radius: 13px;
          background: rgba(248, 249, 255, 0.7);
          padding: 16px;
          text-align: center;
        }

        .resend-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #5d6fd7;
          font-size: 12px;
          font-weight: 800;
          transition: color 160ms ease;
        }

        .resend-button:hover:not(:disabled) {
          color: #4756bd;
        }

        .resend-button:disabled {
          cursor: not-allowed;
          color: #aab2c5;
        }

        @keyframes verify-float {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          50% {
            transform: translate3d(25px, 30px, 0) scale(1.06);
          }
          100% {
            transform: translate3d(-20px, 40px, 0) scale(0.96);
          }
        }

        @media (max-width: 480px) {
          .verify-card {
            padding: 25px 20px;
            border-radius: 21px;
          }

          .otp-input {
            min-height: 59px;
            font-size: 22px;
            letter-spacing: 0.45em;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .verify-blob {
            animation: none;
          }

          .verify-submit-button,
          .resend-button,
          .otp-input {
            transition: none;
          }

          .verify-submit-button:hover {
            transform: none;
          }
        }
      `}</style>
    </main>
  );
}
