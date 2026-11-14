
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ComponentProps, FormEvent } from 'react';
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Loader2,
  Server,
  XCircle,
  AlertCircle,
  Play,
  Pause,
  Pencil,
  Save,
  X,
  Sparkles,
  ShieldCheck,
  Gauge,
  CalendarClock,
  Globe,
  Timer,
  CircleCheck,
  CircleAlert,
} from 'lucide-react';

import { Sidebar } from '@/components/sidebar';
import { api } from '@/lib/api';

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
  failure_threshold: number;
  recovery_threshold: number;
  created_at: string;
};

type Check = {
  id: string;
  monitor_id: string;
  status: 'UP' | 'DOWN' | string;
  status_code: number | null;
  latency_ms: number | null;
  error: string | null;
  checked_at: string;
};

type EditForm = {
  name: string;
  url: string;
  method: string;
  interval_seconds: number;
  expected_status: number;
  failure_threshold: number;
  recovery_threshold: number;
};

function isActive(monitor: Monitor) {
  return monitor.is_active === true || monitor.is_active === 1;
}

// MySQL DATETIME values are stored in UTC.
function parseUtcDate(value: string | null | undefined): Date | null {
  if (!value) return null;

  const normalized = value.includes('T')
    ? value
    : value.replace(' ', 'T');

  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized);
  const date = new Date(hasTimezone ? normalized : `${normalized}Z`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value: string | null | undefined) {
  const date = parseUtcDate(value);
  if (!date) return value ? 'Unknown' : 'Never checked';

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

function getStatusStyles(status: string) {
  if (status === 'UP') {
    return {
      badge: 'status-up',
      dot: 'dot-up',
      icon: CheckCircle2,
      label: 'Operational',
    };
  }

  if (status === 'DOWN') {
    return {
      badge: 'status-down',
      dot: 'dot-down',
      icon: XCircle,
      label: 'Down',
    };
  }

  return {
    badge: 'status-pending',
    dot: 'dot-pending',
    icon: Clock3,
    label: 'Pending',
  };
}

function normalizeChecks(data: unknown): Check[] {
  if (Array.isArray(data)) return data as Check[];

  if (
    data &&
    typeof data === 'object' &&
    'checks' in data &&
    Array.isArray((data as { checks: unknown }).checks)
  ) {
    return (data as { checks: Check[] }).checks;
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
          <filter id="monitor-detail-market-line-blur" x="-20%" y="-100%" width="140%" height="300%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
          <filter id="monitor-detail-market-line-soft-blur" x="-20%" y="-100%" width="140%" height="300%">
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
        <g filter="url(#monitor-detail-market-line-blur)" opacity=".24" strokeWidth="18" strokeLinecap="round">
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
        <g filter="url(#monitor-detail-market-line-soft-blur)" opacity=".32" strokeWidth="7" strokeLinecap="round">
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


function LatencyChart({ checks }: { checks: Check[] }) {
  const points = useMemo(() => {
    const valid = [...checks]
      .filter(
        (check) =>
          check.latency_ms !== null &&
          Number(check.latency_ms) >= 0,
      )
      .slice(0, 30)
      .reverse();

    if (valid.length === 0) return [];

    const values = valid.map((check) => Number(check.latency_ms));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(max - min, 1);

    return valid.map((check, index) => {
      const x =
        valid.length === 1
          ? 300
          : 12 + (index / (valid.length - 1)) * 576;

      const y =
        148 - ((Number(check.latency_ms) - min) / range) * 112;

      return {
        x,
        y,
        latency: Number(check.latency_ms),
      };
    });
  }, [checks]);

  if (points.length === 0) {
    return (
      <div className="chart-empty">
        <div className="empty-icon">
          <Activity className="h-6 w-6 text-violet-500" />
        </div>
        <p className="mt-3 text-sm font-semibold text-slate-700">
          No response-time data
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Response-time measurements will appear here after checks are recorded.
        </p>
      </div>
    );
  }

  const line = points
    .map((point) => `${point.x},${point.y}`)
    .join(' ');

  const area = `12,160 ${line} 588,160`;

  return (
    <div>
      <svg
        viewBox="0 0 600 180"
        role="img"
        aria-label="Response time history"
        className="h-48 w-full overflow-visible"
      >
        <defs>
          <linearGradient id="latency-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#718cf5" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#718cf5" stopOpacity="0.01" />
          </linearGradient>

          <linearGradient id="latency-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#4777f5" />
            <stop offset="100%" stopColor="#a16de0" />
          </linearGradient>
        </defs>

        {[36, 92, 148].map((y) => (
          <line
            key={y}
            x1="12"
            y1={y}
            x2="588"
            y2={y}
            stroke="#e2e8f0"
            strokeDasharray="4 5"
          />
        ))}

        <polygon points={area} fill="url(#latency-area)" />

        <polyline
          points={line}
          fill="none"
          stroke="url(#latency-line)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((point, index) => (
          <g key={index}>
            <circle
              cx={point.x}
              cy={point.y}
              r="6"
              fill="#718cf5"
              opacity="0.12"
            />
            <circle
              cx={point.x}
              cy={point.y}
              r="3.5"
              fill="#657ff0"
              stroke="white"
              strokeWidth="1.5"
            />
          </g>
        ))}
      </svg>

      <p className="mt-2 text-xs text-slate-400">
        Showing up to the 30 most recent checks with recorded latency.
      </p>
    </div>
  );
}

