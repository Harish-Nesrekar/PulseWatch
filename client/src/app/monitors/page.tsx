
'use client';

import { Sidebar } from '@/components/sidebar';
import { api } from '@/lib/api';
import {
  Activity,
  Plus,
  Search,
  Trash2,
  Pause,
  Play,
  ExternalLink,
  Clock,
  Server,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Globe,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Filter,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { ComponentProps } from 'react';

type SidebarUser = ComponentProps<typeof Sidebar>['user'];

type Monitor = {
  id: string;
  name: string;
  url: string;
  method: string;
  interval_seconds: number;
  expected_status: number;
  is_active: boolean | number;
  status: 'UP' | 'DOWN' | 'PENDING' | string;
  last_checked_at: string | null;
  last_status_code: number | null;
  last_latency_ms: number | null;
  consecutive_failures: number;
  created_at: string;
};

function isActive(monitor: Monitor) {
  return monitor.is_active === true || monitor.is_active === 1;
}

function formatDate(value: string | null) {
  if (!value) return 'Never checked';

  // MySQL DATETIME values are stored in UTC.
  const normalizedValue = value.includes('T')
    ? value
    : value.replace(' ', 'T');

  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalizedValue);
  const utcValue = hasTimezone
    ? normalizedValue
    : `${normalizedValue}Z`;

  const date = new Date(utcValue);

  if (Number.isNaN(date.getTime())) return 'Unknown';

  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
}

function getStatusStyle(status: string) {
  switch (status) {
    case 'UP':
      return 'status-up';
    case 'DOWN':
      return 'status-down';
    default:
      return 'status-pending';
  }
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'UP') {
    return <CheckCircle2 className="h-3.5 w-3.5" />;
  }

  if (status === 'DOWN') {
    return <XCircle className="h-3.5 w-3.5" />;
  }

  return <Clock className="h-3.5 w-3.5" />;
}

