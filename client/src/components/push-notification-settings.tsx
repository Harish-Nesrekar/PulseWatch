
'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import {
  disablePushNotifications,
  enablePushNotifications,
  getPushSubscription,
  isPushSupported,
  requestPushPermission
} from '@/lib/push-notifications';


type PushState = 'loading' | 'enabled' | 'disabled' | 'unsupported';

export function PushNotificationSettings() {
  const [status, setStatus] = useState<PushState>('loading');
  const [busy, setBusy] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    'default'
  );

  useEffect(() => {
    let active = true;

    async function loadStatus() {
      if (!isPushSupported()) {
        if (active) {
          setStatus('unsupported');
          setPermission('unsupported');
        }
        return;
      }

      try {
        const subscription = await getPushSubscription();

        if (!active) return;

        setPermission(Notification.permission);
        setStatus(subscription ? 'enabled' : 'disabled');
      } catch {
        if (active) setStatus('disabled');
      }
    }

    void loadStatus();

    return () => {
      active = false;
    };
  }, []);

async function handleEnable() {
  if (busy) return;

  setBusy(true);

  try {
    // Request permission immediately from the button click.
    await requestPushPermission();

    setPermission(Notification.permission);

    // Continue with service worker and push subscription.
    await enablePushNotifications();

    setStatus('enabled');
    toast.success('Browser notifications enabled.');
  } catch (error) {
    toast.error(
      error instanceof Error
        ? error.message
        : 'Could not enable browser notifications.'
    );

    if (isPushSupported()) {
      setPermission(Notification.permission);
    }
  } finally {
    setBusy(false);
  }
}

  async function handleDisable() {
    if (busy) return;

    setBusy(true);

    try {
      await disablePushNotifications();

      setStatus('disabled');
      toast.success('Browser notifications disabled.');
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Could not disable browser notifications.'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="settings-panel">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="section-icon profile-icon">
            <Bell className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-800">
              Browser push notifications
            </h3>

            <p className="mt-1 max-w-xl text-xs leading-6 text-slate-500">
              Receive monitor DOWN and RECOVERED alerts even when PulseWatch
              is not open in a browser tab.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              {status === 'loading' && (
                <span className="text-slate-500">Checking browser support...</span>
              )}

              {status === 'enabled' && (
                <span className="font-semibold text-emerald-700">
                  Browser subscription active
                </span>
              )}

              {status === 'disabled' && (
                <span className="text-slate-500">
                  Browser notifications are not enabled
                </span>
              )}

              {status === 'unsupported' && (
                <span className="text-rose-600">
                  This browser does not support Web Push
                </span>
              )}

              {permission === 'denied' && (
                <span className="text-rose-600">
                  Browser permission is blocked. Change it in browser settings.
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="shrink-0">
          {status === 'loading' ? (
            <button
              type="button"
              disabled
              className="settings-save-button"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking...
            </button>
          ) : status === 'unsupported' ? (
            <button
              type="button"
              disabled
              className="settings-save-button"
            >
              Not supported
            </button>
          ) : status === 'enabled' ? (
            <button
              type="button"
              onClick={() => void handleDisable()}
              disabled={busy}
              className="settings-save-button"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BellOff className="h-4 w-4" />
              )}
              Disable
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleEnable()}
              disabled={busy}
              className="settings-save-button"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              Enable notifications
            </button>
          )}
        </div>
      </div>

      <p className="mt-4 border-t border-slate-200/70 pt-3 text-[11px] leading-5 text-slate-400">
        You can change this permission at any time in your browser settings.
        Notifications also depend on your operating system notification settings.
      </p>
    </section>
  );
}
