
import { api } from '@/lib/api';

type PublicKeyResponse = {
  publicKey: string;
};

type PushSubscriptionResponse = {
  message?: string;
};

function decodeVapidPublicKey(value: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const output = new Uint8Array(new ArrayBuffer(rawData.length));

  for (let i = 0; i < rawData.length; i += 1) {
    output[i] = rawData.charCodeAt(i);
  }

  return output;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;

  const registration = await navigator.serviceWorker.getRegistration('/');

  if (!registration) return null;

  return registration.pushManager.getSubscription();
}

export async function requestPushPermission(): Promise<void> {
  if (!isPushSupported()) {
    throw new Error('This browser does not support push notifications.');
  }

  if (Notification.permission === 'granted') return;

  if (Notification.permission === 'denied') {
    throw new Error(
      'Notifications are blocked. Allow them in your browser settings.'
    );
  }

  const permission = await Notification.requestPermission();

  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted.');
  }
}

export async function enablePushNotifications(): Promise<void> {
  if (!isPushSupported()) {
    throw new Error('This browser does not support push notifications.');
  }

  if (Notification.permission !== 'granted') {
    throw new Error('Grant notification permission before enabling push notifications.');
  }

  const registration = await navigator.serviceWorker.register('/sw.js', {
    scope: '/'
  });

  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  let createdSubscription = false;

  if (!subscription) {
    const keyResponse = await api<PublicKeyResponse>(
      '/notifications/push/public-key'
    );

    if (!keyResponse.publicKey) {
      throw new Error('The server did not provide a VAPID public key.');
    }

    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodeVapidPublicKey(keyResponse.publicKey)
    });

    createdSubscription = true;
  }

  try {
    await api<PushSubscriptionResponse>(
      '/notifications/push-subscriptions',
      {
        method: 'POST',
        body: JSON.stringify(subscription.toJSON())
      }
    );
  } catch (error) {
    if (createdSubscription) {
      await subscription.unsubscribe().catch(() => false);
    }

    throw error;
  }
}

export async function disablePushNotifications(): Promise<void> {
  const subscription = await getPushSubscription();

  if (!subscription) return;

  await api<PushSubscriptionResponse>(
    '/notifications/push-subscriptions',
    {
      method: 'DELETE',
      body: JSON.stringify({
        endpoint: subscription.endpoint
      })
    }
  );

  const unsubscribed = await subscription.unsubscribe();

  if (!unsubscribed) {
    throw new Error(
      'The server subscription was removed, but the browser could not unsubscribe.'
    );
  }
}
