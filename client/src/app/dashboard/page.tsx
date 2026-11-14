'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  Plus,
  Server,
  XCircle,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts';
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
} from 'framer-motion';

import { GlassCard } from '@/components/glass-card';
import { Sidebar } from '@/components/sidebar';
import {
  analyticsApi,
  api,
  dashboardApi,
  type AnalyticsData,
  type AuthUser,
  type DashboardData,
} from '@/lib/api';

type ChartRange = '24h' | '7d' | '30d';
type ChartPoint = DashboardData['timeline'][number];
type MetricKey = 'uptime' | 'avg_response_time_ms';

const rangeOptions: Array<{ value: ChartRange; label: string; days: number }> = [
  { value: '24h', label: '24h', days: 1 },
  { value: '7d', label: '7d', days: 7 },
  { value: '30d', label: '30d', days: 30 },
];

function parseDate(value: string) {
  return new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`);
}

function formatDate(value: string) {
  const date = parseDate(value);
  return Number.isNaN(date.getTime())
    ? 'Unknown'
    : date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
}

function relativeTime(value: string) {
  const date = parseDate(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';

  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function formatBucket(value: string, range: ChartRange) {
  const date = parseDate(value);
  if (Number.isNaN(date.getTime())) return value;
  return range === '24h'
    ? date.toLocaleTimeString([], { hour: 'numeric' })
    : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function statusForPoint(point: Pick<ChartPoint, 'checks' | 'uptime'>) {
  if (point.checks < 1 || point.uptime === null) return 'NO DATA';
  if (point.uptime >= 99) return 'UP';
  if (point.uptime >= 95) return 'WARNING';
  return 'DOWN';
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
          <filter id="market-line-blur" x="-20%" y="-100%" width="140%" height="300%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
          <filter id="market-line-soft-blur" x="-20%" y="-100%" width="140%" height="300%">
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
        <g filter="url(#market-line-blur)" opacity=".24" strokeWidth="18" strokeLinecap="round">
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
        <g filter="url(#market-line-soft-blur)" opacity=".32" strokeWidth="7" strokeLinecap="round">
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

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  const label = normalized === 'NO DATA'
    ? 'No data'
    : `${normalized.charAt(0)}${normalized.slice(1).toLowerCase()}`;
  const isUp = normalized === 'UP';
  const isDown = normalized === 'DOWN' || normalized === 'OPEN';
  const isPaused = normalized === 'PAUSED';
  const isResolved = normalized === 'RESOLVED';
  const tone = isUp
    ? 'status-badge--up'
    : isDown
      ? 'status-badge--down'
      : isResolved
        ? 'status-badge--resolved'
      : isPaused || normalized === 'NO DATA'
        ? 'status-badge--neutral'
        : 'status-badge--warning';

  return (
    <span className={`status-badge ${tone}`}>
      <span className="status-badge__dot" aria-hidden="true" />
      {label}
    </span>
  );
}

function AnimatedNumber({
  value,
  suffix = '',
  decimals = 0,
}: {
  value: number | null;
  suffix?: string;
  decimals?: number;
}) {
  const motionValue = useMotionValue(0);
  const formatted = useTransform(motionValue, current => current.toFixed(decimals));
  const [displayValue, setDisplayValue] = useState('0');
  const reduceMotion = useReducedMotion();

  useMotionValueEvent(formatted, 'change', setDisplayValue);

  useEffect(() => {
    if (value === null) {
      setDisplayValue('—');
      return;
    }

    if (reduceMotion) {
      motionValue.set(value);
      setDisplayValue(value.toFixed(decimals));
      return;
    }

    const controls = animate(motionValue, value, {
      duration: 0.8,
      ease: 'easeOut',
    });
    return controls.stop;
  }, [decimals, motionValue, reduceMotion, value]);

  return <>{value === null ? '—' : `${displayValue}${suffix}`}</>;
}

function Sparkline({
  values,
  color,
  label,
}: {
  values: Array<number | null>;
  color: string;
  label: string;
}) {
  const valid = values.filter((value): value is number => value !== null && Number.isFinite(value));
  if (valid.length < 2) return null;

  const minimum = Math.min(...valid);
  const maximum = Math.max(...valid);
  const spread = maximum - minimum || 1;
  const points = valid.map((value, index) => {
    const x = (index / (valid.length - 1)) * 100;
    const y = 28 - ((value - minimum) / spread) * 24;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg
      viewBox="0 0 100 32"
      className="h-8 w-24 shrink-0 overflow-visible"
      role="img"
      aria-label={label}
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type Trend = {
  label: string;
  direction: 'up' | 'down' | 'flat';
  favorable: boolean;
};

function trendFromTimeline(
  points: ChartPoint[],
  key: MetricKey,
  lowerIsBetter: boolean,
): Trend | undefined {
  const values = points
    .map(point => point[key])
    .filter((value): value is number => value !== null && Number.isFinite(value));
  if (values.length < 2) return undefined;

  const difference = values[values.length - 1] - values[0];
  if (Math.abs(difference) < 0.01) {
    return { label: 'No change', direction: 'flat', favorable: true };
  }

  const direction = difference > 0 ? 'up' : 'down';
  const amount = Math.abs(difference);
  const label = key === 'uptime'
    ? `${amount.toFixed(1)} pp`
    : `${Math.round(amount)} ms`;
  return {
    label,
    direction,
    favorable: lowerIsBetter ? difference < 0 : difference > 0,
  };
}

function TrendChip({ trend }: { trend?: Trend }) {
  if (!trend) return null;

  const Icon = trend.direction === 'up' ? ArrowUpRight : ArrowDownRight;
  const tone = trend.direction === 'flat'
    ? 'trend-chip--neutral'
    : trend.favorable
      ? 'trend-chip--good'
      : 'trend-chip--bad';

  return (
    <span className={`trend-chip ${tone}`}>
      {trend.direction === 'flat' ? (
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
      ) : (
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {trend.label}
    </span>
  );
}

function StatCard({
  label,
  value,
  suffix,
  decimals,
  note,
  icon: Icon,
  tone,
  trend,
  sparkline,
  sparklineLabel,
}: {
  label: string;
  value: number | null;
  suffix?: string;
  decimals?: number;
  note: string;
  icon: typeof Activity;
  tone: 'blue' | 'green' | 'amber' | 'red' | 'neutral';
  trend?: Trend;
  sparkline?: Array<number | null>;
  sparklineLabel?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 8 },
        show: { opacity: 1, y: 0, transition: { duration: reduceMotion ? 0 : 0.2 } },
      }}
    >
      <GlassCard interactive className="dashboard-stat-card !min-h-[166px] !border !border-white/80 !bg-white/65 !p-5 !shadow-[0_12px_36px_rgba(74,88,145,0.09)] !backdrop-blur-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[13px] font-medium text-secondary">{label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums text-primary">
              <AnimatedNumber value={value} suffix={suffix} decimals={decimals} />
            </p>
          </div>
          <span className={`stat-icon stat-icon--${tone}`}>
            <Icon className="h-5 w-5" strokeWidth={1.7} aria-hidden="true" />
          </span>
        </div>
        <div className="mt-4 flex min-h-8 items-end justify-between gap-2">
          <div className="min-w-0">
            {trend && <TrendChip trend={trend} />}
            <p className="mt-2 truncate text-xs text-muted">{note}</p>
          </div>
          {sparkline && (
            <Sparkline
              values={sparkline}
              color={
                tone === 'red'
                  ? 'var(--danger)'
                  : tone === 'amber'
                    ? 'var(--warning)'
                    : tone === 'blue'
                      ? 'var(--info)'
                      : tone === 'neutral'
                        ? 'var(--text-muted)'
                        : 'var(--success)'
              }
              label={sparklineLabel ?? `${label} over time`}
            />
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
}

function ChartSkeleton() {
  return (
    <div className="dashboard-skeleton h-[270px] rounded-xl" aria-label="Loading chart" />
  );
}

function ChartTooltip({ active, payload }: TooltipProps<number, string>) {
  const point = payload?.[0]?.payload as ChartPoint | undefined;
  if (!active || !point) return null;
  const response = point.avg_response_time_ms;

  return (
    <div className="chart-tooltip">
      <p className="font-medium text-primary">{formatDate(point.bucket)}</p>
      <p className="mt-1 text-sm text-secondary">
        {response === null ? 'No response-time data' : `${Math.round(response)} ms`}
      </p>
      <div className="mt-2 flex items-center justify-between gap-4">
        <span className="text-xs text-muted">
          {point.uptime === null ? 'No status data' : `${point.uptime.toFixed(2)}% uptime`}
        </span>
        <StatusBadge status={statusForPoint(point)} />
      </div>
    </div>
  );
}

function UptimeTooltip({ active, payload }: TooltipProps<number, string>) {
  const point = payload?.[0]?.payload as ChartPoint | undefined;
  if (!active || !point) return null;

  return (
    <div className="chart-tooltip">
      <p className="font-medium text-primary">{formatDate(point.bucket)}</p>
      <div className="mt-2 flex items-center justify-between gap-4">
        <span className="text-sm text-secondary">
          {point.uptime === null ? 'No checks recorded' : `${point.uptime.toFixed(2)}% uptime`}
        </span>
        <StatusBadge status={statusForPoint(point)} />
      </div>
      <p className="mt-1 text-xs text-muted">{point.checks} checks</p>
    </div>
  );
}

function RangeToggle({
  value,
  onChange,
  disabled,
  reduceMotion,
}: {
  value: ChartRange;
  onChange: (range: ChartRange) => void;
  disabled: boolean;
  reduceMotion: boolean;
}) {
  return (
    <div className="range-toggle" role="group" aria-label="Chart date range">
      {rangeOptions.map(option => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className="range-toggle__button"
        >
          {value === option.value && (
            <motion.span
              layoutId="dashboard-range-active"
              className="range-toggle__indicator"
              transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 30 }}
            />
          )}
          <span className="relative z-10">{option.label}</span>
        </button>
      ))}
    </div>
  );
}

function MetricSkeleton() {
  return (
    <div className="dashboard-skeleton h-[166px] rounded-xl" aria-label="Loading metric" />
  );
}

export default function DashboardPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [range, setRange] = useState<ChartRange>('24h');
  const [historicalData, setHistoricalData] = useState<AnalyticsData | null>(null);
  const [rangeLoading, setRangeLoading] = useState(false);
  const [rangeError, setRangeError] = useState('');
  const reduceMotion = useReducedMotion();

  const loadDashboard = useCallback(async (refresh = false, signal?: AbortSignal) => {
    if (!refresh) setLoading(true);
    setError('');

    try {
      const [dashboard, session] = await Promise.all([
        dashboardApi.get(signal),
        api<{ user: AuthUser }>('/auth/me', { signal }),
      ]);
      setData(dashboard);
      setUser(session.user);
    } catch (err) {
      if (!signal?.aborted) {
        setError(err instanceof Error ? err.message : 'Unable to load dashboard.');
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadDashboard(false, controller.signal);
    return () => controller.abort();
  }, [loadDashboard]);

  useEffect(() => {
    const controller = new AbortController();
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadDashboard(true, controller.signal);
      }
    }, 30_000);

    return () => {
      window.clearInterval(intervalId);
      controller.abort();
    };
  }, [loadDashboard]);

  useEffect(() => {
    if (range === '24h') {
      setHistoricalData(null);
      setRangeError('');
      setRangeLoading(false);
      return;
    }

    const controller = new AbortController();
    const days = rangeOptions.find(option => option.value === range)?.days ?? 1;
    const to = new Date();
    const from = new Date(to);
    from.setUTCDate(from.getUTCDate() - (days - 1));
    const fromDate = from.toISOString().slice(0, 10);
    const toDate = to.toISOString().slice(0, 10);

    setRangeLoading(true);
    setRangeError('');
    analyticsApi.get(fromDate, toDate, controller.signal)
      .then((result: AnalyticsData) => {
        setHistoricalData(result);
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setRangeError(err instanceof Error ? err.message : 'Unable to load this chart range.');
          setHistoricalData(null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setRangeLoading(false);
      });

    return () => controller.abort();
  }, [range]);

  const timeline: ChartPoint[] = range === '24h'
    ? data?.timeline ?? []
    : historicalData?.timeline.map(point => ({
        bucket: point.bucket,
        checks: point.checkCount,
        successful: point.successfulChecks,
        uptime: point.uptime,
        avg_response_time_ms: point.avgResponseTimeMs,
      })) ?? [];
  const stats = data?.stats;
  const responseAverage = useMemo(() => {
    if (range === '24h') return stats?.avgResponseTimeMs ?? null;
    return historicalData?.summary.avgResponseTimeMs ?? null;
  }, [historicalData, range, stats?.avgResponseTimeMs]);
  const statsTimeline = data?.timeline ?? [];

  const uptimeTrend = useMemo(
    () => trendFromTimeline(statsTimeline, 'uptime', false),
    [statsTimeline],
  );
  const responseTrend = useMemo(
    () => trendFromTimeline(statsTimeline, 'avg_response_time_ms', true),
    [statsTimeline],
  );
  const hasResponseData = timeline.some(point => point.avg_response_time_ms !== null);
  const uptimeChartData = timeline.map(point => ({
    ...point,
    healthyUptime: point.uptime !== null && point.uptime >= 99 ? point.uptime : null,
    warningUptime: point.uptime !== null && point.uptime >= 95 && point.uptime < 99 ? point.uptime : null,
    downUptime: point.uptime !== null && point.uptime < 95 ? point.uptime : null,
  }));
  const latestUptimePoint = timeline[timeline.length - 1];
  return (
    <div className="pulsewatch-dashboard relative isolate flex min-h-screen flex-col overflow-hidden bg-[#F6F8FA] text-[#151526] md:flex-row">

      <style jsx global>{`
        .pulsewatch-dashboard {
          --info: #2563eb;
          --success: #16834f;
          --warning: #b7791f;
          --danger: #dc2626;
          --text-primary: #172033;
          --text-secondary: #5b6678;
          --text-muted: #8993a3;
          --chart-grid: #e8edf2;
          --chart-cursor: #94a3b8;
          --chart-uptime: #16834f;
          --chart-response: #2563eb;
          --chart-average: #94a3b8;
          background: #f6f8fa;
          color: var(--text-primary);
        }

        .pulsewatch-dashboard .dashboard-market-backdrop {
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
        }
        .pulsewatch-dashboard .dashboard-market-backdrop svg {
          display: block;
          width: 100%;
          height: 100%;
        }
        .pulsewatch-dashboard .market-grid line {
          stroke: rgba(125, 145, 160, .12);
          stroke-width: 1;
          stroke-dasharray: 2 8;
        }
        .pulsewatch-dashboard main > header {
          background: rgba(255,255,255,.72) !important;
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
        }

        .pulsewatch-dashboard .dashboard-panel,
        .pulsewatch-dashboard .dashboard-stat-card {
          border: 1px solid #e6ebf0 !important;
          border-radius: 16px !important;
          background: #fff !important;
          box-shadow: 0 1px 2px rgba(16, 24, 40, .035) !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
        }

        .pulsewatch-dashboard .dashboard-stat-card:hover,
        .pulsewatch-dashboard .dashboard-panel:hover {
          border-color: #d7e0e8 !important;
          box-shadow: 0 5px 18px rgba(16, 24, 40, .055) !important;
        }

        .pulsewatch-dashboard .dashboard-panel { overflow: hidden; }
        .pulsewatch-dashboard .dashboard-panel__header {
          min-height: 72px;
          border-color: #edf0f3 !important;
          padding: 18px 20px;
        }

        .pulsewatch-dashboard .chart-tooltip {
          border: 1px solid #e4e9ef;
          border-radius: 10px;
          background: #fff;
          box-shadow: 0 8px 24px rgba(16, 24, 40, .12);
          padding: 11px 13px;
        }

        .pulsewatch-dashboard .dashboard-skeleton {
          background: linear-gradient(90deg, #f0f3f6 25%, #e7ecf1 50%, #f0f3f6 75%);
          background-size: 200% 100%;
          animation: pulsewatch-skeleton 1.35s ease-in-out infinite;
          border-radius: 12px;
        }

        .pulsewatch-dashboard .range-toggle {
          display: inline-flex;
          gap: 3px;
          border: 1px solid #e5eaf0;
          border-radius: 10px;
          background: #f8fafb;
          padding: 3px;
          box-shadow: none;
          backdrop-filter: none;
        }

        .pulsewatch-dashboard .range-toggle__button {
          min-height: 30px;
          padding: 0 10px;
          color: #667085;
          border-radius: 7px;
          transition: color 150ms ease, background 150ms ease, box-shadow 150ms ease;
        }

        .pulsewatch-dashboard .range-toggle__button:hover:not(:disabled) {
          color: #172033;
          background: #eef2f5;
        }

        .pulsewatch-dashboard .range-toggle__button[aria-pressed="true"] {
          color: #172033;
          font-weight: 650;
        }

        .pulsewatch-dashboard .range-toggle__indicator {
          border-radius: 7px;
          background: #fff;
          box-shadow: 0 1px 3px rgba(16, 24, 40, .12);
        }

        .pulsewatch-dashboard .status-badge {
          border-radius: 6px;
          font-weight: 650;
          letter-spacing: .01em;
        }

        .pulsewatch-dashboard .status-badge--up,
        .pulsewatch-dashboard .status-badge--resolved {
          color: #126b43;
          background: #e9f6ee;
        }
        .pulsewatch-dashboard .status-badge--down {
          color: #b42318;
          background: #fef0ef;
        }
        .pulsewatch-dashboard .status-badge--warning {
          color: #925f0a;
          background: #fff6df;
        }
        .pulsewatch-dashboard .status-badge--neutral {
          color: #667085;
          background: #f0f2f5;
        }

        .pulsewatch-dashboard .stat-icon {
          border-radius: 10px;
        }
        .pulsewatch-dashboard .stat-icon--blue { color: #2563eb; background: #eff5ff; }
        .pulsewatch-dashboard .stat-icon--green { color: #16834f; background: #eaf6ef; }
        .pulsewatch-dashboard .stat-icon--amber { color: #a66b12; background: #fff6df; }
        .pulsewatch-dashboard .stat-icon--red { color: #c83232; background: #fef0ef; }
        .pulsewatch-dashboard .stat-icon--neutral { color: #667085; background: #f0f2f5; }

        .pulsewatch-dashboard .text-primary { color: #172033 !important; }
        .pulsewatch-dashboard .text-secondary { color: #5b6678 !important; }
        .pulsewatch-dashboard .text-muted { color: #8993a3 !important; }
        .pulsewatch-dashboard .text-white { color: #172033 !important; }
        .pulsewatch-dashboard .bg-surface,
        .pulsewatch-dashboard .bg-surface-muted { background: #f8fafb !important; }
        .pulsewatch-dashboard .divide-subtle > :not([hidden]) ~ :not([hidden]) {
          border-color: #edf0f3 !important;
        }
        .pulsewatch-dashboard .hover\\:bg-surface-hover:hover { background: #f7f9fb !important; }

        .pulsewatch-dashboard .notice--error {
          border: 1px solid #f3c7c4;
          border-radius: 12px;
          background: #fff7f6;
          color: #a12620;
        }

        .pulsewatch-dashboard .empty-state,
        .pulsewatch-dashboard .panel-empty,
        .pulsewatch-dashboard .chart-empty {
          border-color: #e6ebf0;
          color: #667085;
        }

        .pulsewatch-dashboard .ui-button {
          min-height: 40px;
          border-radius: 9px;
          font-weight: 600;
          transition: transform 150ms ease, background 150ms ease, border-color 150ms ease, box-shadow 150ms ease;
        }
        .pulsewatch-dashboard .ui-button:active { transform: translateY(1px) scale(.985); }
        .pulsewatch-dashboard .ui-button:focus-visible,
        .pulsewatch-dashboard button:focus-visible,
        .pulsewatch-dashboard a:focus-visible {
          outline: 3px solid rgba(37, 99, 235, .28);
          outline-offset: 2px;
        }
        .pulsewatch-dashboard .ui-button-secondary {
          border: 1px solid #dfe5eb;
          background: #fff;
          color: #344054;
          box-shadow: none;
          backdrop-filter: none;
        }
        .pulsewatch-dashboard .ui-button-secondary:hover:not(:disabled) {
          border-color: #cbd5df;
          background: #f8fafb;
        }
        .pulsewatch-dashboard .ui-button-primary {
          border: 1px solid #147447;
          background: #16834f;
          color: #fff;
          box-shadow: none;
        }
        .pulsewatch-dashboard .ui-button-primary:hover:not(:disabled) {
          border-color: #116b40;
          background: #126f43;
          box-shadow: 0 3px 8px rgba(22, 131, 79, .16);
          transform: translateY(-1px);
        }
        .pulsewatch-dashboard .ui-button:disabled {
          cursor: not-allowed;
          opacity: .55;
        }
        .pulsewatch-dashboard .ui-link { color: #176b48; }
        .pulsewatch-dashboard .ui-link:hover { color: #0f5135; }
        .pulsewatch-dashboard table thead { background: #f8fafb !important; }
        .pulsewatch-dashboard table tbody tr:hover { background: #f8fafb; }

        .pulsewatch-dashboard .brand-accent { color: #16834f !important; }
        .pulsewatch-dashboard .sidebar-wordmark {
          color: transparent !important;
          background: linear-gradient(90deg, #172033 0 43%, #16834f 43% 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        @keyframes pulsewatch-skeleton {
          0% { background-position: 100% 0; }
          100% { background-position: -100% 0; }
        }

        @media (prefers-reduced-motion: reduce) {
          .pulsewatch-dashboard .dashboard-skeleton { animation: none !important; }
          .pulsewatch-dashboard *,
          .pulsewatch-dashboard *::before,
          .pulsewatch-dashboard *::after {
            scroll-behavior: auto !important;
            transition-duration: .01ms !important;
          }
        }
      `}</style>
      <AmbientMarketBackdrop />
      <Sidebar user={user} incidentCount={stats?.activeIncidents ?? null} />
      <main className="relative z-10 flex min-w-0 flex-1 flex-col overflow-y-auto pb-24 md:pb-0">
        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 border-b border-white/70 bg-white/55 px-5 py-5 shadow-[0_8px_30px_rgba(89,102,160,0.05)] backdrop-blur-2xl sm:px-8">
          <div className="min-w-0">
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#151526]">
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {data?.period.label ?? 'Last 24 hours'}
            </p>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Link
              href="/monitors/new"
              className="ui-button ui-button-primary min-h-10 w-full sm:w-auto"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add monitor
            </Link>
          </div>
        </header>

        <div className="mx-auto w-full max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
          {error && (
            <div role="alert" className="notice notice--error">
              <XCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
              <button
                type="button"
                onClick={() => void loadDashboard(true)}
                className="ml-auto font-medium underline underline-offset-2"
              >
                Retry
              </button>
            </div>
          )}

          <motion.section
            aria-label="Monitoring statistics"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: {
                transition: reduceMotion ? { duration: 0 } : { staggerChildren: 0.04 },
              },
            }}
          >
            {loading && !data ? (
              [0, 1, 2, 3].map(index => <MetricSkeleton key={index} />)
            ) : stats ? (
              [
                <StatCard
                  key="uptime"
                  label="Overall uptime"
                  value={stats.overallUptime}
                  suffix="%"
                  decimals={2}
                  note={stats.checkCount ? `${stats.checkCount.toLocaleString()} checks · 24h` : 'No checks recorded'}
                  icon={Activity}
                  tone="green"
                  trend={uptimeTrend}
                  sparkline={statsTimeline.map(point => point.uptime)}
                  sparklineLabel="Recorded uptime trend"
                />,
                <StatCard
                  key="monitors"
                  label="Operational monitors"
                  value={stats.operationalMonitors}
                  note={`${stats.totalMonitors} total · ${stats.pausedMonitors} paused`}
                  icon={Server}
                  tone="blue"
                />,
                <StatCard
                  key="incidents"
                  label="Active incidents"
                  value={stats.activeIncidents}
                  note={stats.downMonitors ? `${stats.downMonitors} monitors down` : 'No monitors down'}
                  icon={AlertTriangle}
                  tone={stats.activeIncidents ? 'red' : 'neutral'}
                />,
                <StatCard
                  key="response"
                  label="Avg response time"
                  value={stats.avgResponseTimeMs}
                  suffix={stats.avgResponseTimeMs === null ? '' : ' ms'}
                  note={stats.checkCount ? 'Across recorded checks · 24h' : 'No response data'}
                  icon={Clock3}
                  tone="blue"
                  trend={responseTrend}
                  sparkline={statsTimeline.map(point => point.avg_response_time_ms)}
                  sparklineLabel="Recorded response time trend in milliseconds"
                />,
              ]
            ) : (
              <div className="col-span-full rounded-xl border border-dashed border-subtle bg-surface p-8 text-center">
                <p className="text-sm text-secondary">Dashboard metrics are unavailable.</p>
                <button
                  type="button"
                  onClick={() => void loadDashboard(true)}
                  className="ui-button ui-button-secondary mt-4"
                >
                  Try again
                </button>
              </div>
            )}
          </motion.section>

          {data && stats?.totalMonitors === 0 && (
            <motion.section
              className="empty-state"
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <span className="empty-state__icon"><Server className="h-5 w-5" /></span>
              <h2 className="mt-4 font-semibold text-primary">No monitors yet</h2>
              <p className="mt-1 max-w-md text-sm text-secondary">
                Create a monitor to start collecting real availability and response-time data.
              </p>
              <Link href="/monitors/new" className="ui-button ui-button-primary mt-5">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Create monitor
              </Link>
            </motion.section>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-primary">Performance</h2>
              <p className="mt-1 text-sm text-muted">Only recorded checks are included.</p>
            </div>
            <RangeToggle value={range} onChange={setRange} disabled={rangeLoading} reduceMotion={Boolean(reduceMotion)} />
          </div>

          {rangeError && (
            <div role="alert" className="notice notice--error">
              <XCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{rangeError}</span>
            </div>
          )}

          <motion.div
            className="grid grid-cols-1 gap-4 xl:grid-cols-2"
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: {
                transition: reduceMotion ? { duration: 0 } : { staggerChildren: 0.04 },
              },
            }}
          >
            <motion.section
              variants={{
                hidden: { opacity: 0, y: 8 },
                show: { opacity: 1, y: 0, transition: { duration: reduceMotion ? 0 : 0.2 } },
              }}
              className="dashboard-panel"
            >
              <div className="dashboard-panel__header">
                <div>
                  <h3 className="font-semibold text-primary">Uptime overview</h3>
                  <p className="mt-1 text-xs text-muted">
                    Availability history · {range === '24h' ? 'hourly' : 'daily'} checks
                  </p>
                </div>
                {latestUptimePoint && (
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <span className={`h-2 w-2 rounded-full ${statusForPoint(latestUptimePoint) === 'DOWN' ? 'bg-red-500' : statusForPoint(latestUptimePoint) === 'WARNING' ? 'bg-amber-500' : statusForPoint(latestUptimePoint) === 'UP' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <span>Latest recorded check</span>
                    <StatusBadge status={statusForPoint(latestUptimePoint)} />
                  </div>
                )}
              </div>
              {rangeLoading || (loading && !data) ? (
                <ChartSkeleton />
              ) : timeline.length ? (
                <div className="px-3 pb-4 pt-2 sm:px-5">
                  <div className="mb-2 flex items-center justify-between gap-3 px-1 text-xs text-muted">
                    <span>{formatBucket(timeline[0].bucket, range)}</span>
                    <span className="inline-flex items-center gap-3">
                      <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-emerald-600" />Healthy</span>
                      <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-amber-500" />Warning</span>
                      <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-red-500" />Down</span>
                    </span>
                    <span>{formatBucket(timeline[timeline.length - 1].bucket, range)}</span>
                  </div>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={uptimeChartData} margin={{ top: 18, right: 12, bottom: 4, left: 0 }}>
                        <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="2 5" />
                        <XAxis
                          dataKey="bucket"
                          tickFormatter={value => formatBucket(String(value), range)}
                          tickLine={false}
                          axisLine={false}
                          minTickGap={24}
                          tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                        />
                        <YAxis
                          domain={[0, 100]}
                          tickFormatter={value => `${value}%`}
                          tickLine={false}
                          axisLine={false}
                          width={42}
                          tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                        />
                        <Tooltip
                          content={<UptimeTooltip />}
                          cursor={{ stroke: 'var(--chart-cursor)', strokeDasharray: '3 4' }}
                        />
                        <ReferenceLine y={95} stroke="#d97706" strokeDasharray="4 5" strokeOpacity={0.7} />
                        <Line
                          type="monotone"
                          dataKey="healthyUptime"
                          name="Healthy uptime"
                          stroke="#16834f"
                          strokeWidth={2.4}
                          dot={false}
                          activeDot={{ r: 4, fill: '#16834f', stroke: '#fff', strokeWidth: 2 }}
                          connectNulls={false}
                          isAnimationActive={!reduceMotion}
                          animationDuration={1100}
                          animationEasing="ease-out"
                        />
                        <Line
                          type="monotone"
                          dataKey="warningUptime"
                          name="Warning uptime"
                          stroke="#d97706"
                          strokeWidth={2.4}
                          dot={{ r: 2.5, fill: '#d97706', strokeWidth: 0 }}
                          activeDot={{ r: 4, fill: '#d97706', stroke: '#fff', strokeWidth: 2 }}
                          connectNulls={false}
                          isAnimationActive={!reduceMotion}
                          animationDuration={1100}
                          animationEasing="ease-out"
                        />
                        <Line
                          type="monotone"
                          dataKey="downUptime"
                          name="Degraded uptime"
                          stroke="#dc2626"
                          strokeWidth={2.6}
                          dot={{ r: 2.5, fill: '#dc2626', strokeWidth: 0 }}
                          activeDot={{ r: 4, fill: '#dc2626', stroke: '#fff', strokeWidth: 2 }}
                          connectNulls={false}
                          isAnimationActive={!reduceMotion}
                          animationDuration={1100}
                          animationEasing="ease-out"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="mt-1 px-1 text-[11px] text-muted">
                    Based on recorded checks. Missing intervals are shown as gaps.
                  </p>
                </div>
              ) : (
                <div className="chart-empty">
                  <Activity className="h-5 w-5 text-muted" aria-hidden="true" />
                  <p>No uptime checks were recorded in this period.</p>
                </div>
              )}
            </motion.section>

            <motion.section
              variants={{
                hidden: { opacity: 0, y: 8 },
                show: { opacity: 1, y: 0, transition: { duration: reduceMotion ? 0 : 0.2 } },
              }}
              className="dashboard-panel"
            >
              <div className="dashboard-panel__header">
                <div>
                  <h3 className="font-semibold text-primary">Response time</h3>
                  <p className="mt-1 text-xs text-muted">Average latency per recorded bucket</p>
                </div>
                {responseAverage !== null && (
                  <span className="text-right text-xs text-muted">
                    Average <strong className="ml-1 font-semibold text-primary">{Math.round(responseAverage)} ms</strong>
                  </span>
                )}
              </div>
              {rangeLoading || (loading && !data) ? (
                <ChartSkeleton />
              ) : hasResponseData ? (
                <div className="h-[270px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timeline} margin={{ top: 16, right: 12, bottom: 4, left: 0 }}>
                      <defs>
                        <linearGradient id="responseTimeGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--chart-response)" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="var(--chart-response)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 5" />
                      <XAxis
                        dataKey="bucket"
                        tickFormatter={value => formatBucket(String(value), range)}
                        tickLine={false}
                        axisLine={false}
                        minTickGap={24}
                        tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                      />
                      <YAxis
                        tickFormatter={value => `${value} ms`}
                        tickLine={false}
                        axisLine={false}
                        width={52}
                        tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                      />
                      <Tooltip
                        content={<ChartTooltip />}
                        cursor={{ stroke: 'var(--chart-cursor)', strokeDasharray: '4 4' }}
                      />
                      {responseAverage !== null && (
                        <ReferenceLine
                          y={responseAverage}
                          stroke="var(--chart-average)"
                          strokeDasharray="5 5"
                          ifOverflow="extendDomain"
                        />
                      )}
                      <Area
                        type="monotone"
                        dataKey="avg_response_time_ms"
                        name="Response time"
                        stroke="var(--chart-response)"
                        strokeWidth={1.5}
                        fill="url(#responseTimeGradient)"
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                        connectNulls={false}
                        isAnimationActive={!reduceMotion}
                        animationDuration={600}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="chart-empty">
                  <Clock3 className="h-5 w-5 text-muted" aria-hidden="true" />
                  <p>No response-time data is available for this period.</p>
                </div>
              )}
            </motion.section>
          </motion.div>

          {data && (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <motion.section
                className="dashboard-panel overflow-hidden p-0"
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: reduceMotion ? 0 : 0.08 }}
              >
                <div className="dashboard-panel__header border-b border-subtle">
                  <div>
                    <h3 className="font-semibold text-primary">Recent incidents</h3>
                    <p className="mt-1 text-xs text-muted">Latest incident activity</p>
                  </div>
                  <Link href="/incidents" className="ui-link">View all</Link>
                </div>
                {data.recentIncidents.length ? (
                  <div className="divide-y divide-subtle">
                    {data.recentIncidents.map(incident => (
                      <Link
                        key={incident.id}
                        href={`/incidents/${encodeURIComponent(incident.id)}`}
                        className="flex min-h-[68px] items-center justify-between gap-4 px-5 py-3 transition hover:bg-surface-hover"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className={`incident-icon ${incident.status === 'RESOLVED' ? 'incident-icon--resolved' : 'incident-icon--open'}`}>
                            {incident.status === 'RESOLVED'
                              ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                              : <AlertTriangle className="h-4 w-4" aria-hidden="true" />}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-primary">{incident.title}</p>
                            <p className="mt-1 truncate text-xs text-muted">
                              {incident.monitor_name} · {relativeTime(incident.started_at)}
                            </p>
                          </div>
                        </div>
                        <StatusBadge status={incident.status} />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="panel-empty">
                    <CheckCircle2 className="h-5 w-5 text-success" aria-hidden="true" />
                    <p>No incidents recorded.</p>
                  </div>
                )}
              </motion.section>

              <motion.section
                className="dashboard-panel overflow-hidden p-0"
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: reduceMotion ? 0 : 0.14 }}
              >
                <div className="dashboard-panel__header border-b border-subtle">
                  <div>
                    <h3 className="font-semibold text-primary">Recent health checks</h3>
                    <p className="mt-1 text-xs text-muted">Latest monitor responses</p>
                  </div>
                  <Link href="/monitors" className="ui-link">View monitors</Link>
                </div>
                {data.recentActivity.length ? (
                  <>
                    <div className="hidden max-h-[420px] overflow-auto md:block">
                      <table className="w-full border-collapse text-left">
                        <thead className="sticky top-0 z-10 bg-surface-muted text-[11px] font-medium uppercase tracking-wide text-muted">
                          <tr>
                            <th scope="col" className="px-5 py-3">Monitor</th>
                            <th scope="col" className="px-3 py-3">Status</th>
                            <th scope="col" className="px-3 py-3">Response</th>
                            <th scope="col" className="px-5 py-3 text-right">Checked</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-subtle">
                          {data.recentActivity.map(activity => (
                            <tr key={activity.id} className="transition hover:bg-surface-hover">
                              <td className="max-w-[240px] px-5 py-3">
                                <Link
                                  href={`/monitors/${encodeURIComponent(activity.monitor_id)}`}
                                  className="block truncate text-sm font-medium text-primary hover:text-accent"
                                >
                                  {activity.monitor_name}
                                </Link>
                                <span className="mt-1 block truncate text-xs text-muted">
                                  {activity.status_code ?? activity.error ?? 'No response'}
                                </span>
                              </td>
                              <td className="px-3 py-3"><StatusBadge status={activity.status} /></td>
                              <td className="px-3 py-3 text-sm text-secondary">
                                {activity.latency_ms == null ? '—' : `${activity.latency_ms} ms`}
                              </td>
                              <td className="px-5 py-3 text-right text-xs text-muted" title={formatDate(activity.checked_at)}>
                                {relativeTime(activity.checked_at)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="divide-y divide-subtle md:hidden">
                      {data.recentActivity.map(activity => (
                        <article key={activity.id} className="space-y-3 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <Link
                              href={`/monitors/${encodeURIComponent(activity.monitor_id)}`}
                              className="min-w-0 truncate text-sm font-medium text-primary"
                            >
                              {activity.monitor_name}
                            </Link>
                            <StatusBadge status={activity.status} />
                          </div>
                          <div className="flex items-center justify-between gap-3 text-xs text-muted">
                            <span className="truncate">{activity.status_code ?? activity.error ?? 'No response'}</span>
                            <span className="shrink-0">{activity.latency_ms == null ? '—' : `${activity.latency_ms} ms`}</span>
                          </div>
                          <p className="text-xs text-muted" title={formatDate(activity.checked_at)}>
                            Checked {relativeTime(activity.checked_at)}
                          </p>
                        </article>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="panel-empty">
                    <Activity className="h-5 w-5 text-muted" aria-hidden="true" />
                    <p>No health checks recorded yet.</p>
                  </div>
                )}
              </motion.section>
            </div>
          )}

          <Link href="/analytics" className="ui-link inline-flex items-center gap-2">
            <BarChart3 className="h-4 w-4" aria-hidden="true" />
            Explore historical analytics
          </Link>
        </div>
      </main>
    </div>
  );
}
