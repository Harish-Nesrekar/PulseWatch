
'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Activity,
  ArrowRight,
  LockKeyhole,
  AlertCircle,
  CheckCircle2,
  Mail,
  ShieldCheck,
  Eye,
  EyeOff,
  KeyRound,
} from 'lucide-react';
import { authApi } from '@/lib/api';

export default function ResetPasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');

    if (emailParam) {
      setEmail(emailParam.trim().toLowerCase());
    } else {
      setError('Email address is missing. Please request a new reset code.');
    }
  }, []);

  const handleReset = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (loading) return;

    setError('');
    setMessage('');

    if (!email) {
      setError('Email address is missing. Please request a new reset code.');
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      setError('Please enter a valid 6-digit OTP.');
      return;
    }

    if (password.length < 8 || password.length > 72) {
      setError('Password must contain between 8 and 72 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);

      const response = await authApi.resetPassword({
        email,
        otp,
        newPassword: password,
      });

      setSuccess(true);
      setMessage(
        response.message || 'Your password has been reset successfully.'
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to reset your password. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="reset-page relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10 sm:px-6">
      {/* Aurora background */}
      <div className="aurora-background" aria-hidden="true">
        <div className="aurora-blob aurora-one" />
        <div className="aurora-blob aurora-two" />
        <div className="aurora-blob aurora-three" />
        <div className="aurora-grid" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Brand */}
        <Link
          href="/login"
          className="mb-7 flex items-center justify-center gap-3"
          aria-label="PulseWatch"
        >
          <div className="brand-icon">
            <Activity className="h-5 w-5 text-white" />
          </div>

          <span className="text-xl font-extrabold tracking-tight text-slate-900">
            PulseWatch
          </span>
        </Link>

        {/* Reset password card */}
        <div className="reset-card">
          {/* Heading */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-violet-100 shadow-sm">
              <LockKeyhole className="h-6 w-6 text-blue-600" />
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Reset your password
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Enter the six-digit code sent to your email and choose a new
              password.
            </p>
          </div>

          {/* Email identity */}
          <div className="email-display mb-6">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100">
              <Mail className="h-4 w-4 text-blue-600" />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Resetting password for
              </p>

              <p className="mt-0.5 break-all text-sm font-semibold text-slate-700">
                {email || 'Loading email...'}
              </p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/90 px-4 py-3.5"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />

              <p className="text-sm leading-5 text-rose-700">{error}</p>
            </div>
          )}

          {/* Success message */}
          {message && (
            <div
              role="status"
              className={`mb-5 flex items-start gap-3 rounded-xl border px-4 py-3.5 ${
                success
                  ? 'border-emerald-200 bg-emerald-50/90'
                  : 'border-blue-200 bg-blue-50/90'
              }`}
            >
              <CheckCircle2
                className={`mt-0.5 h-5 w-5 shrink-0 ${
                  success ? 'text-emerald-500' : 'text-blue-500'
                }`}
              />

              <p
                className={`text-sm leading-5 ${
                  success ? 'text-emerald-700' : 'text-blue-700'
                }`}
              >
                {message}
              </p>
            </div>
          )}

          {/* Reset form */}
          {!success && (
            <form onSubmit={handleReset} className="space-y-5">
              {/* OTP */}
              <div>
                <label htmlFor="reset-otp" className="form-label">
                  Password reset code
                </label>

                <div className="otp-wrapper">
                  <KeyRound className="otp-icon" />

                  <input
                    id="reset-otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    required
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
                    }
                    placeholder="000000"
                    className="otp-input"
                    aria-label="Six-digit password reset code"
                  />
                </div>

                <p className="mt-2 text-[11px] text-slate-400">
                  Enter the six-digit verification code from your email.
                </p>
              </div>

              {/* New password */}
              <div>
                <label htmlFor="new-password" className="form-label">
                  New password
                </label>

                <div className="input-wrapper">
                  <LockKeyhole className="input-icon" />

                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    maxLength={72}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    className="reset-input password-input"
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
              </div>

              {/* Confirm password */}
              <div>
                <label htmlFor="confirm-password" className="form-label">
                  Confirm new password
                </label>

                <div className="input-wrapper">
                  <ShieldCheck className="input-icon" />

                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    maxLength={72}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    className="reset-input password-input"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword((value) => !value)
                    }
                    className="password-toggle"
                    aria-label={
                      showConfirmPassword ? 'Hide password' : 'Show password'
                    }
                    aria-pressed={showConfirmPassword}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {confirmPassword.length > 0 && (
                  <p
                    className={`mt-2 flex items-center gap-1.5 text-[11px] ${
                      password === confirmPassword
                        ? 'text-emerald-600'
                        : 'text-slate-400'
                    }`}
                  >
                    {password === confirmPassword && (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    {password === confirmPassword
                      ? 'Passwords match'
                      : 'Make sure both passwords match.'}
                  </p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || otp.length !== 6 || !email}
                className="reset-submit"
              >
                {loading ? (
                  <>
                    <span className="submit-spinner" />
                    Resetting password...
                  </>
                ) : (
                  <>
                    Reset password
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Success action */}
          {success && (
            <button
              type="button"
              onClick={() => router.replace('/login')}
              className="reset-submit"
            >
              Continue to sign in
              <ArrowRight className="h-4 w-4" />
            </button>
          )}

          {/* Footer links */}
          <div className="mt-7 border-t border-slate-100 pt-6 text-center">
            {!success && (
              <p className="text-sm text-slate-500">
                Didn't receive a code?{' '}
                <Link
                  href="/forgot-password"
                  className="font-bold text-blue-600 transition hover:text-violet-600"
                >
                  Request another
                </Link>
              </p>
            )}

            {success && (
              <p className="text-sm text-slate-500">
                Your account is ready. Sign in using your new password.
              </p>
            )}
          </div>
        </div>

        {/* Security footer */}
        <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          Your password is protected with secure account verification
        </div>
      </div>

      <style jsx global>{`
        .reset-page {
          isolation: isolate;
          background: #f5f6ff;
          color: #172033;
        }

        .aurora-background {
          position: fixed;
          inset: 0;
          z-index: -1;
          overflow: hidden;
          pointer-events: none;
          background:
            radial-gradient(
              ellipse at 10% 5%,
              rgba(210, 215, 255, 0.55),
              transparent 42%
            ),
            radial-gradient(
              ellipse at 90% 20%,
              rgba(249, 218, 246, 0.48),
              transparent 38%
            ),
            linear-gradient(
              135deg,
              #f8f9ff 0%,
              #f1f2ff 48%,
              #f8f7ff 100%
            );
        }

        .aurora-blob {
          position: absolute;
          width: 440px;
          height: 440px;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.42;
          animation: reset-aurora-float 22s ease-in-out infinite alternate;
        }

        .aurora-one {
          top: -180px;
          left: 12%;
          background: rgba(116, 143, 255, 0.42);
        }

        .aurora-two {
          top: 18%;
          right: -180px;
          background: rgba(239, 145, 222, 0.36);
          animation-delay: -7s;
        }

        .aurora-three {
          bottom: -240px;
          left: 38%;
          background: rgba(104, 215, 232, 0.3);
          animation-delay: -13s;
        }

        .aurora-grid {
          position: absolute;
          inset: 0;
          opacity: 0.18;
          background-image: radial-gradient(
            #9aa8d5 0.7px,
            transparent 0.7px
          );
          background-size: 26px 26px;
          mask-image: linear-gradient(to bottom, black, transparent 85%);
        }

        .brand-icon {
          display: flex;
          width: 42px;
          height: 42px;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 255, 255, 0.5);
          border-radius: 13px;
          background: linear-gradient(135deg, #4777f5, #7962e9);
          box-shadow: 0 7px 18px rgba(71, 119, 245, 0.25);
        }

        .reset-card {
          border: 1px solid rgba(255, 255, 255, 0.9);
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.78);
          padding: 30px;
          box-shadow:
            0 20px 60px rgba(64, 77, 130, 0.09),
            0 2px 8px rgba(64, 77, 130, 0.025),
            inset 0 1px 0 rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(28px);
          -webkit-backdrop-filter: blur(28px);
        }

        .email-display {
          display: flex;
          align-items: center;
          gap: 12px;
          border: 1px solid #e1e9ff;
          border-radius: 12px;
          background: rgba(240, 245, 255, 0.75);
          padding: 12px;
        }

        .form-label {
          display: block;
          margin-bottom: 8px;
          color: #475569;
          font-size: 12px;
          font-weight: 700;
        }

        .input-wrapper,
        .otp-wrapper {
          position: relative;
        }

        .input-icon,
        .otp-icon {
          position: absolute;
          top: 50%;
          left: 13px;
          z-index: 1;
          width: 16px;
          height: 16px;
          transform: translateY(-50%);
          color: #91a0bd;
          pointer-events: none;
        }

        .reset-input {
          width: 100%;
          min-height: 46px;
          border: 1px solid rgba(203, 213, 225, 0.85);
          border-radius: 11px;
          background: rgba(255, 255, 255, 0.88);
          padding: 11px 13px 11px 40px;
          color: #1e293b;
          font-size: 13px;
          outline: none;
          transition:
            border-color 180ms ease,
            box-shadow 180ms ease,
            background 180ms ease;
        }

        .reset-input::placeholder {
          color: #a0aec0;
        }

        .reset-input:focus {
          border-color: #7797f7;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(71, 119, 245, 0.1);
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
          color: #94a3b8;
          transition: all 160ms ease;
        }

        .password-toggle:hover {
          background: #f0f4ff;
          color: #4777d8;
        }

        .otp-wrapper {
          display: flex;
          align-items: center;
        }

        .otp-input {
          width: 100%;
          min-height: 58px;
          border: 1px solid rgba(203, 213, 225, 0.85);
          border-radius: 11px;
          background: rgba(255, 255, 255, 0.88);
          padding: 12px 12px 12px 42px;
          color: #334155;
          font-size: 23px;
          font-weight: 800;
          letter-spacing: 0.55em;
          text-align: center;
          outline: none;
          transition:
            border-color 180ms ease,
            box-shadow 180ms ease,
            background 180ms ease;
        }

        .otp-input::placeholder {
          color: #cbd5e1;
        }

        .otp-input:focus {
          border-color: #7797f7;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(71, 119, 245, 0.1);
        }

        .reset-submit {
          display: flex;
          width: 100%;
          min-height: 46px;
          align-items: center;
          justify-content: center;
          gap: 9px;
          margin-top: 8px;
          border: 1px solid transparent;
          border-radius: 11px;
          background: linear-gradient(110deg, #4777f5, #665ee8);
          padding: 12px 16px;
          color: white;
          font-size: 13px;
          font-weight: 700;
          box-shadow: 0 7px 18px rgba(71, 119, 245, 0.22);
          transition: all 180ms ease;
        }

        .reset-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          background: linear-gradient(110deg, #3868e8, #584fd8);
          box-shadow: 0 10px 22px rgba(71, 119, 245, 0.27);
        }

        .reset-submit:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .submit-spinner {
          width: 15px;
          height: 15px;
          border: 2px solid rgba(255, 255, 255, 0.4);
          border-top-color: white;
          border-radius: 50%;
          animation: reset-spin 0.7s linear infinite;
        }

        @keyframes reset-aurora-float {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          50% {
            transform: translate3d(30px, 25px, 0) scale(1.08);
          }
          100% {
            transform: translate3d(-20px, 45px, 0) scale(0.96);
          }
        }

        @keyframes reset-spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 480px) {
          .reset-card {
            padding: 23px 20px;
            border-radius: 20px;
          }

          .otp-input {
            font-size: 21px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .aurora-blob {
            animation: none;
          }

          .reset-input,
          .otp-input,
          .reset-submit,
          .password-toggle {
            transition: none;
          }

          .reset-submit:hover {
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
