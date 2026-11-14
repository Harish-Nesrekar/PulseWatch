
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  XCircle,
  ShieldCheck,
  Clock3,
  Server,
  CalendarClock,
} from 'lucide-react';

import { statusPagesApi, type PublicStatusPage } from '@/lib/api';

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
          <filter id="public-status-market-line-blur" x="-20%" y="-100%" width="140%" height="300%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
          <filter id="public-status-market-line-soft-blur" x="-20%" y="-100%" width="140%" height="300%">
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
        <g filter="url(#public-status-market-line-blur)" opacity=".24" strokeWidth="18" strokeLinecap="round">
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
        <g filter="url(#public-status-market-line-soft-blur)" opacity=".32" strokeWidth="7" strokeLinecap="round">
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


function formatDate(value: string | null) {
  if (!value) return 'Ongoing';

  const date = new Date(
    value.includes('T') ? value : `${value.replace(' ', 'T')}Z`
  );

  return Number.isNaN(date.getTime())
    ? 'Unknown time'
    : date.toLocaleString();
}

export default function PublicStatusPageView() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [page, setPage] = useState<PublicStatusPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;

    const controller = new AbortController();

    statusPagesApi
      .getPublic(slug, controller.signal)
      .then(setPage)
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load this status page.'
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [slug]);

  const isDown =
    page?.monitors.some((monitor) => monitor.status === 'DOWN') ?? false;

  const hasMonitors = (page?.monitors.length ?? 0) > 0;

  const allOperational =
    hasMonitors &&
    (page?.monitors.every((monitor) => monitor.status === 'UP') ?? false);

  const heading = isDown
    ? 'Some services are experiencing issues'
    : allOperational
      ? 'All monitored services are operational'
      : 'Service status is not yet available';

  const statusDescription = isDown
    ? 'We are aware of an issue affecting one or more monitored services.'
    : allOperational
      ? 'All services included on this status page are currently operating normally.'
      : 'We are checking the status of the services listed below.';

  return (
    <main className="public-status-page relative min-h-screen overflow-hidden px-4 py-7 text-slate-800 sm:px-6 sm:py-10 lg:px-8">
      <AmbientMarketBackdrop />

      <div className="relative z-10 mx-auto w-full max-w-4xl">
        {/* Header */}
        <header className="mb-8 flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="status-brand-icon">
              <Activity className="h-5 w-5 text-white" />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                PulseWatch Status
              </p>

              <h1 className="mt-1 truncate text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
                {page?.name ?? 'Status page'}
              </h1>
            </div>
          </div>

          <div className="hidden shrink-0 items-center gap-2 rounded-full border border-white/80 bg-white/60 px-3 py-2 text-[10px] font-semibold text-slate-500 shadow-sm sm:flex">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            Public status
          </div>
        </header>

        {/* Loading */}
        {loading ? (
          <section className="status-glass-panel flex min-h-64 flex-col items-center justify-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            </div>

            <div className="text-center">
              <h2 className="text-sm font-bold text-slate-700">
                Loading service status
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Retrieving the latest available status information...
              </p>
            </div>
          </section>
        ) : error || !page ? (
          /* Unavailable */
          <section className="status-glass-panel px-6 py-14 text-center sm:px-10">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50">
              <AlertTriangle className="h-6 w-6 text-rose-500" />
            </div>

            <h2 className="text-lg font-bold text-slate-800">
              Status page unavailable
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              {error ||
                'This page does not exist or is not published.'}
            </p>
          </section>
        ) : (
          <>
            {/* Overall service status */}
            <section
              className={`overall-status ${
                isDown
                  ? 'overall-status-down'
                  : allOperational
                    ? 'overall-status-up'
                    : 'overall-status-unknown'
              }`}
            >
              <div
                className={`overall-status-icon ${
                  isDown
                    ? 'overall-icon-down'
                    : allOperational
                      ? 'overall-icon-up'
                      : 'overall-icon-unknown'
                }`}
              >
                {isDown ? (
                  <AlertTriangle className="h-6 w-6" />
                ) : allOperational ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : (
                  <Activity className="h-6 w-6" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span
                    className={`status-eyebrow ${
                      isDown
                        ? 'text-rose-600'
                        : allOperational
                          ? 'text-emerald-600'
                          : 'text-slate-500'
                    }`}
                  >
                    CURRENT SYSTEM STATUS
                  </span>

                  <span
                    className={`status-live-dot ${
                      isDown
                        ? 'bg-rose-500'
                        : allOperational
                          ? 'bg-emerald-500'
                          : 'bg-slate-400'
                    }`}
                  />
                </div>

                <h2 className="text-base font-extrabold leading-snug text-slate-900 sm:text-lg">
                  {heading}
                </h2>

                <p className="mt-1 text-xs leading-5 text-slate-600">
                  {statusDescription}
                </p>
              </div>
            </section>

            {/* Summary */}
            <section className="my-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="summary-card">
                <div className="summary-icon bg-emerald-50 text-emerald-700">
                  <Server className="h-4 w-4" />
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Services
                  </p>

                  <p className="mt-1 text-xl font-extrabold tabular-nums text-slate-800">
                    {page.monitors.length}
                  </p>
                </div>
              </div>

              <div className="summary-card">
                <div className="summary-icon bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Operational
                  </p>

                  <p className="mt-1 text-xl font-extrabold tabular-nums text-slate-800">
                    {
                      page.monitors.filter(
                        (monitor) => monitor.status === 'UP'
                      ).length
                    }
                  </p>
                </div>
              </div>

              <div className="summary-card col-span-2 sm:col-span-1">
                <div className="summary-icon bg-rose-50 text-rose-600">
                  <AlertTriangle className="h-4 w-4" />
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Experiencing issues
                  </p>

                  <p className="mt-1 text-xl font-extrabold tabular-nums text-slate-800">
                    {
                      page.monitors.filter(
                        (monitor) => monitor.status === 'DOWN'
                      ).length
                    }
                  </p>
                </div>
              </div>
            </section>

            {/* Services */}
            <section className="status-glass-panel mb-6 overflow-hidden">
              <div className="section-header">
                <div className="section-heading-icon bg-emerald-50 text-emerald-700">
                  <Server className="h-4 w-4" />
                </div>

                <div>
                  <h2 className="text-sm font-bold text-slate-800">
                    Services
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-400">
                    Current health of monitored services
                  </p>
                </div>

                <span className="ml-auto rounded-full border border-slate-200 bg-white/70 px-2.5 py-1 text-[10px] font-bold text-slate-500">
                  {page.monitors.length} total
                </span>
              </div>

              {page.monitors.length ? (
                <div className="divide-y divide-slate-100/90">
                  {page.monitors.map((monitor, index) => (
                    <div
                      key={`${monitor.name}-${index}`}
                      className="service-row"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={`service-indicator ${
                            monitor.status === 'UP'
                              ? 'service-indicator-up'
                              : monitor.status === 'DOWN'
                                ? 'service-indicator-down'
                                : 'service-indicator-unknown'
                          }`}
                        >
                          {monitor.status === 'UP' ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : monitor.status === 'DOWN' ? (
                            <XCircle className="h-4 w-4" />
                          ) : (
                            <Activity className="h-4 w-4" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-800">
                            {monitor.name}
                          </p>

                          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                            <Clock3 className="h-3 w-3" />
                            Last checked: {formatDate(monitor.last_checked_at)}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`status-pill ${
                          monitor.status === 'UP'
                            ? 'status-pill-up'
                            : monitor.status === 'DOWN'
                              ? 'status-pill-down'
                              : 'status-pill-unknown'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            monitor.status === 'UP'
                              ? 'bg-emerald-500'
                              : monitor.status === 'DOWN'
                                ? 'bg-rose-500'
                                : 'bg-slate-400'
                          }`}
                        />

                        {monitor.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-12 text-center">
                  <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100">
                    <Server className="h-5 w-5 text-slate-400" />
                  </div>

                  <h3 className="text-sm font-semibold text-slate-700">
                    No services yet
                  </h3>

                  <p className="mt-1 text-xs text-slate-400">
                    No active services are associated with this page.
                  </p>
                </div>
              )}
            </section>

            {/* Incident history */}
            <section className="status-glass-panel overflow-hidden">
              <div className="section-header">
                <div className="section-heading-icon bg-amber-50 text-amber-600">
                  <CalendarClock className="h-4 w-4" />
                </div>

                <div>
                  <h2 className="text-sm font-bold text-slate-800">
                    Incident history
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-400">
                    Service disruptions and their resolution status
                  </p>
                </div>

                <span className="ml-auto rounded-full border border-slate-200 bg-white/70 px-2.5 py-1 text-[10px] font-bold text-slate-500">
                  {page.incidents.length} total
                </span>
              </div>

              {page.incidents.length ? (
                <div className="divide-y divide-slate-100/90">
                  {page.incidents.map((incident) => (
                    <article key={incident.id} className="incident-row">
                      <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-800">
                            {incident.title}
                          </h3>

                          <span
                            className={`incident-pill ${
                              incident.status === 'RESOLVED'
                                ? 'incident-pill-resolved'
                                : 'incident-pill-active'
                            }`}
                          >
                            {incident.status}
                          </span>
                        </div>

                        <p className="text-xs font-medium text-slate-500">
                          {incident.monitor_name}
                        </p>

                        <div className="flex flex-col gap-1 text-[11px] text-slate-400 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                          <span className="inline-flex items-center gap-1">
                            <Clock3 className="h-3 w-3" />
                            Started {formatDate(incident.started_at)}
                          </span>

                          <span className="hidden text-slate-300 sm:inline">
                            ·
                          </span>

                          <span className="inline-flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Resolved {formatDate(incident.resolved_at)}
                          </span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-12 text-center">
                  <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  </div>

                  <h3 className="text-sm font-semibold text-slate-700">
                    No incidents recorded
                  </h3>

                  <p className="mt-1 text-xs text-slate-400">
                    There is no incident history available for this page.
                  </p>
                </div>
              )}
            </section>

            {/* Footer */}
            <footer className="mt-8 flex flex-col items-center justify-center gap-2 pb-4 text-center">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <Activity className="h-3.5 w-3.5 text-emerald-600" />
                Powered by PulseWatch
              </div>

              <p className="text-[10px] text-slate-400">
                Service status data is provided by PulseWatch.
              </p>
            </footer>
          </>
        )}
      </div>

      <style jsx global>{`
        .public-status-page {
          isolation: isolate;
          background: #f6f8fa;
          color: #172033;
        }

        .public-status-page .dashboard-market-backdrop {
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

        .public-status-page .dashboard-market-backdrop svg {
          display: block;
          width: 100%;
          height: 100%;
        }

        .public-status-page .market-grid line {
          stroke: rgba(125, 145, 160, .12);
          stroke-width: 1;
          stroke-dasharray: 2 8;
        }

        .status-brand-icon {
          display: flex;
          width: 42px;
          height: 42px;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 255, 255, 0.5);
          border-radius: 13px;
          background: #16834f;
          box-shadow: 0 6px 16px rgba(22, 131, 79, 0.16);
        }

        .status-glass-panel {
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.9);
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.77);
          box-shadow:
            0 15px 45px rgba(64, 77, 130, 0.055),
            0 2px 8px rgba(64, 77, 130, 0.02),
            inset 0 1px 0 rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
        }

        .overall-status {
          display: flex;
          min-width: 0;
          align-items: center;
          gap: 15px;
          border: 1px solid transparent;
          border-radius: 19px;
          padding: 20px;
          box-shadow: 0 10px 30px rgba(64, 77, 130, 0.045);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }

        .overall-status-up {
          border-color: rgba(167, 243, 208, 0.8);
          background: rgba(236, 253, 245, 0.82);
        }

        .overall-status-down {
          border-color: rgba(254, 205, 211, 0.9);
          background: rgba(255, 241, 242, 0.86);
        }

        .overall-status-unknown {
          border-color: rgba(203, 213, 225, 0.75);
          background: rgba(255, 255, 255, 0.76);
        }

        .overall-status-icon {
          display: flex;
          width: 48px;
          height: 48px;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          border-radius: 15px;
        }

        .overall-icon-up {
          background: #d1fae5;
          color: #059669;
        }

        .overall-icon-down {
          background: #ffe4e6;
          color: #e11d48;
        }

        .overall-icon-unknown {
          background: #f1f5f9;
          color: #64748b;
        }

        .status-eyebrow {
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.12em;
        }

        .status-live-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .summary-card {
          display: flex;
          min-width: 0;
          align-items: center;
          gap: 12px;
          border: 1px solid rgba(255, 255, 255, 0.9);
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.7);
          padding: 15px;
          box-shadow: 0 8px 25px rgba(64, 77, 130, 0.035);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }

        .summary-icon {
          display: flex;
          width: 36px;
          height: 36px;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          border-radius: 11px;
        }

        .section-header {
          display: flex;
          min-width: 0;
          min-height: 72px;
          align-items: center;
          gap: 12px;
          border-bottom: 1px solid rgba(226, 232, 240, 0.8);
          padding: 15px 20px;
        }

        .section-heading-icon {
          display: flex;
          width: 36px;
          height: 36px;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          border-radius: 11px;
        }

        .service-row {
          display: flex;
          min-width: 0;
          min-height: 76px;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 15px 20px;
          transition: background 160ms ease;
        }

        .service-row:hover {
          background: rgba(248, 250, 252, 0.75);
        }

        .service-indicator {
          display: flex;
          width: 38px;
          height: 38px;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
        }

        .service-indicator-up {
          background: #ecfdf5;
          color: #059669;
        }

        .service-indicator-down {
          background: #fff1f2;
          color: #e11d48;
        }

        .service-indicator-unknown {
          background: #f1f5f9;
          color: #64748b;
        }

        .status-pill,
        .incident-pill {
          display: inline-flex;
          flex-shrink: 0;
          align-items: center;
          gap: 7px;
          border: 1px solid transparent;
          border-radius: 999px;
          padding: 5px 10px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.02em;
        }

        .status-pill-up,
        .incident-pill-resolved {
          border-color: #bbf7d0;
          background: #ecfdf5;
          color: #047857;
        }

        .status-pill-down {
          border-color: #fecdd3;
          background: #fff1f2;
          color: #be123c;
        }

        .status-pill-unknown {
          border-color: #e2e8f0;
          background: #f8fafc;
          color: #64748b;
        }

        .incident-row {
          display: flex;
          min-width: 0;
          gap: 12px;
          padding: 18px 20px;
          transition: background 160ms ease;
        }

        .incident-row:hover {
          background: rgba(248, 250, 252, 0.75);
        }

        .incident-pill-active {
          border-color: #fde68a;
          background: #fffbeb;
          color: #b45309;
        }


        @media (max-width: 480px) {
          .overall-status {
            align-items: flex-start;
            gap: 12px;
            padding: 16px;
          }

          .overall-status-icon {
            width: 42px;
            height: 42px;
          }

          .section-header {
            padding: 13px 15px;
          }

          .service-row,
          .incident-row {
            padding-right: 15px;
            padding-left: 15px;
          }
        }


        @media (max-width: 640px) {
          .public-status-page .dashboard-market-backdrop {
            inset-block-start: 12vh;
            height: 620px;
            min-height: 620px;
          }

          .public-status-page header {
            align-items: flex-start;
          }

          .summary-card {
            padding: 12px;
            gap: 9px;
          }

          .section-header {
            flex-wrap: wrap;
          }

          .section-header > span {
            margin-left: auto;
          }

          .service-row {
            align-items: flex-start;
            padding: 14px 15px;
          }

          .service-row > span {
            margin-top: 2px;
          }

          .incident-row {
            padding: 16px 15px;
          }
        }

        @media (max-width: 380px) {
          .summary-card {
            align-items: flex-start;
            flex-direction: column;
          }

          .summary-card p {
            overflow-wrap: anywhere;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .service-row,
          .incident-row {
            transition: none;
          }
        }
      `}</style>
    </main>
  );
}