export default function MonitorDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const monitorId = params.id as string;

  const [user, setUser] = useState<SidebarUser | null>(null);
  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [checks, setChecks] = useState<Check[]>([]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  // Edit monitor state
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  const [editForm, setEditForm] = useState<EditForm>({
    name: '',
    url: '',
    method: 'GET',
    interval_seconds: 60,
    expected_status: 200,
    failure_threshold: 3,
    recovery_threshold: 2,
  });

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

  const loadDetails = useCallback(
    async (showLoading = false) => {
      if (showLoading) setLoading(true);

      setError('');

      try {
        const [monitorData, checksData] = await Promise.all([
          api<Monitor>(`/monitors/${monitorId}`),
          api<unknown>(`/monitors/${monitorId}/checks?limit=100`),
        ]);

        setMonitor(monitorData);
        setChecks(normalizeChecks(checksData));
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load monitor details.',
        );
      } finally {
        setLoading(false);
      }
    },
    [monitorId],
  );

  useEffect(() => {
    if (monitorId) loadDetails(true);
  }, [monitorId, loadDetails]);

  // Open edit form with existing monitor information.
  const openEditForm = () => {
    if (!monitor) return;

    setEditForm({
      name: monitor.name,
      url: monitor.url,
      method: monitor.method,
      interval_seconds: monitor.interval_seconds,
      expected_status: monitor.expected_status,
      failure_threshold: monitor.failure_threshold,
      recovery_threshold: monitor.recovery_threshold,
    });

    setEditOpen(true);
    setError('');
  };

  // Save updated monitor configuration.
  const handleSaveEdit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!monitor || editLoading) return;

    const trimmedName = editForm.name.trim();
    const trimmedUrl = editForm.url.trim();

    if (!trimmedName || !trimmedUrl) {
      setError('Monitor name and URL are required.');
      return;
    }

    try {
      const parsedUrl = new URL(trimmedUrl);

      if (
        parsedUrl.protocol !== 'http:' &&
        parsedUrl.protocol !== 'https:'
      ) {
        setError('Only HTTP and HTTPS URLs are supported.');
        return;
      }
    } catch {
      setError('Please enter a valid website URL.');
      return;
    }

    if (
      !Number.isInteger(editForm.expected_status) ||
      editForm.expected_status < 100 ||
      editForm.expected_status > 599
    ) {
      setError('Enter a valid HTTP status code between 100 and 599.');
      return;
    }

    if (
      !Number.isInteger(editForm.failure_threshold) ||
      editForm.failure_threshold < 1 ||
      editForm.failure_threshold > 20 ||
      !Number.isInteger(editForm.recovery_threshold) ||
      editForm.recovery_threshold < 1 ||
      editForm.recovery_threshold > 20
    ) {
      setError(
        'Failure and recovery thresholds must be between 1 and 20 checks.',
      );
      return;
    }

    setEditLoading(true);
    setError('');

    try {
      await api(`/monitors/${monitor.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: trimmedName,
          url: trimmedUrl,
          method: editForm.method,
          interval_seconds: Number(editForm.interval_seconds),
          expected_status: Number(editForm.expected_status),
          failure_threshold: Number(editForm.failure_threshold),
          recovery_threshold: Number(editForm.recovery_threshold),
        }),
      });

      setEditOpen(false);

      await loadDetails();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to update monitor.',
      );
    } finally {
      setEditLoading(false);
    }
  };

  const successfulChecks = checks.filter(
    (check) => check.status === 'UP',
  ).length;

  const successRate =
    checks.length > 0
      ? (successfulChecks / checks.length) * 100
      : null;

  const latencyValues = checks
    .filter(
      (check) =>
        check.status === 'UP' &&
        check.latency_ms !== null,
    )
    .map((check) => Number(check.latency_ms));

  const averageLatency =
    latencyValues.length > 0
      ? Math.round(
          latencyValues.reduce((sum, value) => sum + value, 0) /
            latencyValues.length,
        )
      : null;

  const handleManualCheck = async () => {
    if (!monitor) return;

    setActionLoading(true);
    setError('');

    try {
      await api(`/monitors/${monitor.id}/check`, {
        method: 'POST',
      });

      await loadDetails();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to run monitor check.',
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggle = async () => {
    if (!monitor) return;

    setActionLoading(true);
    setError('');

    try {
      await api(`/monitors/${monitor.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          is_active: !isActive(monitor),
        }),
      });

      await loadDetails();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to update monitor.',
      );
    } finally {
      setActionLoading(false);
    }
  };

  const statusStyles = monitor
    ? getStatusStyles(monitor.status)
    : null;

  const StatusIcon = statusStyles?.icon;

  return (
    <div className="pulsewatch-page relative isolate flex min-h-screen flex-col">
      <AmbientMarketBackdrop />
      <div className="relative z-10 flex min-h-screen min-w-0 flex-1 flex-col md:flex-row">
      <Sidebar user={user} />

      <main className="relative z-10 flex min-w-0 flex-1 flex-col overflow-y-auto">
        {/* Header */}
        <header className="page-header sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/monitors"
              aria-label="Back to monitors"
              className="back-button"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2">
                <span className="eyebrow">
                  <Server className="h-3.5 w-3.5" />
                  MONITORING
                </span>
              </div>

              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                Monitor details
              </h1>

              <p className="mt-1 text-xs text-slate-500">
                Availability, response times and recent health checks.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {monitor && (
              <button
                type="button"
                onClick={handleManualCheck}
                disabled={actionLoading || !isActive(monitor)}
                className="primary-button"
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Activity className="h-4 w-4" />
                )}
                Run check
              </button>
            )}
          </div>
        </header>

        <div className="space-y-6 px-5 pb-10 pt-6 sm:px-8 lg:px-10">
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
                className="rounded-lg p-1 text-rose-400 transition hover:bg-rose-100 hover:text-rose-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Loading */}
          {loading ? (
            <div className="glass-panel flex min-h-80 flex-col items-center justify-center">
              <div className="loading-icon">
                <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
              </div>

              <p className="mt-4 text-sm font-semibold text-slate-800">
                Loading monitor details...
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Retrieving monitor configuration and health history.
              </p>
            </div>
          ) : !monitor ? (
            /* Not found */
            <div className="glass-panel flex min-h-80 flex-col items-center justify-center px-6 text-center">
              <div className="empty-icon">
                <Server className="h-7 w-7 text-violet-500" />
              </div>

              <h2 className="mt-5 text-lg font-bold text-slate-900">
                Monitor not found
              </h2>

              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                It may have been deleted or you may not have access to it.
              </p>

              <button
                onClick={() => router.push('/monitors')}
                className="primary-button mt-5"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to monitors
              </button>
            </div>
          ) : (
            <>
              {/* Monitor overview */}
              <section className="glass-panel overflow-hidden">
                <div className="panel-heading flex flex-col justify-between gap-4 px-5 py-5 sm:flex-row sm:items-start sm:px-6">
                  <div className="flex min-w-0 gap-4">
                    <div className="monitor-avatar">
                      <Globe className="h-6 w-6 text-blue-600" />
                    </div>

                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <h2 className="break-words text-xl font-bold text-slate-900">
                          {monitor.name}
                        </h2>

                        {statusStyles && StatusIcon && (
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold ${statusStyles.badge}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${statusStyles.dot}`} />
                            <StatusIcon className="h-3.5 w-3.5" />
                            {statusStyles.label}
                          </span>
                        )}

                        {!isActive(monitor) && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                            <Pause className="h-3 w-3" />
                            Paused
                          </span>
                        )}
                      </div>

                      <a
                        href={monitor.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex max-w-full items-center gap-1.5 break-all text-sm font-medium text-blue-600 transition hover:text-violet-600"
                      >
                        {monitor.url}
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                      </a>

                      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                        <span>
                          Method:{' '}
                          <strong className="text-slate-700">
                            {monitor.method}
                          </strong>
                        </span>

                        <span>
                          Interval:{' '}
                          <strong className="text-slate-700">
                            {monitor.interval_seconds}s
                          </strong>
                        </span>

                        <span>
                          Expected HTTP:{' '}
                          <strong className="text-slate-700">
                            {monitor.expected_status}
                          </strong>
                        </span>

                        <span>
                          Created:{' '}
                          <strong className="text-slate-700">
                            {formatDate(monitor.created_at)}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={openEditForm}
                      disabled={actionLoading || editLoading}
                      className="secondary-button button-blue"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit monitor
                    </button>

                    <button
                      type="button"
                      onClick={handleToggle}
                      disabled={actionLoading || editLoading}
                      className="secondary-button"
                    >
                      {actionLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isActive(monitor) ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}

                      {isActive(monitor) ? 'Pause monitor' : 'Resume monitor'}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <CalendarClock className="h-4 w-4 text-blue-500" />
                    Last checked:
                    <strong className="font-semibold text-slate-700">
                      {formatDate(monitor.last_checked_at)}
                    </strong>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                    Monitor configuration
                  </div>
                </div>
              </section>

              {/* Edit monitor form */}
              {editOpen && (
                <section className="glass-panel overflow-hidden">
                  <div className="panel-heading flex items-center justify-between gap-3 px-5 py-5 sm:px-6">
                    <div className="flex items-center gap-3">
                      <div className="section-icon blue-icon">
                        <Pencil className="h-4 w-4" />
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-slate-900">
                          Edit monitor
                        </h3>

                        <p className="mt-1 text-xs text-slate-500">
                          Update your monitoring configuration.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setEditOpen(false)}
                      disabled={editLoading}
                      aria-label="Close edit form"
                      className="close-button"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <form
                    onSubmit={handleSaveEdit}
                    className="space-y-5 p-5 sm:p-6"
                  >
                    <div>
                      <label
                        htmlFor="edit-monitor-name"
                        className="form-label"
                      >
                        Monitor name
                      </label>

                      <input
                        id="edit-monitor-name"
                        required
                        maxLength={100}
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            name: e.target.value,
                          })
                        }
                        className="form-input"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="edit-monitor-url"
                        className="form-label"
                      >
                        Website URL
                      </label>

                      <input
                        id="edit-monitor-url"
                        required
                        type="url"
                        value={editForm.url}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            url: e.target.value,
                          })
                        }
                        placeholder="https://example.com"
                        className="form-input"
                      />

                      <p className="mt-2 text-xs text-slate-400">
                        Enter the full URL, including https://
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="edit-monitor-method"
                          className="form-label"
                        >
                          HTTP method
                        </label>

                        <select
                          id="edit-monitor-method"
                          value={editForm.method}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              method: e.target.value,
                            })
                          }
                          className="form-input"
                        >
                          <option value="GET">GET</option>
                          <option value="HEAD">HEAD</option>
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="edit-monitor-interval"
                          className="form-label"
                        >
                          Check interval
                        </label>

                        <select
                          id="edit-monitor-interval"
                          value={editForm.interval_seconds}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              interval_seconds: Number(e.target.value),
                            })
                          }
                          className="form-input"
                        >
                          <option value={30}>30 seconds</option>
                          <option value={60}>1 minute</option>
                          <option value={300}>5 minutes</option>
                          <option value={600}>10 minutes</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="edit-monitor-status"
                        className="form-label"
                      >
                        Expected HTTP status
                      </label>

                      <input
                        id="edit-monitor-status"
                        required
                        type="number"
                        min={100}
                        max={599}
                        value={editForm.expected_status}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            expected_status: Number(e.target.value),
                          })
                        }
                        className="form-input"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="edit-failure-threshold"
                          className="form-label"
                        >
                          Failures before incident
                        </label>

                        <input
                          id="edit-failure-threshold"
                          required
                          type="number"
                          min={1}
                          max={20}
                          value={editForm.failure_threshold}
                          onChange={(event) =>
                            setEditForm({
                              ...editForm,
                              failure_threshold: Number(event.target.value),
                            })
                          }
                          className="form-input"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="edit-recovery-threshold"
                          className="form-label"
                        >
                          Successes before recovery
                        </label>

                        <input
                          id="edit-recovery-threshold"
                          required
                          type="number"
                          min={1}
                          max={20}
                          value={editForm.recovery_threshold}
                          onChange={(event) =>
                            setEditForm({
                              ...editForm,
                              recovery_threshold: Number(event.target.value),
                            })
                          }
                          className="form-input"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
                      <button
                        type="button"
                        onClick={() => setEditOpen(false)}
                        disabled={editLoading}
                        className="secondary-button"
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        disabled={editLoading}
                        className="primary-button"
                      >
                        {editLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}

                        {editLoading ? 'Saving...' : 'Save changes'}
                      </button>
                    </div>
                  </form>
                </section>
              )}

              {/* Statistics */}
              <section>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">
                      Performance overview
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Metrics calculated from the currently loaded check history.
                    </p>
                  </div>

                  <span className="text-xs text-slate-400">
                    {checks.length} checks loaded
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="metric-card metric-blue glass-panel">
                    <div className="flex items-center justify-between">
                      <p className="metric-label">Current status</p>
                      <div className="metric-icon metric-icon-blue">
                        <Activity className="h-5 w-5" />
                      </div>
                    </div>

                    <p
                      className={`mt-4 text-2xl font-bold ${
                        monitor.status === 'UP'
                          ? 'text-emerald-600'
                          : monitor.status === 'DOWN'
                            ? 'text-rose-600'
                            : 'text-amber-600'
                      }`}
                    >
                      {monitor.status}
                    </p>

                    <p className="mt-2 text-[11px] text-slate-400">
                      Latest monitor state
                    </p>
                  </div>

                  <div className="metric-card metric-purple glass-panel">
                    <div className="flex items-center justify-between">
                      <p className="metric-label">Success rate</p>
                      <div className="metric-icon metric-icon-purple">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                    </div>

                    <p className="mt-4 text-2xl font-bold text-slate-900 tabular-nums">
                      {successRate === null
                        ? '—'
                        : `${successRate.toFixed(1)}%`}
                    </p>

                    <p className="mt-2 text-[11px] text-slate-400">
                      Across {checks.length} loaded checks
                    </p>
                  </div>

                  <div className="metric-card metric-cyan glass-panel">
                    <div className="flex items-center justify-between">
                      <p className="metric-label">Latest response</p>
                      <div className="metric-icon metric-icon-cyan">
                        <Gauge className="h-5 w-5" />
                      </div>
                    </div>

                    <p className="mt-4 text-2xl font-bold text-slate-900 tabular-nums">
                      {monitor.last_latency_ms == null
                        ? '—'
                        : `${monitor.last_latency_ms} ms`}
                    </p>

                    <p className="mt-2 text-[11px] text-slate-400">
                      Last recorded response time
                    </p>
                  </div>

                  <div className="metric-card metric-pink glass-panel">
                    <div className="flex items-center justify-between">
                      <p className="metric-label">Average response</p>
                      <div className="metric-icon metric-icon-pink">
                        <Timer className="h-5 w-5" />
                      </div>
                    </div>

                    <p className="mt-4 text-2xl font-bold text-slate-900 tabular-nums">
                      {averageLatency === null
                        ? '—'
                        : `${averageLatency} ms`}
                    </p>

                    <p className="mt-2 text-[11px] text-slate-400">
                      Successful loaded checks
                    </p>
                  </div>
                </div>
              </section>

              {/* Response time chart */}
              <section className="glass-panel overflow-hidden">
                <div className="panel-heading flex items-center justify-between gap-3 px-5 py-5 sm:px-6">
                  <div className="flex items-center gap-3">
                    <div className="section-icon purple-icon">
                      <Activity className="h-4 w-4" />
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Response time history
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        Recent recorded latency measurements.
                      </p>
                    </div>
                  </div>

                  <Sparkles className="h-5 w-5 text-violet-400" />
                </div>

                <div className="p-5 sm:p-6">
                  <LatencyChart checks={checks} />
                </div>
              </section>

              {/* Health check history */}
              <section className="glass-panel overflow-hidden">
                <div className="panel-heading flex flex-col justify-between gap-3 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
                  <div className="flex items-center gap-3">
                    <div className="section-icon blue-icon">
                      <Clock3 className="h-4 w-4" />
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Recent health checks
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        Latest {checks.length} recorded checks.
                      </p>
                    </div>
                  </div>

                  <span className="rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-[11px] font-semibold text-slate-500">
                    Newest first
                  </span>
                </div>

                {checks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
                    <div className="empty-icon">
                      <Clock3 className="h-6 w-6 text-violet-500" />
                    </div>

                    <h4 className="mt-4 text-sm font-bold text-slate-800">
                      No check history yet
                    </h4>

                    <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
                      Run a monitor check to create the first health-check record.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-[640px] overflow-auto recent-checks-scroll">
                    <table className="w-full min-w-[680px] text-left text-sm">
                      <thead className="sticky top-0 z-10">
                        <tr className="table-header">
                          <th className="px-5 py-3.5 font-semibold sm:px-6">
                            Result
                          </th>
                          <th className="px-5 py-3.5 font-semibold sm:px-6">
                            HTTP status
                          </th>
                          <th className="px-5 py-3.5 font-semibold sm:px-6">
                            Latency
                          </th>
                          <th className="px-5 py-3.5 font-semibold sm:px-6">
                            Checked at
                          </th>
                          <th className="px-5 py-3.5 font-semibold sm:px-6">
                            Details
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {checks.map((check) => {
                          const isUp = check.status === 'UP';

                          return (
                            <tr key={check.id} className="check-table-row">
                              <td className="px-5 py-4 sm:px-6">
                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                                    isUp
                                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                      : 'border-rose-200 bg-rose-50 text-rose-700'
                                  }`}
                                >
                                  {isUp ? (
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                  ) : (
                                    <XCircle className="h-3.5 w-3.5" />
                                  )}

                                  {check.status}
                                </span>
                              </td>

                              <td className="px-5 py-4 text-slate-600 sm:px-6">
                                {check.status_code ?? '—'}
                              </td>

                              <td className="px-5 py-4 font-semibold tabular-nums text-slate-700 sm:px-6">
                                {check.latency_ms == null
                                  ? '—'
                                  : `${check.latency_ms} ms`}
                              </td>

                              <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500 sm:px-6">
                                {formatDate(check.checked_at)}
                              </td>

                              <td className="max-w-xs px-5 py-4 text-xs text-slate-500 sm:px-6">
                                <span className="line-clamp-2 break-words">
                                  {check.error || '—'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* Monitoring configuration */}
              <section className="glass-panel overflow-hidden">
                <div className="panel-heading flex items-center gap-3 px-5 py-5 sm:px-6">
                  <div className="section-icon cyan-icon">
                    <ShieldCheck className="h-4 w-4" />
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Monitoring configuration
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Current failure and recovery thresholds.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3 sm:p-6">
                  <div className="config-card">
                    <p className="config-label">Failure threshold</p>
                    <p className="config-value">
                      {monitor.failure_threshold}
                      <span> checks</span>
                    </p>
                    <p className="config-description">
                      Consecutive failures before an incident is triggered.
                    </p>
                  </div>

                  <div className="config-card">
                    <p className="config-label">Recovery threshold</p>
                    <p className="config-value">
                      {monitor.recovery_threshold}
                      <span> checks</span>
                    </p>
                    <p className="config-description">
                      Successful checks required to confirm recovery.
                    </p>
                  </div>

                  <div className="config-card">
                    <p className="config-label">Consecutive failures</p>
                    <p className="config-value">
                      {monitor.consecutive_failures}
                    </p>
                    <p className="config-description">
                      Currently recorded consecutive failed checks.
                    </p>
                  </div>
                </div>
              </section>
            </>
          )}

          <footer className="pb-2 pt-1 text-center text-[11px] text-slate-400">
            PulseWatch · Monitor reliability and performance
          </footer>
        </div>
      </main>
      </div>

      <style jsx global>{`
        .pulsewatch-page {
          position: relative;
          isolation: isolate;
          background: #f6f8fa;
          color: #172033;
        }

        .dashboard-market-backdrop {
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

        .pulsewatch-page .dashboard-market-backdrop svg {
          display: block;
          width: 100%;
          height: 100%;
        }

        .pulsewatch-page .market-grid line {
          stroke: rgba(125, 145, 160, .12);
          stroke-width: 1;
          stroke-dasharray: 2 8;
        }

        .recent-checks-scroll {
          scrollbar-width: thin;
          scrollbar-color: #cbd5d1 transparent;
        }

        .recent-checks-scroll::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        .recent-checks-scroll::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: #cbd5d1;
        }

        .page-header {
          border-bottom: 1px solid rgba(255, 255, 255, 0.75);
          background: rgba(255, 255, 255, 0.45);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
        }

        .eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #7181b2;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.13em;
        }

        .glass-panel {
          border: 1px solid rgba(255, 255, 255, 0.88);
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.72);
          box-shadow:
            0 12px 38px rgba(64, 77, 130, 0.055),
            0 2px 8px rgba(64, 77, 130, 0.025),
            inset 0 1px 0 rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
        }

        .panel-heading {
          border-bottom: 1px solid rgba(226, 232, 240, 0.75);
          background: rgba(255, 255, 255, 0.32);
        }

        .back-button {
          display: flex;
          width: 38px;
          height: 38px;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(203, 213, 225, 0.8);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.8);
          color: #64748b;
          transition: all 180ms ease;
        }

        .back-button:hover {
          border-color: #a9bdf5;
          background: #edf2ff;
          color: #386bce;
          transform: translateX(-2px);
        }

        .primary-button,
        .secondary-button {
          display: inline-flex;
          min-height: 38px;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-radius: 11px;
          padding: 9px 14px;
          font-size: 12px;
          font-weight: 700;
          transition:
            transform 160ms ease,
            background 160ms ease,
            border-color 160ms ease,
            box-shadow 160ms ease;
        }

        .primary-button {
          border: 1px solid transparent;
          background: #16834f;
          color: white;
          box-shadow: 0 6px 16px rgba(22, 131, 79, 0.16);
        }

        .primary-button:hover:not(:disabled) {
          transform: translateY(-1px);
          background: #126b40;
          box-shadow: 0 9px 20px rgba(22, 131, 79, 0.2);
        }

        .secondary-button {
          border: 1px solid rgba(203, 213, 225, 0.8);
          background: rgba(255, 255, 255, 0.78);
          color: #526582;
        }

        .secondary-button:hover:not(:disabled) {
          border-color: #a9bdf5;
          background: #f0f4ff;
          color: #386bce;
        }

        .button-blue {
          border-color: #d8e2ff;
          background: #f0f4ff;
          color: #4777d8;
        }

        .button-blue:hover:not(:disabled) {
          background: #e4ebff;
        }

        .primary-button:disabled,
        .secondary-button:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .monitor-avatar {
          display: flex;
          width: 54px;
          height: 54px;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          border: 1px solid #e3eaff;
          border-radius: 17px;
          background: linear-gradient(135deg, #e9efff, #f1eaff);
          box-shadow: 0 5px 14px rgba(90, 105, 190, 0.08);
        }

        .status-up {
          border-color: #bdebd5;
          background: #eafaf2;
          color: #16845a;
        }

        .status-down {
          border-color: #f4cbd3;
          background: #fff0f3;
          color: #c44e67;
        }

        .status-pending {
          border-color: #f4dfb7;
          background: #fff8e9;
          color: #a96d16;
        }

        .dot-up {
          background: #20a477;
        }

        .dot-down {
          background: #e45c7a;
        }

        .dot-pending {
          background: #d99a35;
        }

        .section-icon {
          display: flex;
          width: 35px;
          height: 35px;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          border-radius: 11px;
        }

        .blue-icon {
          color: #4777f5;
          background: linear-gradient(135deg, #e9efff, #e6eaff);
        }

        .purple-icon {
          color: #9260d8;
          background: linear-gradient(135deg, #f1eaff, #eee8ff);
        }

        .cyan-icon {
          color: #159cb7;
          background: linear-gradient(135deg, #e3f9fc, #e5f4ff);
        }

        .metric-card {
          position: relative;
          overflow: hidden;
          padding: 19px;
          transition:
            transform 180ms ease,
            box-shadow 180ms ease;
        }

        .metric-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 16px 38px rgba(64, 77, 130, 0.09);
        }

        .metric-label {
          color: #64748b;
          font-size: 12px;
          font-weight: 600;
        }

        .metric-icon {
          display: flex;
          width: 40px;
          height: 40px;
          align-items: center;
          justify-content: center;
          border-radius: 13px;
        }

        .metric-icon-blue {
          background: #e9efff;
          color: #4777f5;
        }

        .metric-icon-purple {
          background: #f0eaff;
          color: #9260d8;
        }

        .metric-icon-cyan {
          background: #e4f8fb;
          color: #159cb7;
        }

        .metric-icon-pink {
          background: #fff0f5;
          color: #df6fa8;
        }

        .chart-empty {
          display: flex;
          min-height: 190px;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 1px dashed #dce3f1;
          border-radius: 15px;
          background: rgba(248, 250, 255, 0.6);
          padding: 24px;
          text-align: center;
        }

        .empty-icon,
        .loading-icon {
          display: flex;
          width: 56px;
          height: 56px;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 255, 255, 0.9);
          border-radius: 18px;
          background: linear-gradient(135deg, #edf1ff, #f5eaff);
          box-shadow: 0 8px 24px rgba(90, 105, 190, 0.09);
        }

        .form-label {
          display: block;
          margin-bottom: 8px;
          color: #475569;
          font-size: 12px;
          font-weight: 700;
        }

        .form-input {
          width: 100%;
          min-height: 44px;
          border: 1px solid rgba(203, 213, 225, 0.85);
          border-radius: 11px;
          background: rgba(255, 255, 255, 0.85);
          padding: 10px 13px;
          color: #1e293b;
          font-size: 13px;
          outline: none;
          transition:
            border-color 180ms ease,
            box-shadow 180ms ease;
        }

        .form-input:focus {
          border-color: #7797f7;
          box-shadow: 0 0 0 3px rgba(71, 119, 245, 0.1);
        }

        .form-input:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        .form-input option {
          color: #1e293b;
          background: white;
        }

        .close-button {
          display: flex;
          width: 36px;
          height: 36px;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          color: #94a3b8;
          transition: all 160ms ease;
        }

        .close-button:hover:not(:disabled) {
          background: #fff0f3;
          color: #d45b76;
        }

        .close-button:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .table-header {
          border-bottom: 1px solid #e8edf5;
          background: rgba(243, 246, 253, 0.82);
          color: #8492a9;
          font-size: 10px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .check-table-row {
          color: #475569;
          transition: background 160ms ease;
        }

        .check-table-row:hover {
          background: rgba(243, 246, 255, 0.7);
        }

        .config-card {
          border: 1px solid rgba(226, 232, 240, 0.8);
          border-radius: 15px;
          background: rgba(248, 250, 255, 0.68);
          padding: 17px;
        }

        .config-label {
          color: #64748b;
          font-size: 11px;
          font-weight: 700;
        }

        .config-value {
          margin-top: 10px;
          color: #1e293b;
          font-size: 25px;
          font-weight: 800;
          letter-spacing: -0.04em;
        }

        .config-value span {
          color: #94a3b8;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: normal;
        }

        .config-description {
          margin-top: 7px;
          color: #94a3b8;
          font-size: 11px;
          line-height: 1.6;
        }

        @keyframes monitor-aurora-float {
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

        @media (max-width: 639px) {
          .glass-panel {
            border-radius: 17px;
          }

          .metric-card {
            padding: 17px;
          }

          .monitor-avatar {
            width: 46px;
            height: 46px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .metric-card,
          .back-button,
          .primary-button,
          .secondary-button,
          .check-table-row {
            transition: none;
          }

          .metric-card:hover,
          .primary-button:hover,
          .secondary-button:hover {
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}
