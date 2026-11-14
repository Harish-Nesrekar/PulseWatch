
'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  ExternalLink,
  Globe2,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  ShieldCheck,
  X,
} from 'lucide-react';

import { Sidebar } from '@/components/sidebar';
import { statusPagesApi, type AuthUser, type StatusPage } from '@/lib/api';

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
          <filter id="status-market-line-blur" x="-20%" y="-100%" width="140%" height="300%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
          <filter id="status-market-line-soft-blur" x="-20%" y="-100%" width="140%" height="300%">
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
        <g filter="url(#status-market-line-blur)" opacity=".24" strokeWidth="18" strokeLinecap="round">
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
        <g filter="url(#status-market-line-soft-blur)" opacity=".32" strokeWidth="7" strokeLinecap="round">
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

function isPublished(page: StatusPage) {
  return page.is_published === true || page.is_published === 1;
}

export default function StatusPagesPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [pages, setPages] = useState<StatusPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadPages = useCallback(async (signal?: AbortSignal) => {
    setError('');

    try {
      setPages(await statusPagesApi.list(signal));
    } catch (err) {
      if (!signal?.aborted) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load status pages.'
        );
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

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
    void loadPages(controller.signal);

    return () => controller.abort();
  }, [loadPages]);

  function startCreate() {
    setEditing(null);
    setFormOpen(true);
    setName('');
    setSlug('');
    setError('');
    setSuccess('');
  }

  function startEdit(page: StatusPage) {
    setEditing(page.id);
    setFormOpen(true);
    setName(page.name);
    setSlug(page.slug);
    setError('');
    setSuccess('');
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
    setName('');
    setSlug('');
    setError('');
  }

  async function savePage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) return;

    const cleanName = name.trim();
    const cleanSlug = slug.trim().toLowerCase();

    if (cleanName.length < 2 || cleanName.length > 100) {
      setError('Page name must be between 2 and 100 characters.');
      return;
    }

    if (!/^[a-z0-9-]{3,50}$/.test(cleanSlug)) {
      setError(
        'Slug must be 3–50 characters using lowercase letters, numbers, and hyphens.'
      );
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const input = { name: cleanName, slug: cleanSlug };

      if (editing) {
        const updated = await statusPagesApi.update(editing, input);

        setPages((current) =>
          current.map((page) => (page.id === editing ? updated : page))
        );

        setSuccess('Status page updated.');
      } else {
        const created = await statusPagesApi.create(input);

        setPages((current) => [created, ...current]);
        setSuccess('Status page created.');
      }

      setEditing(null);
      setFormOpen(false);
      setName('');
      setSlug('');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to save status page.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(page: StatusPage) {
    setActionId(page.id);
    setError('');
    setSuccess('');

    try {
      const result = await statusPagesApi.publish(
        page.id,
        !isPublished(page)
      );

      setPages((current) =>
        current.map((item) =>
          item.id === page.id
            ? { ...item, is_published: result.published }
            : item
        )
      );

      setSuccess(
        result.published
          ? 'Status page published.'
          : 'Status page unpublished.'
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to update publication status.'
      );
    } finally {
      setActionId(null);
    }
  }

  async function removePage(page: StatusPage) {
    if (
      !window.confirm(
        `Delete "${page.name}"? This will remove its public page.`
      )
    ) {
      return;
    }

    setActionId(page.id);
    setError('');
    setSuccess('');

    try {
      await statusPagesApi.remove(page.id);

      setPages((current) =>
        current.filter((item) => item.id !== page.id)
      );

      if (editing === page.id) {
        setEditing(null);
        setFormOpen(false);
      }

      setSuccess('Status page deleted.');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to delete status page.'
      );
    } finally {
      setActionId(null);
    }
  }

  const publishedCount = pages.filter(isPublished).length;
  const unpublishedCount = pages.length - publishedCount;

  return (
    <div className="status-pages-layout relative isolate flex min-h-screen flex-col overflow-x-clip bg-[#f6f8fa] text-[#172033] md:flex-row">
      <Sidebar user={user} />

      <main className="relative z-10 flex min-w-0 flex-1 flex-col pb-24 md:pb-0">
        <AmbientMarketBackdrop />

        {/* Header */}
        <header className="relative z-10 border-b border-white/70 bg-white/45 px-5 py-5 backdrop-blur-xl sm:px-8">
          <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center justify-between gap-4">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <span className="header-eyebrow">CUSTOMER COMMUNICATION</span>
                <span className="header-dot" />
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Status Pages
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Manage public service-health pages for your customers.
              </p>
            </div>

            <button
              type="button"
              onClick={startCreate}
              className="primary-action"
            >
              <Plus className="h-4 w-4" />
              Create status page
            </button>
          </div>
        </header>

        <div className="relative z-10 mx-auto w-full max-w-[1440px] space-y-6 p-4 sm:p-6 lg:p-8">
          {/* Summary */}
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="management-stat">
              <div className="stat-icon stat-icon-blue">
                <Globe2 className="h-5 w-5" />
              </div>

              <div>
                <p className="stat-label">Total status pages</p>
                <p className="stat-value">{pages.length}</p>
              </div>
            </div>

            <div className="management-stat">
              <div className="stat-icon stat-icon-green">
                <Eye className="h-5 w-5" />
              </div>

              <div>
                <p className="stat-label">Published</p>
                <p className="stat-value">{publishedCount}</p>
              </div>
            </div>

            <div className="management-stat">
              <div className="stat-icon stat-icon-slate">
                <EyeOff className="h-5 w-5" />
              </div>

              <div>
                <p className="stat-label">Unpublished</p>
                <p className="stat-value">{unpublishedCount}</p>
              </div>
            </div>
          </section>

          {/* Error notification */}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/90 px-4 py-3.5 shadow-sm"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />

              <p className="flex-1 text-sm leading-5 text-rose-700">
                {error}
              </p>

              <button
                type="button"
                onClick={() => setError('')}
                className="rounded-lg p-1 text-rose-400 transition hover:bg-rose-100 hover:text-rose-600"
                aria-label="Dismiss error"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Success notification */}
          {success && (
            <div
              role="status"
              className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/90 px-4 py-3.5 shadow-sm"
            >
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />

              <p className="flex-1 text-sm text-emerald-700">{success}</p>

              <button
                type="button"
                onClick={() => setSuccess('')}
                className="rounded-lg p-1 text-emerald-500 transition hover:bg-emerald-100"
                aria-label="Dismiss success message"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Create / Edit form */}
          {formOpen && (
            <form onSubmit={savePage} className="management-panel">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="section-icon">
                    {editing ? (
                      <Pencil className="h-5 w-5" />
                    ) : (
                      <Plus className="h-5 w-5" />
                    )}
                  </div>

                  <div>
                    <h2 className="text-base font-bold text-slate-800">
                      {editing ? 'Edit status page' : 'Create status page'}
                    </h2>

                    <p className="mt-0.5 text-xs text-slate-500">
                      Configure the name and public URL for this page.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeForm}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </button>
              </div>

              <div className="management-divider" />

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <label
                  htmlFor="status-page-name"
                  className="block text-xs font-semibold text-slate-600"
                >
                  Page name

                  <input
                    id="status-page-name"
                    type="text"
                    required
                    minLength={2}
                    maxLength={100}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="e.g. PulseWatch Service Status"
                    className="management-input mt-2"
                  />

                  <span className="mt-1.5 block text-[11px] font-normal text-slate-400">
                    This name appears at the top of your public status page.
                  </span>
                </label>

                <label
                  htmlFor="status-page-slug"
                  className="block text-xs font-semibold text-slate-600"
                >
                  Public slug

                  <input
                    id="status-page-slug"
                    type="text"
                    required
                    minLength={3}
                    maxLength={50}
                    pattern="[a-z0-9-]+"
                    value={slug}
                    onChange={(event) =>
                      setSlug(event.target.value.toLowerCase())
                    }
                    placeholder="e.g. my-company-status"
                    className="management-input mt-2"
                  />

                  <span className="mt-1.5 block text-[11px] font-normal text-slate-400">
                    Lowercase letters, numbers, and hyphens only.
                  </span>
                </label>
              </div>

              <div className="mt-5 rounded-xl border border-[#d6e9dd] bg-[#edf7f0] px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#16834f]">
                  Public page URL
                </p>

                <p className="mt-1 break-all text-sm font-semibold text-[#116b40]">
                  /status/{slug || 'your-page-slug'}
                </p>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[11px] text-slate-400">
                  {editing
                    ? 'Save your changes to update this status page.'
                    : 'Your page will need to be published before customers can view it.'}
                </p>

                <button
                  type="submit"
                  disabled={saving}
                  className="primary-action"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}

                  {saving
                    ? 'Saving...'
                    : editing
                      ? 'Save changes'
                      : 'Create status page'}
                </button>
              </div>
            </form>
          )}

          {/* Loading */}
          {loading ? (
            <div className="management-panel flex min-h-56 items-center justify-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-[#16834f]" />
              <span className="text-sm font-medium text-slate-500">
                Loading status pages...
              </span>
            </div>
          ) : pages.length ? (
            <>
              {/* Page list heading */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    Your status pages
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Manage publication and access to your public pages.
                  </p>
                </div>

                <span className="rounded-full border border-white/80 bg-white/65 px-3 py-1.5 text-[11px] font-semibold text-slate-500 shadow-sm">
                  {pages.length} {pages.length === 1 ? 'page' : 'pages'}
                </span>
              </div>

              {/* Status page cards */}
              <div className="space-y-4">
                {pages.map((page) => {
                  const published = isPublished(page);
                  const isBusy = actionId === page.id;

                  return (
                    <article key={page.id} className="status-page-card">
                      <div className="status-page-card-main flex min-w-0 items-start gap-3">
                        <div
                          className={`page-card-icon ${
                              published
                                ? 'page-card-icon-published'
                                : 'page-card-icon-unpublished'
                            }`}
                          >
                          <Globe2 className="h-5 w-5" />
                        </div>

                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="break-words text-sm font-bold text-slate-800 sm:text-base">
                                {page.name}
                              </h3>

                              <span
                                className={`publication-badge ${
                                  published
                                    ? 'publication-badge-published'
                                    : 'publication-badge-unpublished'
                                }`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    published
                                      ? 'bg-emerald-500'
                                      : 'bg-slate-400'
                                  }`}
                                />

                                {published ? 'Published' : 'Unpublished'}
                              </span>
                            </div>

                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                              <FileText className="h-3.5 w-3.5" />
                              <span className="break-all">
                                /status/{page.slug}
                              </span>
                            </div>

                            {published && (
                              <a
                                href={`/status/${encodeURIComponent(page.slug)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#16834f] transition hover:text-[#116b40]"
                              >
                                Open public page
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                        </div>
                      </div>

                      <div className="status-page-card-actions flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(page)}
                            disabled={isBusy || saving}
                            className="secondary-action"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => void togglePublished(page)}
                            disabled={isBusy}
                            className={`secondary-action ${
                              published
                                ? 'text-amber-600 hover:bg-amber-50 hover:text-amber-700'
                                : 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700'
                            }`}
                          >
                            {isBusy ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : published ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}

                            {isBusy
                              ? 'Saving...'
                              : published
                                ? 'Unpublish'
                                : 'Publish'}
                          </button>

                          <button
                            type="button"
                            onClick={() => void removePage(page)}
                            disabled={isBusy}
                            aria-label={`Delete ${page.name}`}
                            className="secondary-action text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          >
                            {isBusy ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}

                            Delete
                          </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          ) : (
            /* Empty state */
            <section className="empty-status-panel">
              <div className="empty-status-icon">
                <Globe2 className="h-7 w-7 text-[#16834f]" />
              </div>

              <h2 className="mt-5 text-lg font-bold text-slate-800">
                No status pages yet
              </h2>

              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                Create a public status page to share current service health
                and incident updates with your customers.
              </p>

              <button
                type="button"
                onClick={startCreate}
                className="primary-action mt-6"
              >
                <Plus className="h-4 w-4" />
                Create your first status page
              </button>
            </section>
          )}

          {/* Footer note */}
          <div className="flex items-start gap-3 rounded-2xl border border-[#d6e9dd] bg-[#edf7f0] px-4 py-4">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#16834f]" />

            <p className="text-xs leading-5 text-slate-500">
              Published status pages are publicly accessible. Unpublished
              pages are not intended to be shared with customers.
            </p>
          </div>
        </div>
      </main>

      <style jsx global>{`
        .status-pages-layout { isolation: isolate; background: #f6f8fa; color: #172033; }
        .status-pages-layout .dashboard-market-backdrop {
          position: fixed; inset: 18vh 0 auto 0; height: clamp(620px, 78vh, 920px);
          min-height: 620px; max-height: 920px; overflow: hidden; pointer-events: none;
          z-index: 0; opacity: .92;
          mask-image: linear-gradient(to bottom, #000 0%, rgba(0,0,0,.82) 62%, rgba(0,0,0,.3) 86%, transparent 100%);
          -webkit-mask-image: linear-gradient(to bottom, #000 0%, rgba(0,0,0,.82) 62%, rgba(0,0,0,.3) 86%, transparent 100%);
        }
        .status-pages-layout .dashboard-market-backdrop svg { display: block; width: 100%; height: 100%; }
        .status-pages-layout .market-grid line { stroke: rgba(125,145,160,.12); stroke-width: 1; stroke-dasharray: 2 8; }
        .status-pages-layout header { background: rgba(255,255,255,.76); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); }
        .header-eyebrow { color: #64748b; font-size: 10px; font-weight: 800; letter-spacing: .14em; }
        .header-dot { width: 6px; height: 6px; border-radius: 50%; background: #16834f; box-shadow: 0 0 0 3px rgba(22,131,79,.12); }
        .primary-action { display: inline-flex; min-height: 42px; align-items: center; justify-content: center; gap: 8px; border: 1px solid #147747; border-radius: 10px; background: #16834f; padding: 10px 15px; color: #fff; font-size: 12px; font-weight: 700; box-shadow: 0 5px 14px rgba(22,131,79,.14); transition: background 160ms ease, box-shadow 160ms ease, transform 160ms ease; }
        .primary-action:hover:not(:disabled) { background: #116b40; box-shadow: 0 8px 18px rgba(22,131,79,.2); transform: translateY(-1px); }
        .primary-action:focus-visible, .secondary-action:focus-visible { outline: 3px solid rgba(22,131,79,.24); outline-offset: 2px; }
        .primary-action:disabled, .secondary-action:disabled { cursor: not-allowed; opacity: .55; }
        .management-stat { display: flex; min-height: 96px; min-width: 0; align-items: center; gap: 14px; border: 1px solid #e5ebe8; border-radius: 16px; background: rgba(255,255,255,.92); padding: 16px; box-shadow: 0 5px 18px rgba(15,23,42,.035); }
        .stat-icon { display: flex; width: 42px; height: 42px; flex-shrink: 0; align-items: center; justify-content: center; border-radius: 12px; }
        .stat-icon-blue { background: #edf3ff; color: #2563eb; } .stat-icon-green { background: #eaf7ef; color: #16834f; } .stat-icon-slate { background: #f1f5f9; color: #64748b; }
        .stat-label { color: #64748b; font-size: 11px; font-weight: 650; } .stat-value { margin-top: 4px; color: #172033; font-size: 25px; font-weight: 800; line-height: 1.15; font-variant-numeric: tabular-nums; }
        .management-panel { border: 1px solid #e3eae6; border-radius: 18px; background: rgba(255,255,255,.95); padding: 22px; box-shadow: 0 8px 28px rgba(15,23,42,.045); }
        .section-icon { display: flex; width: 40px; height: 40px; flex-shrink: 0; align-items: center; justify-content: center; border: 1px solid #d6e9dd; border-radius: 12px; background: #edf7f0; color: #16834f; }
        .management-divider { height: 1px; margin: 18px 0; background: #e8eeeb; }
        .management-input { width: 100%; min-height: 44px; border: 1px solid #d9e2dd; border-radius: 10px; background: #fff; padding: 10px 12px; color: #172033; font-size: 13px; outline: none; transition: border-color 160ms ease, box-shadow 160ms ease; }
        .management-input::placeholder { color: #94a3b8; } .management-input:focus { border-color: #16834f; box-shadow: 0 0 0 3px rgba(22,131,79,.11); }
        .status-page-card { display: flex; min-width: 0; flex-direction: column; gap: 18px; border: 1px solid #e3eae6; border-radius: 16px; background: rgba(255,255,255,.95); padding: 20px; box-shadow: 0 6px 22px rgba(15,23,42,.04); transition: border-color 160ms ease, box-shadow 160ms ease; }
        .status-page-card:hover { border-color: #d1dfd7; box-shadow: 0 10px 28px rgba(15,23,42,.065); }
        .status-page-card-main { flex: 1 1 auto; }
        .status-page-card-actions { border-top: 1px solid #edf1ef; padding-top: 14px; }
        .page-card-icon { display: flex; width: 42px; height: 42px; flex-shrink: 0; align-items: center; justify-content: center; border-radius: 12px; }
        .page-card-icon-published { border: 1px solid #ccebd8; background: #edf8f1; color: #16834f; } .page-card-icon-unpublished { border: 1px solid #e2e8f0; background: #f5f7f8; color: #64748b; }
        .publication-badge { display: inline-flex; align-items: center; gap: 6px; border: 1px solid transparent; border-radius: 999px; padding: 4px 9px; font-size: 10px; font-weight: 750; }
        .publication-badge-published { border-color: #ccebd8; background: #edf8f1; color: #166534; } .publication-badge-unpublished { border-color: #e2e8f0; background: #f8fafc; color: #64748b; }
        .secondary-action { display: inline-flex; min-height: 36px; align-items: center; justify-content: center; gap: 7px; border: 1px solid #dfe7e2; border-radius: 9px; background: #fff; padding: 7px 11px; color: #475569; font-size: 11px; font-weight: 700; transition: background 150ms ease, border-color 150ms ease, color 150ms ease; }
        .secondary-action:hover:not(:disabled) { border-color: #cbd8d0; background: #f7faf8; color: #172033; }
        .empty-status-panel { border: 1px dashed #cbd8d0; border-radius: 18px; background: rgba(255,255,255,.78); padding: 48px 22px; text-align: center; }
        .empty-status-icon { display: flex; width: 60px; height: 60px; align-items: center; justify-content: center; margin: 0 auto; border: 1px solid #d6e9dd; border-radius: 17px; background: #edf7f0; }
        @media (min-width: 768px) { .status-page-card { flex-direction: row; align-items: center; justify-content: space-between; gap: 24px; } .status-page-card-actions { flex: 0 0 auto; border-top: 0; border-left: 1px solid #edf1ef; padding: 0 0 0 18px; } }
        @media (max-width: 640px) { .management-panel { padding: 17px; border-radius: 15px; } .status-page-card { padding: 16px; } .status-page-card-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); } .status-page-card-actions button { width: 100%; } .status-page-card-actions button:last-child { grid-column: 1 / -1; } }
        @media (prefers-reduced-motion: reduce) { .primary-action, .management-input, .status-page-card, .secondary-action { transition: none !important; } .primary-action:hover, .status-page-card:hover { transform: none; } }
      `}</style>
    </div>
  );
}