function normalizeMonitors(data: unknown): Monitor[] {
  if (Array.isArray(data)) return data as Monitor[];

  if (
    data &&
    typeof data === 'object' &&
    'monitors' in data &&
    Array.isArray((data as { monitors: unknown }).monitors)
  ) {
    return (data as { monitors: Monitor[] }).monitors;
  }

  return [];
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
          <filter id="monitors-market-line-blur" x="-20%" y="-100%" width="140%" height="300%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
          <filter id="monitors-market-line-soft-blur" x="-20%" y="-100%" width="140%" height="300%">
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
        <g filter="url(#monitors-market-line-blur)" opacity=".24" strokeWidth="18" strokeLinecap="round">
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
        <g filter="url(#monitors-market-line-soft-blur)" opacity=".32" strokeWidth="7" strokeLinecap="round">
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


export default function MonitorsPage() {
  const [user, setUser] = useState<SidebarUser | null>(null);
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);

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

  const loadMonitors = useCallback(async (showRefresh = false) => {
    if (!showRefresh) setLoading(true);

    setError('');

    try {
      const data = await api<unknown>('/monitors');
      setMonitors(normalizeMonitors(data));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load monitors.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMonitors();
  }, [loadMonitors]);

  const handleToggle = async (monitor: Monitor) => {
    setActionId(monitor.id);
    setError('');

    try {
      await api(`/monitors/${monitor.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          is_active: !isActive(monitor),
        }),
      });

      await loadMonitors(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to update monitor.',
      );
    } finally {
      setActionId(null);
    }
  };

  const handleCheck = async (monitor: Monitor) => {
    setActionId(monitor.id);
    setError('');

    try {
      await api(
        `/monitors/${monitor.id}/check`,
        { method: 'POST' },
      );

      await loadMonitors(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to check this monitor.',
      );
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (monitor: Monitor) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${monitor.name}"? This action cannot be undone.`,
      )
    ) {
      return;
    }

    setActionId(monitor.id);
    setError('');

    try {
      await api(
        `/monitors/${monitor.id}`,
        { method: 'DELETE' },
      );

      setMonitors((current) =>
        current.filter((item) => item.id !== monitor.id),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to delete monitor.',
      );
    } finally {
      setActionId(null);
    }
  };

  const filteredMonitors = monitors.filter((monitor) => {
    const query = search.toLowerCase();

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'PAUSED'
        ? !isActive(monitor)
        : isActive(monitor) && monitor.status === statusFilter);

    return (
      matchesStatus &&
      (
        monitor.name.toLowerCase().includes(query) ||
        monitor.url.toLowerCase().includes(query)
      )
    );
  });

  const pageSize = 10;
  const pageCount = Math.max(
    1,
    Math.ceil(filteredMonitors.length / pageSize),
  );

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, pageCount));
  }, [pageCount]);

  const pageMonitors = filteredMonitors.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const activeCount = monitors.filter(isActive).length;

  const upCount = monitors.filter(
    (monitor) => isActive(monitor) && monitor.status === 'UP',
  ).length;

  const downCount = monitors.filter(
    (monitor) => isActive(monitor) && monitor.status === 'DOWN',
  ).length;

  return (
    <div className="pulsewatch-monitors relative isolate flex min-h-screen flex-col overflow-x-clip bg-[#F6F8FA] text-[#151526] md:flex-row">
      <AmbientMarketBackdrop />

      <div className="relative z-30 md:z-10">
  <Sidebar user={(user ?? {}) as SidebarUser} />
</div>

      <main className="monitors-main relative z-10 flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="page-header sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-10">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="eyebrow">
                <Activity className="h-3.5 w-3.5" />
                MONITORING
              </span>
            </div>

            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Monitors
            </h1>

            <p className="mt-1 text-xs text-slate-500">
              Manage your HTTP and HTTPS endpoint monitoring.
            </p>
          </div>

          <Link href="/monitors/new" className="primary-button">
            <Plus className="h-4 w-4" />
            Add monitor
          </Link>
        </header>

        <div className="monitors-content space-y-6 px-5 pb-10 pt-7 sm:px-8 lg:px-10">
          {/* Error */}
          {error && (
            <div
              role="alert"
              className="glass-panel flex items-start gap-3 border border-rose-200 bg-rose-50/90 px-4 py-3.5"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-rose-800">
                  Something went wrong
                </p>
                <p className="mt-1 break-words text-sm text-rose-700">
                  {error}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setError('')}
                aria-label="Dismiss error"
                className="close-button"
              >
                ×
              </button>
            </div>
          )}

          {/* Summary cards */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-800">
                  Monitoring overview
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Current status across your configured endpoints.
                </p>
              </div>

              <span className="rounded-full border border-white/80 bg-white/60 px-3 py-1.5 text-[11px] font-semibold text-slate-500">
                Live inventory
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="metric-card metric-blue glass-panel">
                <div className="flex items-center justify-between">
                  <p className="metric-label">Total monitors</p>
                  <div className="metric-icon metric-icon-blue">
                    <Server className="h-5 w-5" />
                  </div>
                </div>

                <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
                  {loading ? '—' : monitors.length}
                </p>

                <p className="mt-2 text-[11px] text-slate-400">
                  Configured endpoints
                </p>
              </div>

              <div className="metric-card metric-purple glass-panel">
                <div className="flex items-center justify-between">
                  <p className="metric-label">Active monitors</p>
                  <div className="metric-icon metric-icon-purple">
                    <Activity className="h-5 w-5" />
                  </div>
                </div>

                <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
                  {loading ? '—' : activeCount}
                </p>

                <p className="mt-2 text-[11px] text-slate-400">
                  Currently enabled
                </p>
              </div>

              <div className="metric-card metric-green glass-panel">
                <div className="flex items-center justify-between">
                  <p className="metric-label">Operational</p>
                  <div className="metric-icon metric-icon-green">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                </div>

                <p className="mt-4 text-3xl font-bold tracking-tight text-emerald-600 tabular-nums">
                  {loading ? '—' : upCount}
                </p>

                <p className="mt-2 text-[11px] text-slate-400">
                  Active and responding
                </p>
              </div>

              <div className="metric-card metric-pink glass-panel">
                <div className="flex items-center justify-between">
                  <p className="metric-label">Down</p>
                  <div className="metric-icon metric-icon-pink">
                    <XCircle className="h-5 w-5" />
                  </div>
                </div>

                <p className="mt-4 text-3xl font-bold tracking-tight text-rose-600 tabular-nums">
                  {loading ? '—' : downCount}
                </p>

                <p className="mt-2 text-[11px] text-slate-400">
                  Active endpoints reporting down
                </p>
              </div>
            </div>
          </section>

          {/* Search and filters */}
          <section
            className="monitor-toolbar glass-panel flex flex-col gap-4 p-4 sm:p-5 xl:flex-row xl:items-center xl:justify-between"
            aria-label="Search and filter monitors"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              <div className="monitor-search-field relative w-full sm:max-w-md">
                <Search aria-hidden="true" className="monitor-search-icon" />

                <input
                  type="search"
                  aria-label="Search monitors by name or URL"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search by monitor name or URL..."
                  className="form-input pl-10"
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Filter className="h-4 w-4 text-slate-400" />

                <select
                  aria-label="Filter monitors by status"
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value);
                    setCurrentPage(1);
                  }}
                  className="filter-select"
                >
                  <option value="ALL">All statuses</option>
                  <option value="UP">Operational</option>
                  <option value="DOWN">Down</option>
                  <option value="PENDING">Pending</option>
                  <option value="PAUSED">Paused</option>
                </select>
              </label>
            </div>


          </section>

          {/* Monitor list */}
          {loading ? (
            <div className="glass-panel flex min-h-72 flex-col items-center justify-center p-12 text-center">
              <div className="loading-icon">
                <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
              </div>

              <p className="mt-4 text-sm font-semibold text-slate-800">
                Loading your monitors...
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Retrieving your configured endpoints.
              </p>
            </div>
          ) : filteredMonitors.length === 0 ? (
            <div className="glass-panel flex min-h-80 flex-col items-center justify-center px-6 py-12 text-center">
              <div className="empty-icon">
                <Server className="h-7 w-7 text-violet-500" />
              </div>

              <h3 className="mt-5 text-lg font-bold text-slate-900">
                {search || statusFilter !== 'ALL'
                  ? 'No matching monitors'
                  : 'No monitors yet'}
              </h3>

              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                {search || statusFilter !== 'ALL'
                  ? 'Try another search term or status filter.'
                  : 'Add your first website or API endpoint to start monitoring its availability.'}
              </p>

              {!search && (
                <Link href="/monitors/new" className="primary-button mt-5">
                  <Plus className="h-4 w-4" />
                  Create new monitor
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-800">
                    Your endpoints
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {filteredMonitors.length} monitor
                    {filteredMonitors.length !== 1 ? 's' : ''} found
                  </p>
                </div>

                <span className="text-xs text-slate-400">
                  Showing {pageMonitors.length} on this page
                </span>
              </div>

              {pageMonitors.map((monitor) => {
                const busy = actionId === monitor.id;
                const active = isActive(monitor);

                return (
                  <article
                    key={monitor.id}
                    className="monitor-card glass-panel"
                  >
                    <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
                      <div className="flex min-w-0 flex-1 gap-4">
                        <div className="monitor-avatar">
                          <Globe className="h-5 w-5 text-blue-600" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex flex-wrap items-center gap-2.5">
                            <Link
                              href={`/monitors/${monitor.id}`}
                              className="break-words text-base font-bold text-slate-900 transition hover:text-blue-600"
                            >
                              {monitor.name}
                            </Link>

                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${getStatusStyle(
                                monitor.status,
                              )}`}
                            >
                              <StatusIcon status={monitor.status} />
                              {monitor.status}
                            </span>

                            {!active && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                                <Pause className="h-3 w-3" />
                                Paused
                              </span>
                            )}
                          </div>

                          <a
                            href={monitor.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex max-w-full items-center gap-1.5 break-all text-sm text-slate-500 transition hover:text-blue-600"
                          >
                            {monitor.url}
                            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                          </a>

                          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                            <div className="monitor-detail">
                              <span>Method</span>
                              <strong>{monitor.method}</strong>
                            </div>

                            <div className="monitor-detail">
                              <span>Interval</span>
                              <strong>{monitor.interval_seconds}s</strong>
                            </div>

                            <div className="monitor-detail">
                              <span>HTTP</span>
                              <strong>
                                {monitor.last_status_code ?? '—'}
                              </strong>
                            </div>

                            <div className="monitor-detail">
                              <span>Latency</span>
                              <strong>
                                {monitor.last_latency_ms != null
                                  ? `${monitor.last_latency_ms} ms`
                                  : '—'}
                              </strong>
                            </div>
                          </div>

                          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
                            <Clock className="h-3.5 w-3.5" />
                            Last checked: {formatDate(monitor.last_checked_at)}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="monitor-actions flex flex-wrap items-center gap-2 xl:justify-end">
                        <button
                          type="button"
                          disabled={busy || !active}
                          onClick={() => handleCheck(monitor)}
                          title="Run an immediate health check"
                          aria-label={`Run health check for ${monitor.name}`}
                          className="run-check-button"
                        >
                          {busy ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              <span>Checking…</span>
                            </>
                          ) : (
                            <>
                              <Zap className="h-3.5 w-3.5" />
                              <span>Run check</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleToggle(monitor)}
                          className="action-button"
                        >
                          {active ? (
                            <Pause className="h-3.5 w-3.5" />
                          ) : (
                            <Play className="h-3.5 w-3.5" />
                          )}
                          {active ? 'Pause' : 'Resume'}
                        </button>

                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleDelete(monitor)}
                          title="Delete monitor"
                          aria-label={`Delete ${monitor.name}`}
                          className="delete-button"
                        >
                          {busy ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>

                        <Link
                          href={`/monitors/${monitor.id}`}
                          aria-label={`View ${monitor.name} details`}
                          className="details-button"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}

              {/* Pagination */}
              {filteredMonitors.length > pageSize && (
                <div className="glass-panel flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-xs text-slate-500">
                    Showing{' '}
                    {(currentPage - 1) * pageSize + 1}
                    {'–'}
                    {Math.min(
                      currentPage * pageSize,
                      filteredMonitors.length,
                    )}{' '}
                    of {filteredMonitors.length} monitors
                  </span>

                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() =>
                        setCurrentPage((page) => page - 1)
                      }
                      className="pagination-button"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </button>

                    <span className="text-xs font-semibold tabular-nums text-slate-500">
                      Page {currentPage} of {pageCount}
                    </span>

                    <button
                      type="button"
                      disabled={currentPage >= pageCount}
                      onClick={() =>
                        setCurrentPage((page) => page + 1)
                      }
                      className="pagination-button"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <footer className="pb-2 pt-2 text-center text-[11px] text-slate-400">
            PulseWatch · Monitor your services with confidence
          </footer>
        </div>
      </main>

      <style jsx global>{`
        .pulsewatch-monitors {
          --info: #2563eb;
          --success: #16834f;
          --warning: #b7791f;
          --danger: #dc2626;
          position: relative;
          isolation: isolate;
          min-height: 100vh;
          background: #f6f8fa;
          color: #172033;
        }

        .pulsewatch-monitors .dashboard-market-backdrop {
          position: fixed;
          inset: 18vh 0 auto 0;
          height: clamp(620px, 78vh, 920px);
          min-height: 620px;
          max-height: 920px;
          overflow: hidden;
          pointer-events: none;
          z-index: 0;
          opacity: .92;
          mask-image: linear-gradient(to bottom, #000 0%, rgba(0,0,0,.82) 62%, rgba(0,0,0,.3) 86%, transparent 100%);
          -webkit-mask-image: linear-gradient(to bottom, #000 0%, rgba(0,0,0,.82) 62%, rgba(0,0,0,.3) 86%, transparent 100%);
        }
        .pulsewatch-monitors .dashboard-market-backdrop svg {
          display: block;
          width: 100%;
          height: 100%;
        }
        .pulsewatch-monitors .market-grid line {
          stroke: rgba(125, 145, 160, .12);
          stroke-width: 1;
          stroke-dasharray: 2 8;
        }


        .page-header {
          border-bottom: 1px solid #e8eceb;
          background: rgba(255,255,255,.72);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
        }

        .eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #16834f;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .13em;
        }

        .glass-panel {
          border: 1px solid #e5e9e8;
          border-radius: 15px;
          background: rgba(255,255,255,.96);
          box-shadow: 0 4px 16px rgba(20,35,30,.035);
        }

        /* Sticky search/filter bar: stays visible while the monitor inventory scrolls. */
        .monitor-toolbar {
          position: sticky;
          top: 96px;
          z-index: 25;
          background: rgba(255,255,255,.96);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          box-shadow: 0 8px 22px rgba(20,35,30,.07);
          scroll-margin-top: 100px;
        }

        .primary-button {
          display: inline-flex;
          min-height: 40px;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 1px solid #16834f;
          border-radius: 10px;
          background: #16834f;
          padding: 10px 16px;
          color: #fff;
          font-size: 12px;
          font-weight: 700;
          box-shadow: 0 2px 5px rgba(22,131,79,.12);
          transition: background 160ms ease, box-shadow 160ms ease, transform 160ms ease;
        }
        .primary-button:hover {
          transform: translateY(-1px);
          background: #116b40;
          box-shadow: 0 5px 12px rgba(22,131,79,.18);
        }

        .metric-card {
          position: relative;
          overflow: hidden;
          padding: 19px;
          transition: transform 160ms ease, box-shadow 160ms ease;
        }
        .metric-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(20,35,30,.07);
        }
        .metric-label { color: #64746b; font-size: 12px; font-weight: 600; }
        .metric-icon {
          display: flex;
          width: 40px;
          height: 40px;
          align-items: center;
          justify-content: center;
          border-radius: 11px;
        }
        .metric-icon-blue, .metric-icon-purple {
          background: #eef4f0;
          color: #527363;
        }
        .metric-icon-green { background: #eaf6ee; color: #16834f; }
        .metric-icon-pink { background: #fff0f0; color: #c65353; }

        .form-input {
          width: 100%;
          min-height: 42px;
          border: 1px solid #dce3df;
          border-radius: 10px;
          background: #fff;
          padding: 10px 13px;
          color: #1e293b;
          font-size: 13px;
          outline: none;
          transition: border-color 160ms ease, box-shadow 160ms ease;
        }
        .form-input:focus, .filter-select:focus {
          border-color: #16834f;
          box-shadow: 0 0 0 3px rgba(22,131,79,.1);
          outline: none;
        }
        .form-input::placeholder { color: #9aa69f; }
        .filter-select {
          min-height: 40px;
          border: 1px solid #dce3df;
          border-radius: 9px;
          background: #fff;
          padding: 8px 30px 8px 11px;
          color: #33443a;
          font-size: 12px;
          font-weight: 600;
        }
        .filter-select option { background: #fff; color: #1e293b; }

        .monitor-search-field { position: relative; }
        .monitor-search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          z-index: 2;
          width: 16px;
          height: 16px;
          color: #8993a3;
          transform: translateY(-50%);
          pointer-events: none;
          flex: none;
        }
        .monitor-search-field input[type="search"] {
          position: relative;
          z-index: 1;
          width: 100%;
          padding-left: 42px !important;
          background: rgba(255,255,255,.98);
        }


        .monitor-card {
          padding: 20px;
          transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
        }
        .monitor-card:hover {
          transform: translateY(-1px);
          border-color: #d4e3da;
          box-shadow: 0 10px 25px rgba(20,35,30,.055);
        }
        .monitor-avatar {
          display: flex;
          width: 45px;
          height: 45px;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          border: 1px solid #dcebe1;
          border-radius: 12px;
          background: #f0f7f2;
          color: #16834f;
        }
        .monitor-avatar svg { color: #16834f; }

        .status-up { border-color: #bfe4ce; background: #edf8f1; color: #16834f; }
        .status-down { border-color: #f0cccc; background: #fff2f2; color: #c65353; }
        .status-pending { border-color: #eadbb8; background: #fff8e9; color: #9b6b19; }

        .monitor-detail { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; }
        .monitor-detail span { color: #89968f; }
        .monitor-detail strong { color: #47574e; font-weight: 700; }

        .run-check-button {
          display: inline-flex;
          min-height: 36px;
          align-items: center;
          justify-content: center;
          gap: 7px;
          border: 1px solid #16834f;
          border-radius: 9px;
          background: #16834f;
          padding: 8px 12px;
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          box-shadow: 0 2px 5px rgba(22,131,79,.13);
          transition: background 150ms ease, box-shadow 150ms ease, transform 150ms ease;
        }
        .run-check-button:hover:not(:disabled) {
          transform: translateY(-1px);
          background: #116b40;
          box-shadow: 0 5px 12px rgba(22,131,79,.2);
        }
        .run-check-button:disabled {
          cursor: not-allowed;
          opacity: .58;
        }

        .action-button {
          display: inline-flex;
          min-height: 36px;
          align-items: center;
          justify-content: center;
          gap: 7px;
          border: 1px solid #dce3df;
          border-radius: 9px;
          background: #fff;
          padding: 8px 11px;
          color: #52615a;
          font-size: 11px;
          font-weight: 700;
          transition: border-color 150ms ease, background 150ms ease, color 150ms ease;
        }
        .action-button:hover:not(:disabled) {
          border-color: #b9c9c0;
          background: #f5f9f6;
          color: #244b36;
        }
        .action-button:disabled, .delete-button:disabled {
          cursor: not-allowed;
          opacity: .45;
        }

        .delete-button, .details-button {
          display: inline-flex;
          width: 36px;
          height: 36px;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          border: 1px solid #f0d5d5;
          border-radius: 9px;
          background: #fff7f7;
          color: #c65353;
          transition: border-color 150ms ease, background 150ms ease, color 150ms ease;
        }
        .delete-button:hover:not(:disabled) {
          border-color: #e6baba;
          background: #ffeded;
          color: #a83d3d;
        }
        .details-button {
          border-color: #dce8e0;
          background: #f4f8f5;
          color: #47745a;
        }
        .details-button:hover {
          border-color: #b9d5c3;
          background: #eaf4ed;
          color: #16834f;
        }

        .pagination-button {
          display: inline-flex;
          min-height: 34px;
          align-items: center;
          justify-content: center;
          gap: 5px;
          border: 1px solid #dce3df;
          border-radius: 9px;
          background: #fff;
          padding: 7px 10px;
          color: #64746b;
          font-size: 11px;
          font-weight: 700;
          transition: border-color 150ms ease, background 150ms ease, color 150ms ease;
        }
        .pagination-button:hover:not(:disabled) {
          border-color: #b9d5c3;
          background: #f2f8f4;
          color: #16834f;
        }
        .pagination-button:disabled { cursor: not-allowed; opacity: .4; }

        .empty-icon, .loading-icon {
          display: flex;
          width: 58px;
          height: 58px;
          align-items: center;
          justify-content: center;
          border: 1px solid #dcebe1;
          border-radius: 16px;
          background: #f0f7f2;
          color: #16834f;
        }
        .close-button {
          display: flex;
          width: 30px;
          height: 30px;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          color: #c65353;
          font-size: 20px;
          line-height: 1;
          transition: background 150ms ease;
        }
        .close-button:hover { background: #ffeded; }

        button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible {
          outline: 3px solid rgba(22,131,79,.2);
          outline-offset: 2px;
        }

        @media (max-width: 767px) {
          .monitor-toolbar { top: 76px; }

          /* This bottom clearance belongs only to the Monitors page.
             The shared Sidebar navbar remains fixed and other pages are untouched. */
          /* On mobile, let the document/page scroll naturally. The fixed
             bottom navbar is shared, so only this page reserves its clearance. */
          .pulsewatch-monitors {
            min-height: 100dvh;
            height: auto;
            overflow: visible;
            padding-bottom: 0;
          }
          .pulsewatch-monitors .monitors-main {
            min-height: 0;
            height: auto;
            overflow: visible;
            /* The footer is inside main, so its trailing padding must be here.
               This creates scrollable space after the footer, above the fixed tab bar. */
            padding-bottom: calc(112px + env(safe-area-inset-bottom, 0px)) !important;
          }
          .pulsewatch-monitors .monitors-content {
            padding-bottom: 0;
          }
        }
        @media (max-width: 639px) {
          .pulsewatch-monitors .dashboard-market-backdrop { opacity: .62; }
          .glass-panel { border-radius: 13px; }
          .monitor-card { padding: 16px; }
          .monitor-avatar { width: 40px; height: 40px; }
          .monitor-toolbar { padding: 12px; }
          .monitor-card > div { min-width: 0; }
          .monitor-card a[href^="http"] {
            overflow-wrap: anywhere;
            word-break: break-word;
          }
          .monitor-actions {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 40px 40px;
            align-items: stretch;
            gap: 8px;
            width: 100%;
            margin-top: 4px;
          }
          .monitor-actions .run-check-button {
            grid-column: 1 / -1;
            width: 100%;
            min-height: 42px;
          }
          .monitor-actions .action-button {
            grid-column: 1;
            width: 100%;
            min-height: 40px;
          }
          .monitor-actions .delete-button,
          .monitor-actions .details-button {
            width: 40px;
            height: 40px;
            justify-self: stretch;
          }
          .monitor-actions .delete-button { grid-column: 2; }
          .monitor-actions .details-button { grid-column: 3; }
        }
        @media (prefers-reduced-motion: reduce) {
          .metric-card, .monitor-card, .primary-button, .action-button,
          .run-check-button, .delete-button, .details-button, .pagination-button {
            transition: none;
          }
          .metric-card:hover, .monitor-card:hover, .primary-button:hover,
          .run-check-button:hover { transform: none; }
        }
      `}</style>
    </div>
  );
}
