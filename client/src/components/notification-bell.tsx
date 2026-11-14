
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCheck,
  CheckCircle2,
  ExternalLink,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { api } from '@/lib/api';

type Notification = {
  id: string;
  monitor_id: string | null;
  incident_id: string | null;
  type: 'MONITOR_DOWN' | 'MONITOR_RECOVERED';
  title: string;
  message: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
  monitor_name: string | null;
};

type NotificationResponse = {
  items: Notification[];
  unreadCount: number;
};

type Props = {
  variant?: 'desktop' | 'mobile';
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function NotificationBell({ variant = 'desktop' }: Props) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const result = await api<NotificationResponse>('/notifications');

      setItems(result.items);
      setUnreadCount(result.unreadCount);
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) {
        console.error('Unable to refresh notifications:', error);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load and live SSE updates.
  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const result = await api<NotificationResponse>('/notifications');

        if (!active) return;

        setItems(result.items);
        setUnreadCount(result.unreadCount);
      } catch (error) {
        if (active) {
          console.error('Unable to load notifications:', error);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    const stream = new EventSource(
      `${API_BASE.replace(/\/$/, '')}/notifications/stream`,
      { withCredentials: true },
    );

    stream.addEventListener('notification', () => {
      if (active) void refresh();
    });

    stream.addEventListener('ready', () => {
      if (active) void refresh();
    });

    stream.addEventListener('stream-error', event => {
      console.error('Notification stream error:', event);
    });

    return () => {
      active = false;
      stream.close();
    };
  }, [refresh]);

  // Close when clicking outside or pressing Escape.
  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        rootRef.current &&
        !rootRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const markAsRead = async (notification: Notification) => {
    if (notification.read_at) return;

    try {
      await api(`/notifications/${notification.id}/read`, {
        method: 'PATCH',
      });

      setItems(current =>
        current.map(item =>
          item.id === notification.id
            ? { ...item, read_at: new Date().toISOString() }
            : item,
        ),
      );

      setUnreadCount(current => Math.max(0, current - 1));
    } catch {
      toast.error('Could not mark notification as read.');
    }
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0 || busy) return;

    setBusy(true);

    try {
      await api('/notifications/read-all', { method: 'PATCH' });

      setItems(current =>
        current.map(item => ({
          ...item,
          read_at: item.read_at || new Date().toISOString(),
        })),
      );

      setUnreadCount(0);
      toast.success('All notifications marked as read.');
    } catch {
      toast.error('Could not update notifications.');
    } finally {
      setBusy(false);
    }
  };

  const deleteNotification = async (
    notification: Notification,
  ) => {
    try {
      await api(`/notifications/${notification.id}`, {
        method: 'DELETE',
      });

      setItems(current =>
        current.filter(item => item.id !== notification.id),
      );

      if (!notification.read_at) {
        setUnreadCount(current => Math.max(0, current - 1));
      }
    } catch {
      toast.error('Could not delete notification.');
    }
  };

  const openNotification = async (notification: Notification) => {
    await markAsRead(notification);

    setOpen(false);

    if (notification.link?.startsWith('/')) {
      router.push(notification.link);
    } else if (notification.incident_id) {
      router.push(`/incidents/${notification.incident_id}`);
    } else if (notification.monitor_id) {
      router.push(`/monitors/${notification.monitor_id}`);
    } else {
      router.push('/notifications');
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(current => !current)}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Notifications"
        className={
          variant === 'mobile'
            ? 'relative flex h-11 w-full items-center gap-3 rounded-[10px] px-3 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]'
            : 'relative flex h-9 w-9 items-center justify-center rounded-[10px] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]'
        }
      >
        <Bell
          className={variant === 'mobile' ? 'h-[18px] w-[18px]' : 'h-[18px] w-[18px]'}
          aria-hidden="true"
        />

        {variant === 'mobile' && (
          <span className="flex-1 text-left">Notifications</span>
        )}

        {unreadCount > 0 && (
          <span
            className={
              variant === 'mobile'
                ? 'min-w-5 rounded-full bg-[var(--danger)] px-1.5 text-center text-[10px] font-semibold leading-5 text-white'
                : 'absolute -right-1 -top-1 min-w-4 rounded-full bg-[var(--danger)] px-1 text-center text-[9px] font-semibold leading-4 text-white'
            }
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className={
            variant === 'mobile'
              ? 'fixed inset-x-3 bottom-24 z-[130] flex max-h-[65dvh] flex-col overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] shadow-2xl'
              : 'absolute left-0 right-auto top-12 z-[120] flex max-h-[min(560px,75dvh)] w-[min(380px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] shadow-xl'
          }
        >
          <div className="flex shrink-0 items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Notifications
              </h2>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                {unreadCount} unread
              </p>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => void markAllAsRead()}
                disabled={unreadCount === 0 || busy}
                title="Mark all as read"
                aria-label="Mark all as read"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <CheckCheck className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close notifications"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 px-4 py-12 text-sm text-[var(--text-muted)]">
                <Activity className="h-4 w-4 animate-pulse" />
                Loading notifications...
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-12 text-center">
                <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-muted)]">
                  <Bell className="h-5 w-5 text-[var(--text-muted)]" />
                </span>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  You&apos;re all caught up
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Monitor alerts and recovery updates will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)]">
                {items.map(notification => {
                  const isDown = notification.type === 'MONITOR_DOWN';

                  return (
                    <div
                      key={notification.id}
                      className={`group relative flex gap-3 px-4 py-3 transition-colors hover:bg-[var(--surface-muted)] ${
                        !notification.read_at ? 'bg-[var(--primary-soft)]/30' : ''
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                          isDown
                            ? 'bg-[color-mix(in_oklch,var(--danger)_12%,transparent)] text-[var(--danger)]'
                            : 'bg-[color-mix(in_oklch,var(--success)_12%,transparent)] text-[var(--success)]'
                        }`}
                      >
                        {isDown ? (
                          <AlertTriangle className="h-[18px] w-[18px]" />
                        ) : (
                          <CheckCircle2 className="h-[18px] w-[18px]" />
                        )}
                      </span>

                      <button
                        type="button"
                        onClick={() => void openNotification(notification)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <span className="flex items-start gap-2">
                          <span className="min-w-0 flex-1 text-sm font-semibold text-[var(--text-primary)]">
                            {notification.title}
                          </span>
                          {!notification.read_at && (
                            <span
                              className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--primary)]"
                              aria-label="Unread"
                            />
                          )}
                        </span>

                        <span className="mt-1 block text-xs leading-5 text-[var(--text-secondary)]">
                          {notification.message}
                        </span>

                        {notification.monitor_name && (
                          <span className="mt-1 block truncate text-[11px] font-medium text-[var(--text-muted)]">
                            {notification.monitor_name}
                          </span>
                        )}

                        <span className="mt-2 flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                          {formatTime(notification.created_at)}
                          <ExternalLink className="ml-1 h-3 w-3" />
                          View details
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => void deleteNotification(notification)}
                        aria-label={`Delete ${notification.title}`}
                        title="Delete notification"
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] opacity-100 transition-colors hover:bg-[var(--surface)] hover:text-[var(--danger)] sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center justify-between border-t border-[var(--border-subtle)] px-4 py-2.5">
            <span className="text-[11px] text-[var(--text-muted)]">
              Live monitor updates
            </span>
            <button
              type="button"
              onClick={() => void refresh()}
              className="text-xs font-medium text-[var(--primary-hover)] hover:underline"
            >
              Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
