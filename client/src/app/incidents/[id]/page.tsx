
'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  XCircle,
  Activity,
  CalendarClock,
  ShieldCheck,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

import { Sidebar } from '@/components/sidebar';
import { api, type AuthUser } from '@/lib/api';

type IncidentDetails = {
  id: string;
  title: string;
  message: string | null;
  status: string;
  started_at: string;
  resolved_at: string | null;
  acknowledged_at: string | null;
  resolution_note: string | null;
  monitor_name: string;
  monitor_url: string;
};

type IncidentCheck = {
  id: string;
  status: string;
  status_code: number | null;
  latency_ms: number | null;
  error: string | null;
  checked_at: string;
};

function formatDate(value: string | null) {
  if (!value) return 'Ongoing';

  const date = new Date(
    value.includes('T') ? value : `${value.replace(' ', 'T')}Z`,
  );

  return Number.isNaN(date.getTime())
    ? 'Unknown'
    : date.toLocaleString();
}

function getStatusStyles(status: string) {
  switch (status.toUpperCase()) {
    case 'RESOLVED':
      return {
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500',
        icon: CheckCircle2,
        label: 'Resolved',
      };

    case 'ACKNOWLEDGED':
      return {
        badge: 'bg-blue-50 text-blue-700 border-blue-200',
        dot: 'bg-blue-500',
        icon: ShieldCheck,
        label: 'Acknowledged',
      };

    default:
      return {
        badge: 'bg-rose-50 text-rose-700 border-rose-200',
        dot: 'bg-rose-500',
        icon: AlertCircle,
        label: status || 'Open',
      };
  }
}

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
          <filter id="incident-detail-market-line-blur" x="-20%" y="-100%" width="140%" height="300%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
          <filter id="incident-detail-market-line-soft-blur" x="-20%" y="-100%" width="140%" height="300%">
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
        <g filter="url(#incident-detail-market-line-blur)" opacity=".24" strokeWidth="18" strokeLinecap="round">
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
        <g filter="url(#incident-detail-market-line-soft-blur)" opacity=".32" strokeWidth="7" strokeLinecap="round">
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


