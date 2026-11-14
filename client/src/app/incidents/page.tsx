
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Activity,
  CheckCircle2,
  Clock,
  Search,
  ExternalLink,
  ShieldCheck,
  Loader2,
  CircleAlert,
  Eye,
  PauseCircle,
  Sparkles,
  X,
} from 'lucide-react';

import { Sidebar } from '@/components/sidebar';
import { api, type AuthUser } from '@/lib/api';

type Incident = {
  id: string;
  user_id: string;
  monitor_id: string;
  title: string;
  message: string | null;
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | string;
  started_at: string;
  resolved_at: string | null;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  resolution_type: string | null;
  resolution_note: string | null;
  monitor_name: string;
  monitor_url: string;
  monitor_status: string;
  monitor_is_active: number | boolean;
};

type Filter = 'ALL' | 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';

function formatDate(value: string | null) {
  if (!value) return 'Not available';

  const normalized = value.includes('T')
    ? value
    : `${value.replace(' ', 'T')}Z`;

  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) return 'Unknown';

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(date);
}

function getDuration(start: string, end: string | null) {
  const parse = (value: string) =>
    new Date(
      value.includes('T') ? value : `${value.replace(' ', 'T')}Z`,
    );

  const startTime = parse(start).getTime();
  const endTime = end ? parse(end).getTime() : Date.now();

  if (Number.isNaN(startTime) || Number.isNaN(endTime)) {
    return '—';
  }

  const totalSeconds = Math.max(
    0,
    Math.floor((endTime - startTime) / 1000),
  );

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;

  return `${minutes}m`;
}

