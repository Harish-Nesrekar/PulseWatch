
'use client';

import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Loader2,
  Save,
  UserRound,
  Building2,
  Mail,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

import { Sidebar } from '@/components/sidebar';
import { settingsApi, type SettingsData } from '@/lib/api';
import { PushNotificationSettings } from '@/components/push-notification-settings';

function AmbientMarketBackdrop() {
  // Decorative illustration only: these values are intentionally hard-coded
  // and are not connected to monitor health, uptime, or API responses.
  const illustrativeUptime = [
    72, 76, 69, 74, 82, 78, 85, 80, 73, 77, 88, 83,
    91, 86, 79, 84, 93, 89, 95, 87, 81, 86, 92, 84,
    76, 82, 90, 85, 94, 89, 97, 91, 84, 88, 96, 92,
    99, 93, 87, 91, 98, 94, 100, 95, 89, 94, 99, 96,
  ];

  const chartPoints = illustrativeUptime.map((uptime, index) => ({
    x: (index / (illustrativeUptime.length - 1)) * 1440,
    y: 260 - (uptime / 100) * 220,
    uptime,
  }));
  const segments = chartPoints.slice(1).map((point, index) => {
    const previous = chartPoints[index];
    return {
      x1: previous.x,
      y1: previous.y,
      x2: point.x,
      y2: point.y,
      rising: point.uptime >= previous.uptime,
    };
  });

  return (
    <div className="dashboard-market-backdrop" aria-hidden="true">
      <svg viewBox="0 0 1440 320" preserveAspectRatio="none">
        <defs>
          <filter id="settings-market-line-blur" x="-20%" y="-100%" width="140%" height="300%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
          <filter id="settings-market-line-soft-blur" x="-20%" y="-100%" width="140%" height="300%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>
        <g className="market-grid">
          {Array.from({ length: 13 }, (_, index) => (
            <line key={`v-${index}`} x1={index * 120} y1="0" x2={index * 120} y2="320" />
          ))}
          {Array.from({ length: 6 }, (_, index) => (
            <line key={`h-${index}`} x1="0" y1={index * 64} x2="1440" y2={index * 64} />
          ))}
        </g>
        <g filter="url(#settings-market-line-blur)" opacity=".24" strokeWidth="18" strokeLinecap="round">
          {segments.map((segment, index) => (
            <line
              key={`glow-${index}`}
              x1={segment.x1}
              y1={segment.y1}
              x2={segment.x2}
              y2={segment.y2}
              stroke={segment.rising ? '#16834f' : '#dc2626'}
            />
          ))}
        </g>
        <g filter="url(#settings-market-line-soft-blur)" opacity=".32" strokeWidth="7" strokeLinecap="round">
          {segments.map((segment, index) => (
            <line
              key={`soft-${index}`}
              x1={segment.x1}
              y1={segment.y1}
              x2={segment.x2}
              y2={segment.y2}
              stroke={segment.rising ? '#16834f' : '#dc2626'}
            />
          ))}
        </g>
        <g fill="none" strokeWidth="2.1" strokeLinecap="round" opacity=".38">
          {segments.map((segment, index) => (
            <line
              key={`line-${index}`}
              x1={segment.x1}
              y1={segment.y1}
              x2={segment.x2}
              y2={segment.y2}
              stroke={segment.rising ? '#16834f' : '#dc2626'}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [name, setName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingOrganization, setSavingOrganization] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    settingsApi
      .get(controller.signal)
      .then((result) => {
        setSettings(result);
        setName(result.user.name);
        setOrganizationName(result.organization?.name ?? '');
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            err instanceof Error ? err.message : 'Unable to load settings.'
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!settings || savingProfile || savingOrganization) return;

    const nextName = name.trim();

    if (nextName.length < 2 || nextName.length > 120) {
      setError('Name must be between 2 and 120 characters.');
      return;
    }

    setSavingProfile(true);
    setError('');
    setSuccess('');

    try {
      const updatedUser = await settingsApi.updateProfile(nextName);

      setSettings((current) =>
        current
          ? {
              ...current,
              user: { ...current.user, ...updatedUser },
            }
          : current
      );

      localStorage.setItem(
        'pulsewatch_user',
        JSON.stringify({ ...settings.user, ...updatedUser })
      );

      setSuccess('Profile updated.');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to update profile.'
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function saveOrganization(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (savingOrganization || savingProfile) return;

    const nextName = organizationName.trim();

    if (nextName.length < 2 || nextName.length > 120) {
      setError('Organization name must be between 2 and 120 characters.');
      return;
    }

    setSavingOrganization(true);
    setError('');
    setSuccess('');

    try {
      const organization = await settingsApi.updateOrganization(nextName);

      if (organization) {
        setSettings((current) =>
          current ? { ...current, organization } : current
        );
      }

      setSuccess('Organization settings updated.');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to update organization settings.'
      );
    } finally {
      setSavingOrganization(false);
    }
  }

  return (
    <div className="settings-page relative flex min-h-screen flex-col md:flex-row">
      <AmbientMarketBackdrop />
      <Sidebar user={settings?.user ?? null} />

      <main className="relative z-10 flex min-h-screen min-w-0 flex-1 flex-col overflow-x-hidden">

        {/* Header */}
        <header className="relative z-10 border-b border-white/70 bg-white/45 px-5 py-6 backdrop-blur-xl sm:px-8">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <span className="header-eyebrow">WORKSPACE PREFERENCES</span>
                <span className="header-dot" />
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Settings
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Manage your account and organization profile.
              </p>
            </div>

            <div className="hidden h-11 w-11 items-center justify-center rounded-2xl border border-white/80 bg-white/70 shadow-sm sm:flex">
              <Sparkles className="h-5 w-5 text-[#16834f]" />
            </div>
          </div>
        </header>

        <div className="relative z-10 mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
          {/* Page introduction */}
          <section className="settings-intro">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#16834f] shadow-md shadow-emerald-900/10">
                <ShieldCheck className="h-6 w-6 text-white" />
              </div>

              <div>
                <h2 className="text-base font-bold text-slate-800">
                  Account configuration
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Keep your personal details and workspace information up to
                  date.
                </p>
              </div>
            </div>
          </section>

          {/* Error notification */}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/90 px-4 py-3.5 shadow-sm"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-100">
                <AlertCircle className="h-4 w-4 text-rose-600" />
              </div>

              <div className="min-w-0 pt-1">
                <p className="text-sm font-semibold text-rose-800">
                  Something went wrong
                </p>
                <p className="mt-0.5 text-sm leading-5 text-rose-700">
                  {error}
                </p>
              </div>
            </div>
          )}

          {/* Success notification */}
          {success && (
            <div
              role="status"
              className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/90 px-4 py-3.5 shadow-sm"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>

              <div className="min-w-0 pt-1">
                <p className="text-sm font-semibold text-emerald-800">
                  Changes saved
                </p>
                <p className="mt-0.5 text-sm text-emerald-700">{success}</p>
              </div>
            </div>
          )}

          {/* Loading */}
          {loading ? (
            <div className="glass-panel flex min-h-64 items-center justify-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-[#16834f]" />
              <span className="text-sm font-medium text-slate-500">
                Loading settings...
              </span>
            </div>
          ) : settings ? (
            <>
              {/* Profile */}
              <form onSubmit={saveProfile} className="settings-panel">
                <div className="section-heading">
                  <div className="section-icon profile-icon">
                    <UserRound className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-slate-800">
                      Personal profile
                    </h2>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Manage the name associated with your PulseWatch account.
                    </p>
                  </div>
                </div>

                <div className="section-divider" />

                <div className="space-y-5">
                  {/* Name */}
                  <label
                    htmlFor="profile-name"
                    className="block text-xs font-semibold text-slate-600"
                  >
                    Full name

                    <div className="settings-input-wrapper mt-2">
                      <UserRound className="settings-input-icon" />

                      <input
                        id="profile-name"
                        type="text"
                        required
                        minLength={2}
                        maxLength={120}
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Enter your full name"
                        autoComplete="name"
                        className="settings-input"
                      />
                    </div>
                  </label>

                  {/* Email */}
                  <label
                    htmlFor="profile-email"
                    className="block text-xs font-semibold text-slate-600"
                  >
                    Email address

                    <div className="settings-input-wrapper mt-2">
                      <Mail className="settings-input-icon" />

                      <input
                        id="profile-email"
                        type="email"
                        value={settings.user.email}
                        readOnly
                        aria-readonly="true"
                        className="settings-input settings-input-readonly"
                      />

                      <span className="readonly-indicator">
                        Read only
                      </span>
                    </div>

                    <span className="mt-2 block text-[11px] font-normal text-slate-400">
                      Email changes are not currently supported.
                    </span>
                  </label>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[11px] text-slate-400">
                    Your profile name is visible in your workspace.
                  </p>

                  <button
                    type="submit"
                    disabled={savingProfile || savingOrganization}
                    className="settings-save-button"
                  >
                    {savingProfile ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}

                    {savingProfile ? 'Saving profile...' : 'Save profile'}
                  </button>
                </div>
              </form>

              {/* Organization */}
              <form onSubmit={saveOrganization} className="settings-panel">
                <div className="section-heading">
                  <div className="section-icon organization-icon">
                    <Building2 className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-slate-800">
                      Organization
                    </h2>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Configure the organization name shown in your workspace.
                    </p>
                  </div>
                </div>

                <div className="section-divider" />

                <label
                  htmlFor="organization-name"
                  className="block text-xs font-semibold text-slate-600"
                >
                  Organization name

                  <div className="settings-input-wrapper mt-2">
                    <Building2 className="settings-input-icon" />

                    <input
                      id="organization-name"
                      type="text"
                      required
                      minLength={2}
                      maxLength={120}
                      value={organizationName}
                      onChange={(event) =>
                        setOrganizationName(event.target.value)
                      }
                      placeholder="Enter organization name"
                      className="settings-input"
                    />
                  </div>

                  <span className="mt-2 block text-[11px] font-normal text-slate-400">
                    Use a name that identifies your workspace.
                  </span>
                </label>

                <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[11px] text-slate-400">
                    Changes apply to your workspace profile.
                  </p>

                  <button
                    type="submit"
                    disabled={savingOrganization || savingProfile}
                    className="settings-save-button"
                  >
                    {savingOrganization ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}

                    {savingOrganization
                      ? 'Saving organization...'
                      : 'Save organization'}
                  </button>
                </div>
              </form>


               {/* Browser Push Notification Settings */}
              <PushNotificationSettings />

              {/* Organization management notice */}
              <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/65 px-4 py-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/80">
                  <ShieldCheck className="h-4 w-4 text-[#16834f]" />
                </div>

                <div>
                  <h3 className="text-xs font-bold text-slate-700">
                    Organization management
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Organization-member management is not currently available.
                  </p>
                </div>
              </div>
            </>
          ) : !error ? (
            <div className="glass-panel flex min-h-48 items-center justify-center">
              <p className="text-sm text-slate-500">
                Settings are unavailable.
              </p>
            </div>
          ) : null}
        </div>
      </main>

      <style jsx global>{`
        .settings-page {
          isolation: isolate;
          background: #f6f8fa;
          color: #172033;
        }

        .settings-page .dashboard-market-backdrop {
          position: fixed;
          inset: 18vh 0 auto 0;
          z-index: 0;
          height: clamp(620px, 78vh, 920px);
          min-height: 620px;
          max-height: 920px;
          overflow: hidden;
          pointer-events: none;
          opacity: .92;
          mask-image: linear-gradient(to bottom, #000 0%, rgba(0,0,0,.82) 62%, rgba(0,0,0,.3) 86%, transparent 100%);
          -webkit-mask-image: linear-gradient(to bottom, #000 0%, rgba(0,0,0,.82) 62%, rgba(0,0,0,.3) 86%, transparent 100%);
        }

        .settings-page .dashboard-market-backdrop svg {
          display: block;
          width: 100%;
          height: 100%;
        }

        .settings-page .market-grid line {
          stroke: rgba(125, 145, 160, .12);
          stroke-width: 1;
          stroke-dasharray: 2 8;
        }

        .header-eyebrow {
          color: #8491b1;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.14em;
        }

        .header-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #16834f;
          box-shadow: 0 0 0 3px rgba(22, 131, 79, 0.12);
        }

        .settings-intro {
          border: 1px solid rgba(255, 255, 255, 0.85);
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.78);
          padding: 20px;
          box-shadow: 0 8px 30px rgba(64, 77, 130, 0.035);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }

        .settings-panel,
        .glass-panel {
          border: 1px solid rgba(255, 255, 255, 0.9);
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.76);
          padding: 24px;
          box-shadow:
            0 15px 45px rgba(64, 77, 130, 0.055),
            0 2px 8px rgba(64, 77, 130, 0.02),
            inset 0 1px 0 rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
        }

        .section-heading {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .section-icon {
          display: flex;
          width: 44px;
          height: 44px;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          border: 1px solid transparent;
          border-radius: 14px;
        }

        .profile-icon {
          border-color: #cce8d9;
          background: #edf8f1;
          color: #16834f;
        }

        .organization-icon {
          border-color: #cce8d9;
          background: #edf8f1;
          color: #16834f;
        }

        .section-divider {
          height: 1px;
          margin: 20px 0;
          background: linear-gradient(
            to right,
            rgba(203, 213, 225, 0.7),
            rgba(203, 213, 225, 0.12)
          );
        }

        .settings-input-wrapper {
          position: relative;
        }

        .settings-input-icon {
          position: absolute;
          top: 50%;
          left: 13px;
          width: 16px;
          height: 16px;
          transform: translateY(-50%);
          color: #94a3b8;
          pointer-events: none;
        }

        .settings-input {
          width: 100%;
          min-height: 45px;
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

        .settings-input::placeholder {
          color: #a0aec0;
        }

        .settings-input:focus {
          border-color: #16834f;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(22, 131, 79, 0.10);
        }

        .settings-input-readonly {
          cursor: not-allowed;
          background: rgba(241, 245, 249, 0.75);
          color: #94a3b8;
          padding-right: 90px;
        }

        .settings-input-readonly:focus {
          border-color: rgba(203, 213, 225, 0.85);
          background: rgba(241, 245, 249, 0.75);
          box-shadow: none;
        }

        .readonly-indicator {
          position: absolute;
          top: 50%;
          right: 11px;
          transform: translateY(-50%);
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          background: #f8fafc;
          padding: 3px 7px;
          color: #94a3b8;
          font-size: 9px;
          font-weight: 700;
        }

        .settings-save-button {
          display: inline-flex;
          min-height: 40px;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 1px solid transparent;
          border-radius: 10px;
          background: #16834f;
          padding: 9px 15px;
          color: white;
          font-size: 12px;
          font-weight: 700;
          box-shadow: 0 6px 15px rgba(22, 131, 79, 0.16);
          transition: all 180ms ease;
        }

        .settings-save-button:hover:not(:disabled) {
          transform: translateY(-1px);
          background: #116b40;
          box-shadow: 0 9px 20px rgba(22, 131, 79, 0.20);
        }

        .settings-save-button:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }


        .settings-page button:focus-visible,
        .settings-page input:focus-visible {
          outline: 2px solid #16834f;
          outline-offset: 2px;
        }

        .settings-page .settings-save-button {
          min-width: 148px;
        }

        @media (max-width: 480px) {
          .settings-page .settings-panel,
          .settings-page .glass-panel {
            padding: 17px;
          }
          .settings-page .settings-save-button {
            width: 100%;
          }
          .settings-page .settings-input-readonly {
            padding-right: 78px;
          }
        }

        @media (max-width: 640px) {
          .settings-panel,
          .glass-panel {
            padding: 20px;
            border-radius: 17px;
          }

          .settings-intro {
            padding: 17px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .settings-input,
          .settings-save-button {
            transition: none;
          }

          .settings-save-button:hover {
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}