export default function IncidentDetailsPage() {
  const params = useParams<{ id: string }>();
  const incidentId = params.id;

  const [user, setUser] = useState<AuthUser | null>(null);
  const [incident, setIncident] = useState<IncidentDetails | null>(null);
  const [checks, setChecks] = useState<IncidentCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const storedUser = localStorage.getItem('pulsewatch_user');

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser) as AuthUser);
      } catch {
        localStorage.removeItem('pulsewatch_user');
      }
    }

    const controller = new AbortController();

    Promise.all([
      api<IncidentDetails>(
        `/incidents/${encodeURIComponent(incidentId)}`,
        { signal: controller.signal },
      ),
      api<IncidentCheck[]>(
        `/incidents/${encodeURIComponent(incidentId)}/history`,
        { signal: controller.signal },
      ),
    ])
      .then(([incidentData, checkData]) => {
        setIncident(incidentData);
        setChecks(checkData);
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load incident details.',
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [incidentId]);

  const statusStyles = incident
    ? getStatusStyles(incident.status)
    : null;

  const StatusIcon = statusStyles?.icon;

  return (
    <div className="pulsewatch-page relative isolate flex min-h-screen flex-col md:flex-row">
      <AmbientMarketBackdrop />

      <Sidebar user={user} />

      <main className="incident-details-main relative z-10 flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="page-header incident-details-header px-5 py-6">
          <Link
            href="/incidents"
            className="back-link mb-5 inline-flex items-center gap-2 text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to incidents
          </Link>

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2">
                <span className="eyebrow">
                  <Activity className="h-3.5 w-3.5" />
                  INCIDENT MANAGEMENT
                </span>
              </div>

              <h1 className="break-words text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {incident?.title ?? 'Incident details'}
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Review incident information, monitor activity, and recorded
                health checks.
              </p>
            </div>

            {statusStyles && StatusIcon && (
              <div
                className={`inline-flex w-fit shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold ${statusStyles.badge}`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${statusStyles.dot}`}
                />
                <StatusIcon className="h-3.5 w-3.5" />
                {statusStyles.label}
              </div>
            )}
          </div>
        </header>

        <div className="incident-details-content space-y-6 pb-10 pt-6">
          {/* Error state */}
          {error && (
            <div
              role="alert"
              className="glass-panel flex items-start gap-3 border border-rose-200/80 bg-rose-50/80 px-4 py-4"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
              <div>
                <p className="text-sm font-semibold text-rose-800">
                  Unable to load incident
                </p>
                <p className="mt-1 text-sm text-rose-700">{error}</p>
              </div>
            </div>
          )}

          {/* Loading state */}
          {loading ? (
            <div className="glass-panel flex min-h-72 flex-col items-center justify-center gap-4">
              <div className="loading-icon">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-800">
                  Loading incident details
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Retrieving incident information and check history...
                </p>
              </div>
            </div>
          ) : incident ? (
            <>
              {/* Incident overview */}
              <section className="glass-panel overflow-hidden">
                <div className="panel-heading flex items-center justify-between gap-3 px-5 py-5 sm:px-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="section-icon blue-icon">
                        <Activity className="h-4 w-4" />
                      </div>
                      <h2 className="text-base font-bold text-slate-900">
                        Incident overview
                      </h2>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Key information about this monitoring incident.
                    </p>
                  </div>

                  <Sparkles className="h-5 w-5 text-violet-400" />
                </div>

                <div className="incident-overview-grid grid grid-cols-1 gap-0 sm:grid-cols-2">
                  {/* Monitor */}
                  <div className="detail-cell">
                    <p className="detail-label">MONITOR</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {incident.monitor_name}
                    </p>

                    <a
                      className="mt-2 inline-flex max-w-full items-center gap-1.5 break-all text-xs font-medium text-blue-600 transition hover:text-blue-800"
                      href={incident.monitor_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span className="truncate">
                        {incident.monitor_url}
                      </span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    </a>
                  </div>

                  {/* Status */}
                  <div className="detail-cell">
                    <p className="detail-label">INCIDENT STATUS</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${statusStyles?.dot ?? 'bg-slate-400'}`}
                      />
                      <span className="text-sm font-semibold text-slate-900">
                        {incident.status}
                      </span>
                    </div>
                  </div>

                  {/* Started */}
                  <div className="detail-cell">
                    <p className="detail-label">STARTED AT</p>
                    <div className="mt-2 flex items-center gap-2 text-sm text-slate-700">
                      <CalendarClock className="h-4 w-4 text-blue-500" />
                      {formatDate(incident.started_at)}
                    </div>
                  </div>

                  {/* Resolved */}
                  <div className="detail-cell">
                    <p className="detail-label">RESOLVED AT</p>
                    <div className="mt-2 flex items-center gap-2 text-sm text-slate-700">
                      {incident.resolved_at ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Clock className="h-4 w-4 text-amber-500" />
                      )}
                      {formatDate(incident.resolved_at)}
                    </div>
                  </div>

                  {/* Acknowledged */}
                  {incident.acknowledged_at && (
                    <div className="detail-cell sm:col-span-2">
                      <p className="detail-label">ACKNOWLEDGED AT</p>
                      <div className="mt-2 flex items-center gap-2 text-sm text-slate-700">
                        <ShieldCheck className="h-4 w-4 text-blue-500" />
                        {formatDate(incident.acknowledged_at)}
                      </div>
                    </div>
                  )}

                  {/* Details */}
                  {incident.message && (
                    <div className="detail-cell sm:col-span-2">
                      <p className="detail-label">INCIDENT DESCRIPTION</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                        {incident.message}
                      </p>
                    </div>
                  )}

                  {/* Resolution note */}
                  {incident.resolution_note && (
                    <div className="detail-cell sm:col-span-2">
                      <p className="detail-label">RESOLUTION NOTE</p>
                      <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                          <p className="whitespace-pre-wrap text-sm leading-6 text-emerald-800">
                            {incident.resolution_note}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Checks history */}
              <section className="glass-panel overflow-hidden">
                <div className="panel-heading flex flex-col justify-between gap-3 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="section-icon purple-icon">
                        <Clock className="h-4 w-4" />
                      </div>
                      <h2 className="text-base font-bold text-slate-900">
                        Checks during incident
                      </h2>
                    </div>

                    <p className="mt-2 text-xs text-slate-500">
                      Recorded checks from incident start through resolution.
                    </p>
                  </div>

                  <div className="inline-flex w-fit items-center gap-2 rounded-full border border-violet-100 bg-violet-50/80 px-3 py-1.5 text-xs font-semibold text-violet-700">
                    <Activity className="h-3.5 w-3.5" />
                    {checks.length} {checks.length === 1 ? 'check' : 'checks'}
                  </div>
                </div>

                {checks.length ? (
                  <>
                    {/* Desktop table header */}
                    <div className="hidden grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(110px,.8fr)] gap-4 border-b border-slate-100 bg-slate-50/70 px-6 py-3 lg:grid">
                      <span className="detail-label">CHECK RESULT</span>
                      <span className="detail-label">TIMESTAMP / ERROR</span>
                      <span className="detail-label text-right">
                        RESPONSE TIME
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100/80">
                      {checks.map((check) => {
                        const isUp = check.status === 'UP';

                        return (
                          <div
                            key={check.id}
                            className="check-row grid grid-cols-1 gap-3 px-5 py-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(110px,.8fr)] lg:items-center lg:gap-4 lg:px-6"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                                  isUp
                                    ? 'bg-emerald-50 text-emerald-600'
                                    : 'bg-rose-50 text-rose-600'
                                }`}
                              >
                                {isUp ? (
                                  <CheckCircle2 className="h-4 w-4" />
                                ) : (
                                  <XCircle className="h-4 w-4" />
                                )}
                              </div>

                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-semibold text-slate-800">
                                    {check.status}
                                  </p>

                                  {check.status_code && (
                                    <span className="rounded-md border border-slate-200 bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                                      HTTP {check.status_code}
                                    </span>
                                  )}
                                </div>

                                <p className="mt-1 text-xs text-slate-400 lg:hidden">
                                  {formatDate(check.checked_at)}
                                </p>
                              </div>
                            </div>

                            <div className="min-w-0 sm:pr-2">
                              <p
                                className={`break-words text-xs leading-5 ${
                                  check.error
                                    ? 'text-rose-600'
                                    : 'text-slate-500'
                                }`}
                              >
                                {check.error || formatDate(check.checked_at)}
                              </p>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 lg:hidden">
                                Latency
                              </span>

                              <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold tabular-nums text-slate-600">
                                <Clock className="h-3.5 w-3.5 text-violet-500" />
                                {check.latency_ms == null
                                  ? '—'
                                  : `${check.latency_ms} ms`}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
                    <div className="empty-icon">
                      <Clock className="h-6 w-6 text-violet-500" />
                    </div>
                    <h3 className="mt-4 text-sm font-semibold text-slate-800">
                      No checks available
                    </h3>
                    <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
                      There are no recorded health checks available for this
                      incident.
                    </p>
                  </div>
                )}
              </section>
            </>
          ) : !error ? (
            <div className="glass-panel flex min-h-64 flex-col items-center justify-center px-5 text-center">
              <div className="empty-icon">
                <AlertCircle className="h-6 w-6 text-rose-500" />
              </div>
              <h2 className="mt-4 text-base font-bold text-slate-800">
                Incident not found
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                This incident may have been removed or is no longer available.
              </p>
              <Link
                href="/incidents"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5 hover:bg-blue-700"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Return to incidents
              </Link>
            </div>
          ) : null}

          <footer className="pb-2 pt-2 text-center text-[11px] text-slate-400">
            PulseWatch · Incident monitoring and reliability
          </footer>
        </div>
      </main>

      <style jsx global>{`
        .pulsewatch-page {
          position: relative;
          isolation: isolate;
          min-height: 100dvh;
          background: #f6f8fa;
          color: #172033;
        }

        /* Sidebar renders its own responsive spacer. Do not add a second
           sidebar offset here or the page will have a large empty gutter. */
        .incident-details-main {
          flex: 1 1 0%;
          width: auto;
          min-width: 0;
          min-height: 100dvh;
          margin-left: 0;
          overflow-x: clip;
          background: transparent;
        }

        .incident-details-content {
          width: 100%;
          max-width: 1440px;
          min-width: 0;
          margin-inline: auto;
          padding-left: clamp(16px, 2.5vw, 40px);
          padding-right: clamp(16px, 2.5vw, 40px);
        }

        .incident-details-header {
          padding-left: clamp(16px, 2.5vw, 40px);
          padding-right: clamp(16px, 2.5vw, 40px);
          border-bottom: 1px solid #e7eceb;
          background: rgba(255,255,255,.86);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }

        .dashboard-market-backdrop {
          position: fixed;
          inset: 18vh 0 auto 15rem;
          z-index: 0;
          height: clamp(620px, 78vh, 920px);
          min-height: 620px;
          max-height: 920px;
          overflow: hidden;
          pointer-events: none;
          mask-image: linear-gradient(to bottom, #000 0%, rgba(0,0,0,.82) 62%, rgba(0,0,0,.3) 86%, transparent 100%);
          -webkit-mask-image: linear-gradient(to bottom, #000 0%, rgba(0,0,0,.82) 62%, rgba(0,0,0,.3) 86%, transparent 100%);
        }

        .pulsewatch-page:has(.sidebar-desktop--collapsed) .dashboard-market-backdrop {
          left: 4rem;
        }

        .dashboard-market-backdrop svg {
          display: block;
          width: 100%;
          height: 100%;
          overflow: visible;
        }

        .dashboard-market-backdrop .market-grid line {
          stroke: #dce5e8;
          stroke-width: 1;
          stroke-dasharray: 2 8;
          opacity: .62;
        }

        .glass-panel {
          min-width: 0;
          overflow: hidden;
          border: 1px solid rgba(226,232,240,.9);
          border-radius: 18px;
          background: rgba(255,255,255,.88);
          box-shadow: 0 8px 28px rgba(23,32,51,.045);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
        }

        .panel-heading {
          border-bottom: 1px solid #e8edf0;
          background: rgba(255,255,255,.72);
        }

        .section-icon {
          display: inline-flex;
          width: 34px;
          height: 34px;
          flex: 0 0 34px;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
        }

        .blue-icon { color: #16834f; background: #e8f4ed; }
        .purple-icon { color: #64748b; background: #eef2f5; }

        .incident-overview-grid { grid-template-columns: minmax(0, 1fr); }

        .detail-cell {
          min-width: 0;
          padding: 20px 24px;
          border-bottom: 1px solid #e8edf0;
        }

        .detail-cell[class~="sm:col-span-2"] {
          grid-column: 1 / -1;
          border-right: 0;
        }

        .check-table-header,
        .check-row {
          grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr) minmax(112px, .75fr);
        }

        .detail-label {
          color: #8993a3;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: .12em;
        }

        .detail-cell > div,
        .detail-cell > p,
        .detail-cell a { min-width: 0; }

        .loading-icon,
        .empty-icon {
          display: flex;
          width: 54px;
          height: 54px;
          flex: 0 0 54px;
          align-items: center;
          justify-content: center;
          border: 1px solid #e5ece8;
          border-radius: 16px;
          background: #edf5f0;
        }

        .check-row { min-width: 0; transition: background 160ms ease; }
        .check-row:hover { background: rgba(241,247,243,.8); }

        .back-link {
          color: #64748b;
          transition: color 160ms ease, transform 160ms ease;
        }
        .back-link:hover { color: #16834f; transform: translateX(-2px); }

        .eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #527565;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .13em;
        }

        .incident-details-main a,
        .incident-details-main button { -webkit-tap-highlight-color: transparent; }

        .incident-details-main :focus-visible {
          outline: 3px solid rgba(22,131,79,.28);
          outline-offset: 2px;
        }

        @media (min-width: 768px) {
          .incident-overview-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .detail-cell:nth-child(odd):not([class~="sm:col-span-2"]) {
            border-right: 1px solid #e8edf0;
          }
          .detail-cell:last-child { border-bottom: 0; }
        }

        @media (max-width: 767px) {
          .incident-details-main {
            width: 100%;
            min-height: 100dvh;
            padding-bottom: 4.5rem;
            overflow-x: clip;
          }
          .dashboard-market-backdrop {
            inset: 18vh 0 auto 0;
            height: clamp(560px, 72vh, 760px);
            min-height: 560px;
          }
          .check-table-header { display: none !important; }
          .check-row { grid-template-columns: minmax(0, 1fr) !important; }
        }

        @media (max-width: 639px) {
          .incident-details-header { padding-top: 18px; padding-bottom: 18px; }
          .detail-cell {
            padding: 16px 18px;
            border-right: 0 !important;
          }
          .detail-cell:last-child { border-bottom: 0; }
          .check-row { padding-left: 16px; padding-right: 16px; }
          .incident-details-main .glass-panel { border-radius: 15px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .check-row, .back-link { transition: none; }
        }
      `}</style>
    </div>
  );
}
