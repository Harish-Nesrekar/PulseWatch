
'use client';

import { Sidebar } from '@/components/sidebar';
import { api } from '@/lib/api';
import { useEffect, useState } from 'react';
import type { FormEvent, ComponentProps } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Activity,
  AlertCircle,
  Loader2,
  Save,
  Globe,
  ShieldCheck,
  Clock3,
  Zap,
  CheckCircle2,
  Info,
  Settings2,
} from 'lucide-react';
import Link from 'next/link';

type SidebarUser = ComponentProps<typeof Sidebar>['user'];

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
          <filter id="new-monitor-market-line-blur" x="-20%" y="-100%" width="140%" height="300%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
          <filter id="new-monitor-market-line-soft-blur" x="-20%" y="-100%" width="140%" height="300%">
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
        <g filter="url(#new-monitor-market-line-blur)" opacity=".24" strokeWidth="18" strokeLinecap="round">
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
        <g filter="url(#new-monitor-market-line-soft-blur)" opacity=".32" strokeWidth="7" strokeLinecap="round">
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


export default function NewMonitorPage() {
  const router = useRouter();

  const [user, setUser] = useState<SidebarUser | null>(null);

  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState<'GET' | 'HEAD'>('GET');
  const [interval, setInterval] = useState('60');
  const [expectedStatus, setExpectedStatus] = useState('200');
  const [failureThreshold, setFailureThreshold] = useState('3');
  const [recoveryThreshold, setRecoveryThreshold] = useState('2');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const storedUser = localStorage.getItem('pulsewatch_user');

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser) as SidebarUser);
      } catch {
        localStorage.removeItem('pulsewatch_user');
      }
    }
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;

    setError('');

    const normalizedName = name.trim();
    const normalizedUrl = url.trim();

    if (!normalizedName) {
      setError('Please enter a monitor name.');
      return;
    }

    try {
      const parsedUrl = new URL(normalizedUrl);

      if (!['http:', 'https:'].includes(parsedUrl.protocol) || !parsedUrl.hostname) {
        setError('Only HTTP and HTTPS URLs are supported.');
        return;
      }
    } catch {
      setError('Please enter a valid endpoint URL.');
      return;
    }

    if (![30, 60, 300, 600].includes(Number(interval))) {
      setError('Choose a supported check interval.');
      return;
    }

    const statusCode = Number(expectedStatus);

    if (
      !Number.isInteger(statusCode) ||
      statusCode < 100 ||
      statusCode > 599
    ) {
      setError('Expected status must be a valid HTTP status code.');
      return;
    }

    const failureCount = Number(failureThreshold);
    const recoveryCount = Number(recoveryThreshold);

    if (
      !Number.isInteger(failureCount) ||
      failureCount < 1 ||
      failureCount > 20 ||
      !Number.isInteger(recoveryCount) ||
      recoveryCount < 1 ||
      recoveryCount > 20
    ) {
      setError(
        'Failure and recovery thresholds must be between 1 and 20 checks.',
      );
      return;
    }

    setLoading(true);

    try {
      await api('/monitors', {
        method: 'POST',
        body: JSON.stringify({
          name: normalizedName,
          url: normalizedUrl,
          method,
          interval_seconds: Number(interval),
          expected_status: statusCode,
          failure_threshold: failureCount,
          recovery_threshold: recoveryCount,
        }),
      });

      router.replace('/monitors');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to create monitor. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pulsewatch-new-monitor relative isolate flex min-h-screen flex-col overflow-hidden bg-[#F6F8FA] text-[#151526] md:flex-row">
      <AmbientMarketBackdrop />

      <div className="relative z-10 shrink-0"><Sidebar user={(user ?? {}) as SidebarUser} /></div>

      <main className="relative z-10 flex min-w-0 flex-1 flex-col overflow-y-auto">
        {/* Header */}
        <header className="page-header sticky top-0 z-20 flex items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/monitors"
              aria-label="Back to monitors"
              className="back-button"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div>
              <div className="mb-1 flex items-center gap-2">
                <span className="eyebrow">
                  <Activity className="h-3.5 w-3.5" />
                  MONITORING
                </span>
              </div>

              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                Create Monitor
              </h1>

              <p className="mt-1 text-xs text-slate-500">
                Configure a new API or website health check.
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-blue-100 bg-white/70 px-3 py-2 text-xs font-semibold text-blue-600 sm:flex">
            <ShieldCheck className="h-4 w-4" />
            Endpoint monitoring
          </div>
        </header>

        <div className="relative z-10 w-full max-w-6xl px-5 py-7 sm:px-8 lg:px-10">
          {/* Intro */}
          <div className="mb-6">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <Link
                href="/monitors"
                className="transition hover:text-blue-600"
              >
                Monitors
              </Link>
              <span>/</span>
              <span className="text-slate-600">New monitor</span>
            </div>

            <h2 className="mt-4 text-lg font-bold text-slate-900">
              Set up your endpoint
            </h2>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              Add the website or API endpoint you want PulseWatch to monitor.
              Configure its check frequency and the conditions used to detect
              incidents.
            </p>
          </div>

          <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
            {/* Main form */}
            <form
              onSubmit={handleSubmit}
              className="glass-panel overflow-hidden"
            >
              {/* Form heading */}
              <div className="panel-heading flex items-center gap-3 px-5 py-5 sm:px-7">
                <div className="section-icon blue-icon">
                  <Settings2 className="h-5 w-5" />
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Monitor configuration
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Define the endpoint and monitoring behavior.
                  </p>
                </div>
              </div>

              <div className="space-y-6 p-5 sm:p-7">
                {/* Error */}
                {error && (
                  <div
                    role="alert"
                    className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/90 px-4 py-3.5"
                  >
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-rose-800">
                        Unable to create monitor
                      </p>
                      <p className="mt-1 break-words text-sm text-rose-700">
                        {error}
                      </p>
                    </div>
                  </div>
                )}

                {/* Basic details */}
                <section className="space-y-5">
                  <div className="form-section-heading">
                    <div className="section-number">01</div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">
                        Basic details
                      </h4>
                      <p className="mt-0.5 text-xs text-slate-400">
                        Identify the endpoint you want to monitor.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="monitor-name" className="form-label">
                      Monitor name
                      <span className="required-mark">*</span>
                    </label>

                    <input
                      id="monitor-name"
                      type="text"
                      required
                      maxLength={100}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Production API"
                      className="form-input"
                    />

                    <p className="form-hint">
                      Choose a recognizable name for this endpoint.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="monitor-url" className="form-label">
                      Endpoint URL
                      <span className="required-mark">*</span>
                    </label>

                    <div className="relative">
                      <Globe className="input-icon" />

                      <input
                        id="monitor-url"
                        type="url"
                        required
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://api.example.com/health"
                        className="form-input has-leading-icon"
                      />
                    </div>

                    <p className="form-hint">
                      Enter the publicly accessible HTTP or HTTPS endpoint.
                    </p>
                  </div>
                </section>

                <div className="form-divider" />

                {/* Request settings */}
                <section className="space-y-5">
                  <div className="form-section-heading">
                    <div className="section-number">02</div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">
                        Request settings
                      </h4>
                      <p className="mt-0.5 text-xs text-slate-400">
                        Configure how PulseWatch checks your endpoint.
                      </p>
                    </div>
                  </div>

                  <div className="grid min-w-0 grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                    <div>
                      <label htmlFor="monitor-method" className="form-label">
                        HTTP method
                      </label>

                      <select
                        id="monitor-method"
                        value={method}
                        onChange={(e) =>
                          setMethod(e.target.value as 'GET' | 'HEAD')
                        }
                        className="form-input"
                      >
                        <option value="GET">GET</option>
                        <option value="HEAD">HEAD</option>
                      </select>

                      <p className="form-hint">
                        Request method used for the health check.
                      </p>
                    </div>

                    <div>
                      <label htmlFor="expected-status" className="form-label">
                        Expected HTTP status
                      </label>

                      <input
                        id="expected-status"
                        type="number"
                        inputMode="numeric"
                        min="100"
                        max="599"
                        step="1"
                        required
                        value={expectedStatus}
                        onChange={(e) => setExpectedStatus(e.target.value)}
                        className="form-input"
                      />

                      <p className="form-hint">
                        HTTP response code considered successful.
                      </p>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <label htmlFor="check-interval" className="form-label">
                      Check interval
                    </label>
                    <div className="interval-select-wrap">
                      <span className="interval-select-icon" aria-hidden="true">
                        <Clock3 />
                      </span>
                      <select
                        id="check-interval"
                        value={interval}
                        onChange={(e) => setInterval(e.target.value)}
                        className="form-input interval-select"
                      >
                        <option value="30">30 seconds</option>
                        <option value="60">1 minute</option>
                        <option value="300">5 minutes</option>
                        <option value="600">10 minutes</option>
                      </select>
                    </div>
                    <p className="form-hint">How often this endpoint is checked.</p>
                  </div>
                </section>

                <div className="form-divider" />

                {/* Incident settings */}
                <section className="space-y-5">
                  <div className="form-section-heading">
                    <div className="section-number">03</div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">
                        Incident detection
                      </h4>
                      <p className="mt-0.5 text-xs text-slate-400">
                        Control when failures and recoveries are recognized.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="failure-threshold"
                        className="form-label"
                      >
                        Failures before incident
                        <span className="required-mark">*</span>
                      </label>

                      <input
                        id="failure-threshold"
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={20}
                        step={1}
                        required
                        value={failureThreshold}
                        onChange={(event) =>
                          setFailureThreshold(event.target.value)
                        }
                        className="form-input"
                      />

                      <p className="form-hint">
                        Consecutive failed checks required to trigger an incident.
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor="recovery-threshold"
                        className="form-label"
                      >
                        Successes before recovery
                        <span className="required-mark">*</span>
                      </label>

                      <input
                        id="recovery-threshold"
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={20}
                        step={1}
                        required
                        value={recoveryThreshold}
                        onChange={(event) =>
                          setRecoveryThreshold(event.target.value)
                        }
                        className="form-input"
                      />

                      <p className="form-hint">
                        Consecutive successful checks required to confirm recovery.
                      </p>
                    </div>
                  </div>

                  <div className="threshold-info">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                    <p>
                      A higher threshold can help reduce alerts caused by
                      temporary network failures. Choose values appropriate
                      for your endpoint.
                    </p>
                  </div>
                </section>

                {/* Actions */}
                <div className="flex flex-col-reverse justify-end gap-3 border-t border-slate-100 pt-6 sm:flex-row">
                  <Link href="/monitors" className="cancel-button">
                    Cancel
                  </Link>

                  <button
                    type="submit"
                    disabled={loading}
                    className="primary-button"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Create monitor
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>

            {/* Right information panel */}
            <aside className="space-y-4">
              <div className="glass-panel overflow-hidden">
                <div className="panel-heading flex items-center gap-3 px-5 py-4">
                  <div className="section-icon purple-icon">
                    <Zap className="h-4 w-4" />
                  </div>

                  <h3 className="text-sm font-bold text-slate-800">
                    How monitoring works
                  </h3>
                </div>

                <div className="space-y-4 p-5">
                  <div className="info-step">
                    <div className="info-step-icon">
                      <Globe className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700">
                        Endpoint check
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        PulseWatch sends an HTTP request to your configured URL.
                      </p>
                    </div>
                  </div>

                  <div className="info-step">
                    <div className="info-step-icon">
                      <Activity className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700">
                        Response evaluation
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        The returned HTTP status is compared with your expected status.
                      </p>
                    </div>
                  </div>

                  <div className="info-step">
                    <div className="info-step-icon">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700">
                        Incident detection
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Configured failure and recovery thresholds help determine
                        when an incident is triggered or recovered.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Configuration summary */}
              <div className="glass-panel p-5">
                <div className="flex items-center gap-2">
                  <div className="section-icon cyan-icon">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Configuration summary
                  </h3>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="summary-row">
                    <span>Endpoint</span>
                    <strong className="summary-value-url" title={url || 'Not set'}>
                      {url.trim() || 'Not set'}
                    </strong>
                  </div>

                  <div className="summary-row">
                    <span>HTTP method</span>
                    <strong>{method}</strong>
                  </div>

                  <div className="summary-row">
                    <span>Check interval</span>
                    <strong>
                      {({ '30': '30 seconds', '60': '1 minute', '300': '5 minutes', '600': '10 minutes' } as Record<string, string>)[interval] ?? '—'}
                    </strong>
                  </div>

                  <div className="summary-row">
                    <span>Expected status</span>
                    <strong>{expectedStatus || '—'}</strong>
                  </div>

                  <div className="summary-row">
                    <span>Failure threshold</span>
                    <strong>{failureThreshold || '—'}</strong>
                  </div>

                  <div className="summary-row">
                    <span>Recovery threshold</span>
                    <strong>{recoveryThreshold || '—'}</strong>
                  </div>
                </div>
              </div>

              {/* Security note */}
              <div className="security-note">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <p className="text-xs font-bold text-emerald-800">
                    Monitoring tip
                  </p>
                </div>

                <p className="mt-2 text-xs leading-5 text-emerald-800/80">
                  Use a dedicated health endpoint that returns a predictable
                  HTTP response. This makes availability checks easier to interpret.
                </p>
              </div>
            </aside>
          </div>

          <footer className="pb-2 pt-7 text-center text-[11px] text-slate-400">
            PulseWatch · Monitor your services with confidence
          </footer>
        </div>
      </main>

      <style jsx global>{`
        .pulsewatch-new-monitor {
          position: relative; isolation: isolate; min-height: 100vh;
          background: #f6f8fa; color: #172033;
        }
        .pulsewatch-new-monitor .dashboard-market-backdrop {
          position: fixed; inset: 18vh 0 auto 0; z-index: 0;
          height: clamp(620px, 78vh, 920px); min-height: 620px; max-height: 920px;
          overflow: hidden; pointer-events: none; opacity: .92;
          mask-image: linear-gradient(to bottom, #000 0%, rgba(0,0,0,.82) 62%, rgba(0,0,0,.3) 86%, transparent 100%);
          -webkit-mask-image: linear-gradient(to bottom, #000 0%, rgba(0,0,0,.82) 62%, rgba(0,0,0,.3) 86%, transparent 100%);
        }
        .pulsewatch-new-monitor .dashboard-market-backdrop svg { display:block; width:100%; height:100%; }
        .pulsewatch-new-monitor .market-grid line { stroke:rgba(125,145,160,.12); stroke-width:1; stroke-dasharray:2 8; }
        .page-header {
          border-bottom:1px solid rgba(226,232,240,.8); background:rgba(255,255,255,.72);
          backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px);
        }
        .eyebrow { display:inline-flex; align-items:center; gap:7px; color:#16834f; font-size:10px; font-weight:800; letter-spacing:.13em; }
        .glass-panel {
          border:1px solid rgba(226,232,240,.92); border-radius:16px;
          background:rgba(255,255,255,.94); box-shadow:0 8px 28px rgba(25,42,35,.045);
          backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px);
        }
        .panel-heading { border-bottom:1px solid #edf0ef; background:rgba(255,255,255,.86); }
        .back-button {
          display:flex; width:38px; height:38px; flex-shrink:0; align-items:center; justify-content:center;
          border:1px solid #dce4df; border-radius:10px; background:#fff; color:#64746b;
          transition:border-color 160ms ease,background 160ms ease,color 160ms ease,transform 160ms ease;
        }
        .back-button:hover { border-color:#b9d5c3; background:#f1f8f3; color:#16834f; transform:translateX(-2px); }
        .primary-button {
          display:inline-flex; min-height:42px; align-items:center; justify-content:center; gap:8px;
          border:1px solid #16834f; border-radius:10px; background:#16834f; padding:10px 19px;
          color:#fff; font-size:12px; font-weight:700; box-shadow:0 3px 8px rgba(22,131,79,.14);
          transition:background 160ms ease,box-shadow 160ms ease,transform 160ms ease;
        }
        .primary-button:hover:not(:disabled) { transform:translateY(-1px); background:#116b40; box-shadow:0 6px 14px rgba(22,131,79,.2); }
        .primary-button:disabled { cursor:not-allowed; opacity:.58; }
        .cancel-button {
          display:inline-flex; min-height:42px; align-items:center; justify-content:center;
          border:1px solid #dce4df; border-radius:10px; background:#fff; padding:10px 19px;
          color:#52615a; font-size:12px; font-weight:700;
          transition:border-color 160ms ease,background 160ms ease,color 160ms ease;
        }
        .cancel-button:hover { border-color:#b9c9c0; background:#f6faf7; color:#244b36; }
        .section-icon { display:flex; width:38px; height:38px; flex-shrink:0; align-items:center; justify-content:center; border-radius:11px; }
        .blue-icon,.purple-icon,.cyan-icon { color:#16834f; background:#edf6f0; }
        .form-section-heading { display:flex; align-items:center; gap:12px; }
        .section-number {
          display:flex; width:32px; height:32px; flex-shrink:0; align-items:center; justify-content:center;
          border:1px solid #dcebe1; border-radius:9px; background:#f1f8f3; color:#16834f; font-size:10px; font-weight:800;
        }
        .form-label { display:block; margin-bottom:8px; color:#39483f; font-size:12px; font-weight:700; }
        .required-mark { margin-left:4px; color:#dc6262; }
        .form-input {
          display:block; box-sizing:border-box; width:100%; min-width:0; min-height:44px;
          border:1px solid #dce3df; border-radius:10px; background:rgba(255,255,255,.98);
          padding:10px 13px; color:#1e293b; font-size:13px; line-height:22px; outline:none;
          transition:border-color 160ms ease,box-shadow 160ms ease;
        }
        .form-input:focus { border-color:#16834f; box-shadow:0 0 0 3px rgba(22,131,79,.1); }
        .form-input::placeholder { color:#9aa69f; }
        .form-input option { color:#1e293b; background:#fff; }
        .input-with-icon { position:relative; display:block; min-width:0; }
        .input-icon {
          position:absolute; top:50%; left:13px; z-index:2; display:block; width:16px; height:16px;
          transform:translateY(-50%); color:#87958d; pointer-events:none;
        }
        .form-input.has-leading-icon { padding-left:44px !important; }
        .interval-select-wrap {
          display:flex; align-items:center; gap:12px; min-width:0;
          min-height:44px; padding:0 12px; border:1px solid #dce3df; border-radius:10px;
          background:rgba(255,255,255,.98); transition:border-color 160ms ease,box-shadow 160ms ease;
        }
        .interval-select-wrap:focus-within {
          border-color:#16834f; box-shadow:0 0 0 3px rgba(22,131,79,.1);
        }
        .interval-select-icon {
          display:inline-flex; flex:0 0 18px; width:18px; height:18px; align-items:center; justify-content:center;
          color:#87958d; pointer-events:none;
        }
        .interval-select-icon svg { display:block; width:18px; height:18px; stroke-width:1.8; }
        .interval-select.form-input {
          flex:1 1 auto; width:100%; min-width:0; min-height:42px; height:42px;
          padding:8px 28px 8px 0; border:0; border-radius:0; background:transparent; box-shadow:none;
        }
        .interval-select.form-input:focus { border:0; box-shadow:none; outline:none; }
        .form-hint { min-height:16px; margin-top:7px; color:#87938c; font-size:11px; line-height:1.5; }
        .form-divider { height:1px; background:#e9eeeb; }
        .threshold-info {
          display:flex; align-items:flex-start; gap:10px; border:1px solid #dcebe1;
          border-radius:11px; background:#f2f8f4; padding:12px 14px; color:#557263; font-size:11px; line-height:1.6;
        }
        .info-step { display:flex; align-items:flex-start; gap:12px; }
        .info-step-icon {
          display:flex; width:32px; height:32px; flex-shrink:0; align-items:center; justify-content:center;
          border:1px solid #dcebe1; border-radius:9px; background:#f1f8f3; color:#16834f;
        }
        .summary-row {
          display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1.4fr); align-items:start; gap:12px;
          border-bottom:1px solid #edf0ee; padding-bottom:10px; font-size:11px;
        }
        .summary-row:last-child { border-bottom:none; padding-bottom:0; }
        .summary-row span { color:#87938c; }
        .summary-row strong { min-width:0; color:#33443a; font-weight:700; text-align:right; overflow-wrap:anywhere; }
        .summary-value-url { display:-webkit-box; overflow:hidden; -webkit-box-orient:vertical; -webkit-line-clamp:2; }
        .security-note { border:1px solid #d4e9dc; border-radius:14px; background:rgba(240,248,243,.96); padding:16px; }
        button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible { outline:3px solid rgba(22,131,79,.2); outline-offset:2px; }
        @media (max-width:1279px) { .pulsewatch-new-monitor .dashboard-market-backdrop { opacity:.7; } }
        @media (max-width:639px) {
          .glass-panel { border-radius:13px; }
          .pulsewatch-new-monitor .dashboard-market-backdrop { opacity:.56; }
          .form-hint { min-height:0; }
        }
        @media (prefers-reduced-motion:reduce) {
          .primary-button,.cancel-button,.back-button { transition:none; }
          .primary-button:hover,.back-button:hover { transform:none; }
        }
      `}</style>
    </div>
  );
}