function getStatusStyles(status: string) {
  switch (status) {
    case 'OPEN':
      return {
        badge: 'bg-rose-50 text-rose-700 border-rose-200',
        dot: 'bg-rose-500',
        icon: AlertTriangle,
        label: 'Open',
      };

    case 'ACKNOWLEDGED':
      return {
        badge: 'bg-amber-50 text-amber-700 border-amber-200',
        dot: 'bg-amber-500',
        icon: Eye,
        label: 'Acknowledged',
      };

    case 'RESOLVED':
      return {
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500',
        icon: CheckCircle2,
        label: 'Resolved',
      };

    default:
      return {
        badge: 'bg-slate-50 text-slate-600 border-slate-200',
        dot: 'bg-slate-400',
        icon: Activity,
        label: status,
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
    <div className="incidents-market-backdrop" aria-hidden="true">
      <svg viewBox="0 0 1440 320" preserveAspectRatio="none">
        <defs>
          <filter id="incidents-market-line-blur" x="-20%" y="-100%" width="140%" height="300%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
          <filter id="incidents-market-line-soft-blur" x="-20%" y="-100%" width="140%" height="300%">
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
        <g filter="url(#incidents-market-line-blur)" opacity=".24" strokeWidth="18" strokeLinecap="round">
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
        <g filter="url(#incidents-market-line-soft-blur)" opacity=".32" strokeWidth="7" strokeLinecap="round">
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


export default function IncidentsPage() {
  const [user, setUser] = useState<AuthUser | null>(null);

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(
    null,
  );
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const [error, setError] = useState('');

  useEffect(() => {
    const storedUser = localStorage.getItem('pulsewatch_user');

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser) as AuthUser);
      } catch {
        setUser(null);
      }
    }
  }, []);

  const loadIncidents = useCallback(
    async (showRefresh = false) => {
      if (!showRefresh) {
        setLoading(true);
      }

      setError('');

      try {
        const data = await api<Incident[]>('/incidents');

        setIncidents(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load incidents.',
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Initial load and periodic refresh.
  useEffect(() => {
    loadIncidents();

    const interval = window.setInterval(() => {
      loadIncidents(true);
    }, 15000);

    return () => window.clearInterval(interval);
  }, [loadIncidents]);

  const counts = useMemo(() => {
    const open = incidents.filter(
      (incident) => incident.status === 'OPEN',
    ).length;

    const acknowledged = incidents.filter(
      (incident) => incident.status === 'ACKNOWLEDGED',
    ).length;

    const resolved = incidents.filter(
      (incident) => incident.status === 'RESOLVED',
    ).length;

    return {
      total: incidents.length,
      open,
      acknowledged,
      resolved,
      active: open + acknowledged,
    };
  }, [incidents]);

  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      const matchesFilter =
        filter === 'ALL' || incident.status === filter;

      const query = search.toLowerCase().trim();

      const matchesSearch =
        !query ||
        incident.title?.toLowerCase().includes(query) ||
        incident.monitor_name?.toLowerCase().includes(query) ||
        incident.monitor_url?.toLowerCase().includes(query) ||
        incident.message?.toLowerCase().includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [incidents, filter, search]);

  async function acknowledgeIncident(id: string) {
    setAcknowledgingId(id);
    setError('');

    try {
      await api<{ acknowledged: boolean }>(
        `/incidents/${id}/acknowledge`,
        { method: 'POST' },
      );

      await loadIncidents(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to acknowledge incident.',
      );
    } finally {
      setAcknowledgingId(null);
    }
  }

  async function resolveIncident(id: string) {
    if (
      !window.confirm(
        'Manually resolve this incident? This is separate from acknowledgement and does not verify that the monitor has recovered.',
      )
    ) {
      return;
    }

    setResolvingId(id);
    setError('');

    try {
      await api<{ resolved: boolean }>(
        `/incidents/${id}/resolve`,
        { method: 'POST' },
      );

      await loadIncidents(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to resolve incident.',
      );
    } finally {
      setResolvingId(null);
    }
  }

  const summaryCards = [
    {
      label: 'Total incidents',
      value: counts.total,
      description: 'Latest 200 recorded incidents',
      icon: Activity,
      color: 'blue',
    },
    {
      label: 'Open incidents',
      value: counts.open,
      description: 'Awaiting acknowledgement',
      icon: AlertTriangle,
      color: 'rose',
    },
    {
      label: 'Acknowledged',
      value: counts.acknowledged,
      description: 'Currently being investigated',
      icon: Eye,
      color: 'amber',
    },
    {
      label: 'Resolved incidents',
      value: counts.resolved,
      description: 'Automatically recovered or manually resolved',
      icon: CheckCircle2,
      color: 'emerald',
    },
  ];

  const filters: Filter[] = [
    'ALL',
    'OPEN',
    'ACKNOWLEDGED',
    'RESOLVED',
  ];

  return (
    <div className="pulsewatch-page min-h-screen w-full">
      <AmbientMarketBackdrop />
      <Sidebar user={user} />

      <main className="incidents-main relative z-10 flex min-w-0 flex-col overflow-y-auto">
        {/* Page header */}
        <header className="page-header sticky top-0 z-20 px-5 py-5 sm:px-8 lg:px-10">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="eyebrow">
                  <Activity className="h-3.5 w-3.5" />
                  RELIABILITY CENTER
                </span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Incidents
              </h1>

              <p className="mt-1.5 text-sm text-slate-500">
                Investigate service disruptions and track incident recovery.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50/80 px-3 py-2 text-xs font-semibold text-emerald-700 sm:flex">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Auto-refresh enabled
              </div>

            </div>
          </div>
        </header>

        <div className="incident-content space-y-7 px-5 pb-10 pt-6 sm:px-8 lg:px-10">
          {/* Error message */}
          {error && (
            <div
              role="alert"
              className="glass-panel flex items-start gap-3 border border-rose-200 bg-rose-50/80 px-4 py-4"
            >
              <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />

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

          {/* Summary cards */}
          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-800">
                  Incident overview
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  A snapshot of your recorded incidents.
                </p>
              </div>

              <span className="text-xs text-slate-400">
                {loading ? 'Updating...' : `${counts.active} active`}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {summaryCards.map((card) => {
                const Icon = card.icon;

                return (
                  <div
                    key={card.label}
                    className={`summary-card summary-${card.color} glass-panel p-5`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-slate-500">
                          {card.label}
                        </p>

                        <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
                          {loading ? '—' : card.value}
                        </p>
                      </div>

                      <div className="summary-icon">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>

                    <p className="mt-3 text-[11px] leading-5 text-slate-400">
                      {card.description}
                    </p>

                    <div className="summary-accent" />
                  </div>
                );
              })}
            </div>
          </section>

          {/* Active incident indicator */}
          {!loading && counts.active > 0 && (
            <div className="active-banner flex flex-col gap-3 rounded-2xl px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="active-banner-icon">
                  <AlertTriangle className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {counts.active} active{' '}
                    {counts.active === 1 ? 'incident' : 'incidents'}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600">
                    {counts.open} open · {counts.acknowledged} acknowledged
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setFilter('OPEN')}
                className="w-fit text-xs font-semibold text-rose-700 transition hover:text-rose-900"
              >
                View open incidents →
              </button>
            </div>
          )}

          {/* Incident history */}
          <section className="glass-panel overflow-hidden">
            {/* Section heading and filters */}
            <div className="panel-heading flex flex-col justify-between gap-4 px-5 py-5 lg:flex-row lg:items-center lg:px-6">
              <div>
                <div className="flex items-center gap-2">
                  <div className="section-icon blue-icon">
                    <ShieldCheck className="h-4 w-4" />
                  </div>

                  <h2 className="text-base font-bold text-slate-900">
                    Incident history
                  </h2>
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  Acknowledgement and manual resolution are separate actions.
                </p>
              </div>

              <div className="incident-toolbar-controls flex flex-col gap-3 sm:flex-row">
                {/* Search */}
                <div className="search-box relative min-w-0">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search incidents..."
                    aria-label="Search incidents"
                    className="w-full rounded-xl py-2.5 pl-9 pr-9 text-sm outline-none transition sm:w-56"
                  />

                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      aria-label="Clear search"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Status filters */}
                <div className="filter-group flex flex-wrap items-center gap-1 rounded-xl p-1">
                  {filters.map((item) => (
                    <button
                      key={item}
                      onClick={() => setFilter(item)}
                      aria-pressed={filter === item}
                      className={`filter-button rounded-lg px-3 py-2 text-[11px] font-semibold transition ${
                        filter === item ? 'filter-active' : ''
                      }`}
                    >
                      {item === 'ALL'
                        ? 'All'
                        : item === 'OPEN'
                          ? 'Open'
                          : item === 'ACKNOWLEDGED'
                            ? 'Acknowledged'
                            : 'Resolved'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Loading */}
            {loading ? (
              <div className="flex min-h-72 flex-col items-center justify-center text-slate-500">
                <div className="loading-icon">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>

                <p className="mt-4 text-sm font-semibold text-slate-700">
                  Loading incidents...
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Retrieving your incident history.
                </p>
              </div>
            ) : filteredIncidents.length === 0 ? (
              /* Empty states */
              <div className="flex min-h-80 flex-col items-center justify-center px-6 py-16 text-center">
                <div
                  className={`empty-icon ${
                    incidents.length === 0 ? 'empty-success' : ''
                  }`}
                >
                  {incidents.length === 0 ? (
                    <ShieldCheck className="h-7 w-7 text-emerald-500" />
                  ) : (
                    <Search className="h-7 w-7 text-violet-500" />
                  )}
                </div>

                <h3 className="mt-5 text-base font-bold text-slate-800">
                  {incidents.length === 0
                    ? 'No incidents recorded'
                    : 'No matching incidents'}
                </h3>

                <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                  {incidents.length === 0
                    ? 'Your monitored services have no recorded incidents yet. New incidents will appear here when a monitor detects a confirmed failure.'
                    : 'Try changing the status filter or search term to find the incident you are looking for.'}
                </p>

                {(search || filter !== 'ALL') && incidents.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setFilter('ALL');
                    }}
                    className="mt-5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                  >
                    Clear filters
                  </button>
                )}

                {incidents.length === 0 && (
                  <div className="mt-5 flex items-center gap-2 text-xs font-medium text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                    No recorded service disruptions
                  </div>
                )}
              </div>
            ) : (
              /* Incident list */
              <div className="divide-y divide-slate-100/80">
                {filteredIncidents.map((incident) => {
                  const isOpen = incident.status === 'OPEN';
                  const isAcknowledged =
                    incident.status === 'ACKNOWLEDGED';
                  const isResolved = incident.status === 'RESOLVED';

                  const isPaused =
                    incident.monitor_is_active === false ||
                    Number(incident.monitor_is_active) === 0;

                  const statusStyles = getStatusStyles(incident.status);
                  const StatusIcon = statusStyles.icon;

                  return (
                    <article
                      key={incident.id}
                      className="incident-row px-5 py-5 sm:px-6 sm:py-6"
                    >
                      <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-start">
                        {/* Incident information */}
                        <div className="flex min-w-0 gap-4">
                          <div
                            className={`incident-icon ${
                              isOpen
                                ? 'incident-open'
                                : isAcknowledged
                                  ? 'incident-acknowledged'
                                  : 'incident-resolved'
                            }`}
                          >
                            {isOpen ? (
                              <AlertTriangle className="h-5 w-5" />
                            ) : isAcknowledged ? (
                              <Eye className="h-5 w-5" />
                            ) : (
                              <CheckCircle2 className="h-5 w-5" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="break-words text-sm font-bold text-slate-900 sm:text-base">
                                {incident.title || 'Monitor incident'}
                              </h3>

                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusStyles.badge}`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${statusStyles.dot}`}
                                />
                                {statusStyles.label}
                              </span>

                              {isPaused && !isResolved && (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                                  <PauseCircle className="h-3 w-3" />
                                  Monitor paused
                                </span>
                              )}
                            </div>

                            <p className="mt-2 text-sm font-medium text-slate-600">
                              {incident.monitor_name || 'Unknown monitor'}
                            </p>

                            {incident.monitor_url && (
                              <a
                                href={incident.monitor_url}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-1 inline-flex max-w-full items-center gap-1.5 break-all text-xs font-medium text-blue-600 transition hover:text-blue-800"
                              >
                                <span className="break-all">
                                  {incident.monitor_url}
                                </span>
                                <ExternalLink className="h-3 w-3 shrink-0" />
                              </a>
                            )}

                            {incident.message && (
                              <p className="mt-3 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-slate-500">
                                {incident.message}
                              </p>
                            )}

                            {isAcknowledged && incident.acknowledged_at && (
                              <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                                <Eye className="h-3.5 w-3.5" />
                                Acknowledged on{' '}
                                {formatDate(incident.acknowledged_at)}
                              </div>
                            )}

                            {isResolved && (
                              <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3">
                                <div className="flex items-start gap-2">
                                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />

                                  <div>
                                    <p className="text-xs font-bold text-emerald-800">
                                      Resolution recorded
                                    </p>

                                    <p className="mt-1 text-xs leading-5 text-emerald-700">
                                      {incident.resolution_type === 'AUTOMATIC'
                                        ? 'Automatically verified recovery'
                                        : incident.resolution_type || 'Recorded'}
                                      {incident.resolution_note
                                        ? ` — ${incident.resolution_note}`
                                        : ''}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Timing and actions */}
                        <div className="flex shrink-0 flex-col gap-4 xl:min-w-[245px] xl:items-end">
                          <div className="grid gap-2.5 text-xs text-slate-500">
                            <p className="flex items-start gap-2">
                              <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
                              <span>
                                <span className="font-semibold text-slate-600">
                                  Started:
                                </span>{' '}
                                {formatDate(incident.started_at)}
                              </span>
                            </p>

                            <p className="flex items-start gap-2">
                              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                              <span>
                                {incident.resolved_at ? (
                                  <>
                                    <span className="font-semibold text-slate-600">
                                      Resolved:
                                    </span>{' '}
                                    {formatDate(incident.resolved_at)}
                                  </>
                                ) : (
                                  'Awaiting verified recovery'
                                )}
                              </span>
                            </p>

                            <p className="flex items-center gap-2">
                              <Activity className="h-3.5 w-3.5 shrink-0 text-violet-500" />
                              <span>
                                <span className="font-semibold text-slate-600">
                                  Duration:
                                </span>{' '}
                                {getDuration(
                                  incident.started_at,
                                  incident.resolved_at,
                                )}
                              </span>
                            </p>
                          </div>

                          {/* Action buttons */}
                          <div className="flex flex-wrap gap-2 xl:justify-end">
                            {isOpen && (
                              <button
                                onClick={() =>
                                  acknowledgeIncident(incident.id)
                                }
                                disabled={
                                  acknowledgingId === incident.id ||
                                  resolvingId === incident.id
                                }
                                className="action-button action-acknowledge"
                              >
                                {acknowledgingId === incident.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                                Acknowledge
                              </button>
                            )}

                            {isAcknowledged && (
                              <span className="action-button action-investigating">
                                <Eye className="h-4 w-4" />
                                Under investigation
                              </span>
                            )}

                            {!isResolved && (
                              <button
                                onClick={() =>
                                  resolveIncident(incident.id)
                                }
                                disabled={
                                  resolvingId === incident.id ||
                                  acknowledgingId === incident.id
                                }
                                className="action-button action-resolve"
                              >
                                {resolvingId === incident.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4" />
                                )}
                                Resolve manually
                              </button>
                            )}

                            <Link
                              href={`/incidents/${encodeURIComponent(incident.id)}`}
                              className="action-button action-details"
                            >
                              <Eye className="h-4 w-4" />
                              Details
                            </Link>

                            {isResolved && (
                              <span className="action-button action-recovered">
                                <CheckCircle2 className="h-4 w-4" />
                                Recovery verified
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {/* Footer */}
            {!loading && incidents.length > 0 && (
              <div className="panel-footer flex flex-col justify-between gap-2 px-5 py-4 text-xs text-slate-400 sm:flex-row sm:items-center sm:px-6">
                <span>
                  Showing{' '}
                  <strong className="font-semibold text-slate-600">
                    {filteredIncidents.length}
                  </strong>{' '}
                  of{' '}
                  <strong className="font-semibold text-slate-600">
                    {incidents.length}
                  </strong>{' '}
                  loaded incidents.
                </span>

                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  Refreshes automatically every 15 seconds
                </span>
              </div>
            )}
          </section>

          {/* Footer note */}
          <footer className="pb-2 pt-1 text-center text-[11px] text-slate-400">
            PulseWatch · Incident monitoring and reliability
          </footer>
        </div>
      </main>

      <style jsx global>{`
        .pulsewatch-page {
          position: relative;
          isolation: isolate;
          width: 100%;
          min-height: 100dvh;
          overflow-x: clip;
          background: #f6f8fa;
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
          animation: aurora-float 22s ease-in-out infinite alternate;
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
          overflow: hidden;
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

        .refresh-button {
          border: 1px solid rgba(71, 119, 245, 0.2);
          background: rgba(255, 255, 255, 0.75);
          color: #386bce;
          box-shadow: 0 4px 12px rgba(65, 100, 190, 0.05);
        }

        .refresh-button:hover:not(:disabled) {
          background: #edf2ff;
          border-color: rgba(71, 119, 245, 0.38);
          transform: translateY(-1px);
        }

        .summary-card {
          position: relative;
          min-width: 0;
          transition:
            transform 180ms ease,
            box-shadow 180ms ease;
        }

        .summary-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 16px 38px rgba(64, 77, 130, 0.09);
        }

        .summary-icon {
          display: flex;
          width: 42px;
          height: 42px;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
        }

        .summary-blue .summary-icon {
          color: #4777f5;
          background: linear-gradient(135deg, #e9efff, #e6eaff);
        }

        .summary-rose .summary-icon {
          color: #e45c7a;
          background: linear-gradient(135deg, #fff0f3, #ffe5ed);
        }

        .summary-amber .summary-icon {
          color: #d99a35;
          background: linear-gradient(135deg, #fff7e8, #fff0d6);
        }

        .summary-emerald .summary-icon {
          color: #20a477;
          background: linear-gradient(135deg, #e6faf2, #dcf6ea);
        }

        .summary-accent {
          position: absolute;
          right: 0;
          bottom: 0;
          left: 0;
          height: 3px;
          opacity: 0.6;
        }

        .summary-blue .summary-accent {
          background: linear-gradient(90deg, #6c8df8, #8bc7ff);
        }

        .summary-rose .summary-accent {
          background: linear-gradient(90deg, #ed7794, #f5a9c0);
        }

        .summary-amber .summary-accent {
          background: linear-gradient(90deg, #eab65c, #f5d28a);
        }

        .summary-emerald .summary-accent {
          background: linear-gradient(90deg, #46bd93, #9bdfbd);
        }

        .active-banner {
          border: 1px solid rgba(244, 114, 144, 0.22);
          background: linear-gradient(
            110deg,
            rgba(255, 239, 243, 0.92),
            rgba(255, 247, 250, 0.78)
          );
          box-shadow: 0 8px 24px rgba(200, 90, 120, 0.045);
        }

        .active-banner-icon {
          display: flex;
          width: 40px;
          height: 40px;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          border-radius: 13px;
          background: rgba(244, 114, 144, 0.13);
          color: #dc5577;
        }

        .panel-heading {
          border-bottom: 1px solid rgba(226, 232, 240, 0.75);
          background: rgba(255, 255, 255, 0.32);
        }

        .section-icon {
          display: flex;
          width: 34px;
          height: 34px;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          border-radius: 11px;
        }

        .blue-icon {
          color: #4777f5;
          background: linear-gradient(135deg, #e9efff, #e6eaff);
        }

        .search-box input {
          border: 1px solid rgba(203, 213, 225, 0.8);
          background: rgba(255, 255, 255, 0.82);
          color: #1e293b;
        }

        .search-box input::placeholder {
          color: #94a3b8;
        }

        .search-box input:focus {
          border-color: #7797f7;
          box-shadow: 0 0 0 3px rgba(71, 119, 245, 0.1);
        }

        .filter-group {
          border: 1px solid rgba(203, 213, 225, 0.7);
          background: rgba(241, 244, 252, 0.8);
        }

        .filter-button {
          color: #64748b;
        }

        .filter-button:hover {
          color: #334155;
          background: rgba(255, 255, 255, 0.6);
        }

        .filter-active {
          color: #386bce !important;
          background: white !important;
          box-shadow: 0 2px 7px rgba(70, 90, 140, 0.1);
        }

        .incident-row {
          transition: background 180ms ease;
        }

        .incident-row:hover {
          background: rgba(245, 247, 255, 0.65);
        }

        .incident-icon {
          display: flex;
          width: 42px;
          height: 42px;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
        }

        .incident-open {
          color: #e45c7a;
          background: linear-gradient(135deg, #fff0f3, #ffe5ed);
        }

        .incident-acknowledged {
          color: #d99a35;
          background: linear-gradient(135deg, #fff7e8, #fff0d6);
        }

        .incident-resolved {
          color: #20a477;
          background: linear-gradient(135deg, #e6faf2, #dcf6ea);
        }

        .action-button {
          display: inline-flex;
          min-height: 36px;
          align-items: center;
          justify-content: center;
          gap: 7px;
          border-radius: 10px;
          padding: 8px 11px;
          font-size: 11px;
          font-weight: 700;
          transition:
            transform 160ms ease,
            background 160ms ease,
            border-color 160ms ease;
        }

        .action-button:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .action-button:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .action-acknowledge {
          border: 1px solid #f4dfb7;
          background: #fff8e9;
          color: #a96d16;
        }

        .action-acknowledge:hover:not(:disabled) {
          background: #fff0ce;
        }

        .action-investigating {
          border: 1px solid #f4dfb7;
          background: #fff8e9;
          color: #a96d16;
        }

        .action-resolve {
          border: 1px solid #f4cbd3;
          background: #fff5f6;
          color: #c44e67;
        }

        .action-resolve:hover:not(:disabled) {
          background: #ffe9ed;
        }

        .action-details {
          border: 1px solid #dbe3f2;
          background: rgba(255, 255, 255, 0.8);
          color: #526582;
        }

        .action-details:hover {
          border-color: #a9bdf5;
          background: #f0f4ff;
          color: #386bce;
        }

        .action-recovered {
          border: 1px solid #c9eddb;
          background: #effbf4;
          color: #23845f;
        }

        .empty-icon,
        .loading-icon {
          display: flex;
          width: 58px;
          height: 58px;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 255, 255, 0.9);
          border-radius: 18px;
          background: linear-gradient(135deg, #edf1ff, #f5eaff);
          box-shadow: 0 8px 24px rgba(90, 105, 190, 0.09);
        }

        .empty-success {
          background: linear-gradient(135deg, #e6faf2, #e2f8ed);
        }

        .panel-footer {
          border-top: 1px solid rgba(226, 232, 240, 0.75);
          background: rgba(255, 255, 255, 0.3);
        }

        @keyframes aurora-float {
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
          .summary-card {
            padding: 18px;
          }

          .incident-row {
            padding: 18px;
          }

          .action-button {
            flex: 1 1 auto;
          }

          .filter-group {
            width: 100%;
          }

          .filter-button {
            flex: 1;
            padding-right: 8px;
            padding-left: 8px;
          }
        }


        /* The desktop sidebar is fixed-position, so reserve its width explicitly.
           This prevents the page content from sitting underneath it or being offset twice. */
        .incidents-main {
          width: calc(100% - 15rem);
          min-height: 100dvh;
          margin-left: 15rem;
          overflow-x: clip;
          background: transparent;
        }

        .incidents-market-backdrop {
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

        .incidents-market-backdrop svg {
          display: block;
          width: 100%;
          height: 100%;
          overflow: visible;
        }

        .page-header {
          background: rgba(255,255,255,.86);
          border-bottom: 1px solid #e7eceb;
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }

        .incident-content {
          width: 100%;
          max-width: none;
          min-width: 0;
          margin: 0;
        }

        .summary-card,
        .glass-panel,
        .incident-row,
        .panel-heading,
        .incident-toolbar-controls,
        .search-box,
        .filter-group {
          min-width: 0;
        }

        .search-box {
          flex: 1 1 220px;
          width: 100%;
          max-width: 320px;
        }

        .search-box input {
          width: 100%;
          min-height: 42px;
          box-sizing: border-box;
          padding-left: 38px;
          padding-right: 36px;
        }

        .filter-group {
          display: flex;
          flex: 0 1 auto;
          max-width: 100%;
          flex-wrap: wrap;
        }

        .filter-button {
          display: inline-flex;
          min-height: 36px;
          align-items: center;
          justify-content: center;
          white-space: nowrap;
        }

        .summary-card {
          height: 100%;
        }

        .incident-row > div {
          min-width: 0;
        }

        .incident-row .action-button {
          white-space: nowrap;
        }

        .page-header,
        .incident-content {
          padding-left: clamp(16px, 2.5vw, 40px);
          padding-right: clamp(16px, 2.5vw, 40px);
        }

        .pulsewatch-page:has(.sidebar-desktop--collapsed) .incidents-main {
          width: calc(100% - 4rem);
          margin-left: 4rem;
        }

        .pulsewatch-page:has(.sidebar-desktop--collapsed) .incidents-market-backdrop {
          left: 4rem;
        }

        @media (max-width: 767px) {
          .incidents-main {
            width: 100%;
            min-height: 100dvh;
            margin-left: 0;
            padding-bottom: 5rem;
            overflow: visible;
          }

          .incidents-market-backdrop {
            inset: 18vh 0 auto 0;
            height: min(78vh, 760px);
            min-height: 480px;
          }

          .page-header {
            position: relative;
            padding: 18px 16px;
          }

          .incident-content {
            padding: 20px 16px 28px;
          }

          .incident-header-inner {
            align-items: flex-start;
          }

          .incident-header-inner > div:last-child {
            align-self: flex-start;
          }

          .incident-toolbar-controls {
            width: 100%;
            flex-direction: column;
          }

          .search-box {
            max-width: none;
            flex-basis: auto;
          }

          .filter-group {
            width: 100%;
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .filter-button {
            width: 100%;
            min-width: 0;
            white-space: normal;
          }

          .incident-row {
            padding: 18px;
          }

          .incident-row > div {
            width: 100%;
          }

          .incident-row .xl\\:min-w-\\[245px\\] {
            width: 100%;
            min-width: 0;
          }

          .incident-row .action-button {
            flex: 1 1 140px;
          }

          .summary-card {
            padding: 18px;
          }
        }

        @media (min-width: 768px) and (max-width: 1100px) {
          .incident-content {
            padding-left: 20px;
            padding-right: 20px;
          }

          .panel-heading {
            align-items: stretch;
          }

          .incident-toolbar-controls {
            width: 100%;
          }

          .search-box {
            max-width: none;
          }

          .filter-group {
            flex: 1 1 100%;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .aurora-blob {
            animation: none;
          }

          .summary-card,
          .incident-row,
          .action-button,

          .summary-card:hover,
          .action-button:hover,
        }
      `}</style>
    </div>
  );
}
