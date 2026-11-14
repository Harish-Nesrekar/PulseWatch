
'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  BarChart3,
  Clock3,
  Loader2,
  CalendarClock,
  TrendingUp,
  Timer,
} from 'lucide-react';

import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Bar,
  BarChart,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts';

import { Sidebar } from '@/components/sidebar';
import { analyticsApi, type AnalyticsData, type AuthUser } from '@/lib/api';

function utcDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function formatDuration(milliseconds: number) {
  const minutes = Math.floor(milliseconds / 60_000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const remainingMinutes = minutes % 60;

  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${remainingMinutes}m`;

  return `${remainingMinutes}m`;
}

function formatBucket(value: string, periodDays: number) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return periodDays <= 2
    ? date.toLocaleTimeString([], { hour: 'numeric' })
    : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function uptimeTone(value: number | null) {
  if (value === null) return '#9ca3af';
  if (value >= 99) return '#10B981';
  if (value >= 95) return '#F59E0B';

  return '#EF4444';
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
          <filter id="analytics-market-line-blur" x="-20%" y="-100%" width="140%" height="300%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
          <filter id="analytics-market-line-soft-blur" x="-20%" y="-100%" width="140%" height="300%">
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
        <g filter="url(#analytics-market-line-blur)" opacity=".24" strokeWidth="18" strokeLinecap="round">
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
        <g filter="url(#analytics-market-line-soft-blur)" opacity=".32" strokeWidth="7" strokeLinecap="round">
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


/* -------------------------------------------------------
   CHART TOOLTIPS
------------------------------------------------------- */

function ChartTooltip({ active, payload }: TooltipProps<number, string>) {
  const point = payload?.[0]?.payload as
    | AnalyticsData['timeline'][number]
    | undefined;

  if (!active || !point) return null;

  return (
    <div className="chart-tooltip">
      <p className="font-semibold text-[#151526]">
        {new Date(point.bucket).toLocaleString()}
      </p>

      <p className="mt-2 text-sm text-slate-600">
        {point.avgResponseTimeMs == null
          ? 'No response-time data'
          : `${Math.round(point.avgResponseTimeMs)} ms`}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {point.uptime == null
          ? 'No uptime data'
          : `${point.uptime.toFixed(2)}% uptime`}
      </p>
    </div>
  );
}

function MonitorTooltip({ active, payload }: TooltipProps<number, string>) {
  const monitor = payload?.[0]?.payload as
    | AnalyticsData['monitors'][number]
    | undefined;

  if (!active || !monitor) return null;

  return (
    <div className="chart-tooltip">
      <p className="font-semibold text-[#151526]">{monitor.name}</p>

      <p className="mt-2 text-sm text-slate-600">
        {monitor.uptime == null
          ? 'No checks recorded'
          : `${monitor.uptime.toFixed(2)}% uptime`}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {monitor.checkCount} checks
      </p>
    </div>
  );
}

function IncidentTooltip({ active, payload }: TooltipProps<number, string>) {
  const point = payload?.[0]?.payload as
    | { day: string; incidents: number }
    | undefined;

  if (!active || !point) return null;

  return (
    <div className="chart-tooltip">
      <p className="font-semibold text-[#151526]">
        {new Date(`${point.day}T00:00:00Z`).toLocaleDateString()}
      </p>

      <p className="mt-2 text-sm text-slate-600">
        {point.incidents}{' '}
        {point.incidents === 1 ? 'incident' : 'incidents'}
      </p>
    </div>
  );
}

/* -------------------------------------------------------
   ANALYTICS METRIC CARD
------------------------------------------------------- */

function Metric({
  label,
  value,
  note,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  note?: string;
  icon: React.ElementType;
  accent: 'blue' | 'pink' | 'cyan' | 'purple';
}) {
  const accentStyles = {
    blue: {
      icon: 'bg-blue-100 text-blue-600',
      glow: 'from-blue-100/80',
    },
    pink: {
      icon: 'bg-pink-100 text-pink-600',
      glow: 'from-pink-100/80',
    },
    cyan: {
      icon: 'bg-cyan-100 text-cyan-600',
      glow: 'from-cyan-100/80',
    },
    purple: {
      icon: 'bg-purple-100 text-purple-600',
      glow: 'from-purple-100/80',
    },
  };

  const style = accentStyles[accent];

  return (
    <div className="analytics-glass-card analytics-metric relative overflow-hidden p-5 sm:p-6">
      <div
        className={`pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${style.glow} to-transparent opacity-70 blur-2xl`}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>

          <p className="mt-4 break-words text-2xl font-bold tracking-tight text-[#151526] sm:text-3xl">
            {value}
          </p>

          {note && (
            <p className="mt-2 text-xs text-slate-500">{note}</p>
          )}
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${style.icon}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------
   MAIN ANALYTICS PAGE
------------------------------------------------------- */

export default function AnalyticsPage() {
  const today = utcDate(new Date());

  const sevenDaysAgo = utcDate(
    new Date(Date.now() - 6 * 86400000)
  );

  const [user, setUser] = useState<AuthUser | null>(null);

  const [from, setFrom] = useState(sevenDaysAgo);
  const [to, setTo] = useState(today);

  const [appliedFrom, setAppliedFrom] = useState(sevenDaysAgo);
  const [appliedTo, setAppliedTo] = useState(today);

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  /* -------------------------------------------------------
     AUTHENTICATION
  ------------------------------------------------------- */

  useEffect(() => {
    const storedUser = localStorage.getItem('pulsewatch_user');

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser) as AuthUser);
      } catch {
        localStorage.removeItem('pulsewatch_user');
      }
    }
  }, []);

  /* -------------------------------------------------------
     ANALYTICS API
  ------------------------------------------------------- */

  useEffect(() => {
    if (!appliedFrom || !appliedTo) return;

    const controller = new AbortController();

    setLoading(true);
    setError('');

    analyticsApi
      .get(appliedFrom, appliedTo, controller.signal)
      .then(setData)
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load analytics.'
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [appliedFrom, appliedTo]);

  /* -------------------------------------------------------
     DATE RANGE
  ------------------------------------------------------- */

  function applyRange(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!from || !to || from > to) {
      setError('Choose a valid start and end date.');
      return;
    }

    const days =
      (Date.parse(`${to}T00:00:00Z`) -
        Date.parse(`${from}T00:00:00Z`)) /
      86400000;

    if (days >= 31) {
      setError('Select a period of 31 days or less.');
      return;
    }

    setAppliedFrom(from);
    setAppliedTo(to);
  }

  /* -------------------------------------------------------
     DERIVED ANALYTICS DATA
  ------------------------------------------------------- */

  const summary = data?.summary;

  const periodDays = Math.max(
    1,
    Math.floor(
      (Date.parse(`${appliedTo}T00:00:00Z`) -
        Date.parse(`${appliedFrom}T00:00:00Z`)) /
        86400000
    ) + 1
  );

  const incidentTimeline = useMemo(() => {
    if (!data) return [];

    const counts = new Map(
      data.incidentFrequency.map(item => [
        item.day,
        item.incidents,
      ])
    );

    const days: Array<{ day: string; incidents: number }> = [];

    const cursor = new Date(`${appliedFrom}T00:00:00Z`);
    const end = new Date(`${appliedTo}T00:00:00Z`);

    while (cursor <= end) {
      const day = cursor.toISOString().slice(0, 10);

      days.push({
        day,
        incidents: counts.get(day) ?? 0,
      });

      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return days;
  }, [appliedFrom, appliedTo, data]);

  const uptimePointCount = data?.timeline.filter(
    point => point.uptime !== null
  ).length ?? 0;

  const responsePointCount = data?.timeline.filter(
    point => point.avgResponseTimeMs !== null
  ).length ?? 0;

  const monitorsWithUptime =
    data?.monitors.filter(
      monitor => monitor.uptime !== null
    ) ?? [];

  const monitorsWithoutChecks =
    data?.monitors.filter(
      monitor => monitor.uptime === null
    ) ?? [];

  /* -------------------------------------------------------
     UI
  ------------------------------------------------------- */

  return (
    <div className="pulsewatch-analytics relative isolate flex min-h-screen flex-col overflow-x-clip bg-[#F6F8FA] text-[#172033] md:flex-row">

      {/* GLOBAL AURORA BACKGROUND */}

      <style jsx global>{`
        .pulsewatch-analytics {
          --success: #10b981;
          --warning: #f59e0b;
          --danger: #ef4444;

          --text-primary: #151526;
          --text-secondary: #64748b;
          --text-muted: #8792a8;

          --chart-grid: rgba(100, 116, 139, 0.16);
          --chart-cursor: rgba(22, 131, 79, 0.35);

          --chart-uptime: #16834f;
          --chart-response: #2563eb;
          --chart-average: #d97706;
        }

        .pulsewatch-analytics .dashboard-market-backdrop {
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
        .pulsewatch-analytics .dashboard-market-backdrop svg { display:block; width:100%; height:100%; }
        .pulsewatch-analytics .market-grid line { stroke: rgba(125,145,160,.12); stroke-width:1; stroke-dasharray:2 8; }

        /* GLASS PANELS */

        .pulsewatch-analytics .analytics-glass-card,
        .pulsewatch-analytics .dashboard-panel {
          border: 1px solid #e6ebf0;
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.94);
          box-shadow: 0 1px 3px rgba(16, 24, 40, 0.045);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
        }

        .pulsewatch-analytics .analytics-glass-card {
          transition:
            transform 220ms ease,
            box-shadow 220ms ease;
        }

        .pulsewatch-analytics .analytics-glass-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 18px 42px rgba(74, 88, 145, 0.12);
        }

        .pulsewatch-analytics .dashboard-panel {
          overflow: hidden;
          padding: 22px;
        }

        .pulsewatch-analytics .dashboard-panel h2 {
          color: #151526;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: -0.02em;
        }

        .pulsewatch-analytics .dashboard-panel p {
          color: #64748b;
        }

        /* CHART TOOLTIP */

        .pulsewatch-analytics .chart-tooltip {
          border: 1px solid rgba(255, 255, 255, 0.95);
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.94);
          box-shadow: 0 12px 32px rgba(54, 67, 120, 0.14);
          padding: 13px 15px;
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }

        /* FORM */

        .pulsewatch-analytics .analytics-input {
          width: 100%;
          border: 1px solid #e4e8f2;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.82);
          color: #151526;
          padding: 11px 13px;
          outline: none;
          transition:
            border-color 180ms ease,
            box-shadow 180ms ease;
        }

        .pulsewatch-analytics .analytics-input:focus {
          border-color: #7194f7;
          box-shadow: 0 0 0 3px rgba(71, 119, 245, 0.12);
        }

        .pulsewatch-analytics .analytics-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 1px solid rgba(255, 255, 255, 0.45);
          border-radius: 12px;
          background: linear-gradient(115deg, #4777f5, #8067e9);
          color: #fff;
          padding: 11px 18px;
          font-size: 13px;
          font-weight: 600;
          box-shadow: 0 8px 20px rgba(71, 119, 245, 0.22);
          transition:
            transform 180ms ease,
            box-shadow 180ms ease;
        }

        .pulsewatch-analytics .analytics-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 11px 25px rgba(71, 119, 245, 0.30);
        }

        .pulsewatch-analytics .analytics-button:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        .pulsewatch-analytics .analytics-error {
          border: 1px solid #fecdd3;
          border-radius: 14px;
          background: rgba(255, 241, 242, 0.92);
          color: #9f1239;
        }

        .pulsewatch-analytics .analytics-empty {
          display: flex;
          min-height: 220px;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: #64748b;
          text-align: center;
        }

        .pulsewatch-analytics .analytics-divider {
          border-color: rgba(143, 155, 190, 0.18);
        }

        @media (prefers-reduced-motion: reduce) {
          .pulsewatch-analytics .analytics-glass-card { transition: none !important; }
        }

        @media (max-width: 767px) {
          .pulsewatch-analytics .dashboard-panel {
            padding: 16px;
          }
        }
      `}</style>

      <AmbientMarketBackdrop />

      {/* EXISTING SIDEBAR */}

      <Sidebar user={user} />

      {/* MAIN CONTENT */}

      <main className="relative z-10 flex min-h-screen min-w-0 flex-1 flex-col pb-24 md:pb-0">

        {/* HEADER */}

        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 border-b border-white/70 bg-white/85 px-5 py-5 shadow-[0_8px_30px_rgba(89,102,160,0.05)] backdrop-blur-2xl sm:px-8">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-purple-100 text-blue-600">
                <BarChart3 className="h-5 w-5" />
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-[#151526]">
                Analytics
              </h1>
            </div>

            <p className="mt-2 text-xs text-slate-500 sm:ml-11">
              Historical performance calculated from recorded monitoring checks.
            </p>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-white/80 bg-white/60 px-4 py-2 text-xs font-medium text-slate-600 shadow-sm sm:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            Analytics overview
          </div>
        </header>

        <div className="relative z-10 w-full min-w-0 space-y-6 p-4 sm:p-6 xl:p-8">

          {/* PAGE INTRO */}

          <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
                Performance insights
              </p>

              <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#151526] sm:text-3xl">
                Understand your service health.
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                Explore uptime, response times and incident trends across your monitored services.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Activity className="h-4 w-4 text-blue-500" />
              Historical monitoring data
            </div>
          </section>

          {/* DATE FILTER */}

          <form
            onSubmit={applyRange}
            className="analytics-glass-card flex flex-col gap-4 p-4 sm:flex-row sm:items-end sm:p-5"
          >
            <div className="flex-1">
              <label className="mb-2 block text-xs font-semibold text-slate-600">
                From (UTC)
              </label>

              <input
                aria-label="From date"
                type="date"
                value={from}
                max={to}
                onChange={event => setFrom(event.target.value)}
                className="analytics-input text-sm"
              />
            </div>

            <div className="flex-1">
              <label className="mb-2 block text-xs font-semibold text-slate-600">
                To (UTC)
              </label>

              <input
                aria-label="To date"
                type="date"
                value={to}
                min={from}
                max={today}
                onChange={event => setTo(event.target.value)}
                className="analytics-input text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="analytics-button min-h-[43px]"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CalendarClock className="h-4 w-4" />
              )}

              Apply range
            </button>
          </form>

          {/* ERROR STATE */}

          {error && (
            <div
              role="alert"
              className="analytics-error flex items-center gap-3 px-4 py-3 text-sm"
            >
              <AlertCircle className="h-5 w-5 shrink-0" />
              {error}
            </div>
          )}

          {/* LOADING STATE */}

          {loading && !data ? (
            <div className="analytics-glass-card flex min-h-64 items-center justify-center gap-3 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              Loading historical metrics...
            </div>
          ) : null}

          {/* ANALYTICS DATA */}

          {data && (
            <>
              {/* REPORTING PERIOD */}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-slate-600">
                  Reporting period:{' '}
                  <span className="font-semibold text-[#151526]">
                    {data.period.label}
                  </span>
                </p>

                <span className="rounded-full border border-white/80 bg-white/65 px-3 py-1.5 text-xs font-medium text-slate-500">
                  {periodDays} {periodDays === 1 ? 'day' : 'days'}
                </span>
              </div>

              {/* METRIC CARDS */}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Metric
                  label="Overall uptime"
                  value={
                    summary?.overallUptime == null
                      ? '—'
                      : `${summary.overallUptime}%`
                  }
                  note={`${summary?.checkCount ?? 0} recorded checks`}
                  icon={Activity}
                  accent="blue"
                />

                <Metric
                  label="Average response time"
                  value={
                    summary?.avgResponseTimeMs == null
                      ? '—'
                      : `${Math.round(summary.avgResponseTimeMs)} ms`
                  }
                  note="Average recorded latency"
                  icon={Clock3}
                  accent="cyan"
                />

                <Metric
                  label="Response-time range"
                  value={
                    summary?.minResponseTimeMs == null ||
                    summary.maxResponseTimeMs == null
                      ? '—'
                      : `${summary.minResponseTimeMs}–${summary.maxResponseTimeMs} ms`
                  }
                  note="Minimum to maximum"
                  icon={TrendingUp}
                  accent="purple"
                />

                <Metric
                  label="Incident downtime"
                  value={formatDuration(summary?.downtimeMs ?? 0)}
                  note={`${summary?.incidentCount ?? 0} overlapping incidents`}
                  icon={Timer}
                  accent="pink"
                />
              </div>

              {/* NO CHECKS NOTICE */}

              {summary?.checkCount === 0 && (
                <div className="analytics-glass-card flex items-start gap-3 p-4 text-sm text-slate-600">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />

                  <p>
                    No checks were recorded in this period. Uptime and
                    response-time metrics are unavailable; missing data
                    is not counted as downtime.
                  </p>
                </div>
              )}

              {/* UPTIME AND RESPONSE TIME CHARTS */}

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

                {/* UPTIME CHART */}

                <section className="dashboard-panel min-w-0">
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <div>
                      <h2>Uptime over time</h2>

                      <p className="mt-1 text-xs text-slate-500">
                        Availability percentage for each recorded time bucket. The dashed line marks the 99% target.
                      </p>
                    </div>

                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
                      <Activity className="h-4 w-4" />
                    </div>
                  </div>

                  {uptimePointCount > 0 ? (
                    <>
                    <div className="h-[280px] min-w-0 sm:h-[320px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={data.timeline}
                          margin={{
                            top: 12,
                            right: 12,
                            bottom: 4,
                            left: 0,
                          }}
                        >
                          <defs>
                            <linearGradient
                              id="analyticsUptimeGradient"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="0%"
                                stopColor="var(--chart-uptime)"
                                stopOpacity={0.25}
                              />

                              <stop
                                offset="95%"
                                stopColor="var(--chart-uptime)"
                                stopOpacity={0.01}
                              />
                            </linearGradient>
                          </defs>

                          <CartesianGrid
                            vertical={false}
                            stroke="var(--chart-grid)"
                            strokeDasharray="3 5"
                          />

                          <XAxis
                            dataKey="bucket"
                            tickFormatter={value =>
                              formatBucket(String(value), periodDays)
                            }
                            tickLine={false}
                            axisLine={false}
                            minTickGap={28}
                            tick={{
                              fill: 'var(--text-muted)',
                              fontSize: 11,
                            }}
                          />

                          <YAxis
                            domain={[0, 100]}
                            tickFormatter={value => `${value}%`}
                            tickLine={false}
                            axisLine={false}
                            width={46}
                            tick={{
                              fill: 'var(--text-muted)',
                              fontSize: 11,
                            }}
                          />

                          <Tooltip
                            content={<ChartTooltip />}
                            cursor={{
                              stroke: 'var(--chart-cursor)',
                              strokeDasharray: '4 4',
                            }}
                          />

                          <ReferenceLine
                            y={99}
                            stroke="var(--chart-average)"
                            strokeDasharray="5 5"
                          />

                          <Line
                            type="linear"
                            dataKey="uptime"
                            name="Uptime"
                            stroke="var(--chart-uptime)"
                            strokeWidth={3}
                            dot={{ r: 4, fill: '#16834f', stroke: '#ffffff', strokeWidth: 2 }}
                            activeDot={{
                              r: 6,
                              fill: '#16834f',
                              stroke: '#ffffff',
                              strokeWidth: 2,
                            }}
                            connectNulls={false}
                            isAnimationActive
                            animationDuration={800}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    {uptimePointCount === 1 && (
                      <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
                        1 recorded time bucket. A trend path will appear when at least two buckets contain uptime data. No values are inferred for missing periods.
                      </p>
                    )}
                    </>
                  ) : (
                    <p className="flex h-64 items-center justify-center text-sm text-slate-500">
                      No uptime history for this period.
                    </p>
                  )}
                </section>

                {/* RESPONSE TIME CHART */}

                <section className="dashboard-panel min-w-0">
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <div>
                      <h2>Response-time trend</h2>

                      <p className="mt-1 text-xs text-slate-500">
                        Average latency for each recorded time bucket. Lower values indicate faster responses.
                      </p>
                    </div>

                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-100 text-cyan-600">
                      <Clock3 className="h-4 w-4" />
                    </div>
                  </div>

                  {responsePointCount > 0 ? (
                    <>
                    <div className="h-[280px] min-w-0 sm:h-[320px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={data.timeline}
                          margin={{
                            top: 12,
                            right: 12,
                            bottom: 4,
                            left: 0,
                          }}
                        >
                          <defs>
                            <linearGradient
                              id="analyticsResponseGradient"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="0%"
                                stopColor="var(--chart-response)"
                                stopOpacity={0.25}
                              />

                              <stop
                                offset="95%"
                                stopColor="var(--chart-response)"
                                stopOpacity={0.01}
                              />
                            </linearGradient>
                          </defs>

                          <CartesianGrid
                            vertical={false}
                            stroke="var(--chart-grid)"
                            strokeDasharray="3 5"
                          />

                          <XAxis
                            dataKey="bucket"
                            tickFormatter={value =>
                              formatBucket(String(value), periodDays)
                            }
                            tickLine={false}
                            axisLine={false}
                            minTickGap={28}
                            tick={{
                              fill: 'var(--text-muted)',
                              fontSize: 11,
                            }}
                          />

                          <YAxis
                            domain={[0, 'dataMax']}
                            tickFormatter={value => `${value} ms`}
                            tickLine={false}
                            axisLine={false}
                            width={56}
                            tick={{
                              fill: 'var(--text-muted)',
                              fontSize: 11,
                            }}
                          />

                          <Tooltip
                            content={<ChartTooltip />}
                            cursor={{
                              stroke: 'var(--chart-cursor)',
                              strokeDasharray: '4 4',
                            }}
                          />

                          {summary?.avgResponseTimeMs != null && (
                            <ReferenceLine
                              y={summary.avgResponseTimeMs}
                              stroke="var(--chart-average)"
                              strokeDasharray="5 5"
                              ifOverflow="extendDomain"
                            />
                          )}

                          <Line
                            type="linear"
                            dataKey="avgResponseTimeMs"
                            name="Average response time"
                            stroke="var(--chart-response)"
                            strokeWidth={3}
                            dot={{ r: 4, fill: '#2563eb', stroke: '#ffffff', strokeWidth: 2 }}
                            activeDot={{
                              r: 6,
                              fill: '#2563eb',
                              stroke: '#ffffff',
                              strokeWidth: 2,
                            }}
                            connectNulls={false}
                            isAnimationActive
                            animationDuration={850}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    {responsePointCount === 1 && (
                      <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
                        1 recorded time bucket. A trend path will appear when at least two buckets contain response-time data. No values are inferred for missing periods.
                      </p>
                    )}
                    </>
                  ) : (
                    <p className="flex h-64 items-center justify-center text-sm text-slate-500">
                      No response-time history for this period.
                    </p>
                  )}
                </section>
              </div>

              {/* MONITOR UPTIME AND INCIDENT FREQUENCY */}

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

                {/* UPTIME BY MONITOR */}

                <section className="dashboard-panel min-w-0 overflow-hidden !p-0">
                  <div className="analytics-divider border-b p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2>Uptime by monitor</h2>

                        <p className="mt-1 text-xs text-slate-500">
                          Recorded availability for each monitor in this period.
                        </p>
                      </div>

                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                        <BarChart3 className="h-4 w-4" />
                      </div>
                    </div>
                  </div>

                  {monitorsWithUptime.length ? (
                    <div className="space-y-4 p-5">
                      {monitorsWithUptime
                        .slice()
                        .sort((a, b) => (b.uptime ?? 0) - (a.uptime ?? 0))
                        .map(monitor => {
                          const uptime = Math.max(0, Math.min(100, monitor.uptime ?? 0));
                          const tone = uptimeTone(monitor.uptime);
                          return (
                            <div key={monitor.id} className="min-w-0">
                              <div className="mb-2 flex min-w-0 items-center justify-between gap-3">
                                <span className="min-w-0 truncate text-sm font-semibold text-slate-700" title={monitor.name}>
                                  {monitor.name}
                                </span>
                                <span className="shrink-0 text-sm font-bold tabular-nums" style={{ color: tone }}>
                                  {monitor.uptime?.toFixed(2)}%
                                </span>
                              </div>
                              <div
                                className="h-3 overflow-hidden rounded-full bg-slate-100"
                                role="img"
                                aria-label={`${monitor.name}: ${monitor.uptime?.toFixed(2)} percent uptime`}
                              >
                                <div
                                  className="h-full rounded-full transition-[width] duration-500"
                                  style={{ width: `${uptime}%`, backgroundColor: tone }}
                                />
                              </div>
                              <p className="mt-1.5 text-xs text-slate-400">
                                {monitor.checkCount.toLocaleString()} recorded checks
                              </p>
                            </div>
                          );
                        })}
                      <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-emerald-500" /> Healthy ≥ 99%</span>
                        <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-amber-500" /> Warning 95–98.99%</span>
                        <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-rose-500" /> Critical &lt; 95%</span>
                      </div>
                    </div>
                  ) : (
                    <div className="analytics-empty">
                      <BarChart3 className="h-7 w-7 text-emerald-500" />
                      <p className="text-sm">
                        {data.monitors.length
                          ? 'No monitor checks were recorded in this period.'
                          : 'No monitors found.'}
                      </p>
                    </div>
                  )}
                  {monitorsWithoutChecks.length > 0 && (
                    <p className="analytics-divider border-t px-5 py-3 text-xs text-slate-500">
                      No checks: {monitorsWithoutChecks.map(monitor => monitor.name).join(', ')}
                    </p>
                  )}
                </section>

                {/* INCIDENT FREQUENCY */}

                <section className="dashboard-panel min-w-0">
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <div>
                      <h2>Incident frequency</h2>

                      <p className="mt-1 text-xs text-slate-500">
                        Number of new incidents recorded each day in the selected period.
                      </p>
                    </div>

                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-100 text-pink-600">
                      <AlertCircle className="h-4 w-4" />
                    </div>
                  </div>

                  {incidentTimeline.length ? (
                    <>
                      <div className="h-[280px] min-w-0 sm:h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={incidentTimeline}
                            margin={{
                              top: 12,
                              right: 12,
                              bottom: 4,
                              left: 0,
                            }}
                          >
                            <defs>
                              <linearGradient
                                id="analyticsIncidentGradient"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop
                                  offset="0%"
                                  stopColor="var(--danger)"
                                  stopOpacity={0.2}
                                />

                                <stop
                                  offset="95%"
                                  stopColor="var(--danger)"
                                  stopOpacity={0.01}
                                />
                              </linearGradient>
                            </defs>

                            <CartesianGrid
                              vertical={false}
                              stroke="var(--chart-grid)"
                              strokeDasharray="3 5"
                            />

                            <XAxis
                              dataKey="day"
                              tickFormatter={value =>
                                formatBucket(
                                  `${String(value)}T00:00:00Z`,
                                  periodDays
                                )
                              }
                              tickLine={false}
                              axisLine={false}
                              minTickGap={24}
                              tick={{
                                fill: 'var(--text-muted)',
                                fontSize: 11,
                              }}
                            />

                            <YAxis
                              allowDecimals={false}
                              domain={[
                                0,
                                (maximum: number) => Math.max(maximum, 1),
                              ]}
                              tickLine={false}
                              axisLine={false}
                              width={34}
                              tick={{
                                fill: 'var(--text-muted)',
                                fontSize: 11,
                              }}
                            />

                            <Tooltip
                              content={<IncidentTooltip />}
                              cursor={{
                                stroke: 'var(--chart-cursor)',
                                strokeDasharray: '4 4',
                              }}
                            />

                            <ReferenceLine
                              y={0}
                              stroke="var(--chart-average)"
                            />

                            <Bar
                              dataKey="incidents"
                              name="Incidents"
                              fill="#dc2626"
                              radius={[6, 6, 0, 0]}
                              maxBarSize={34}
                              isAnimationActive
                              animationDuration={650}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {data.incidentFrequency.length === 0 && (
                        <p className="mt-2 text-xs text-slate-500">
                          No incidents started during this period.
                        </p>
                      )}

                      <div className="mt-3 flex items-center justify-between border-t border-slate-200/70 pt-3">
                        <span className="text-xs text-slate-500">
                          Total incidents
                        </span>

                        <span className="rounded-full bg-pink-100 px-3 py-1 text-xs font-semibold text-pink-700">
                          {data.incidentFrequency.reduce(
                            (total, item) => total + item.incidents,
                            0
                          )}
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className="flex h-64 items-center justify-center text-sm text-slate-500">
                      No reporting dates are available.
                    </p>
                  )}
                </section>
              </div>

              {/* FOOTNOTE */}

              <div className="analytics-glass-card flex items-start gap-3 p-4 text-xs leading-5 text-slate-500">
                <BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />

                <p>
                  Uptime is calculated as successful checks divided by
                  checks recorded in the selected reporting period.
                </p>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
