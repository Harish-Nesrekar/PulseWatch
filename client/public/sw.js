
self.addEventListener('push', event => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {
      title: 'PulseWatch',
      body: event.data ? event.data.text() : 'You have a new notification.'
    };
  }

  const title = payload.title || 'PulseWatch';
  const options = {
    body: payload.body || 'Your monitored service has an update.',
    data: {
      url: payload.data?.url || payload.url || '/dashboard'
    },
    tag: payload.tag || payload.data?.notificationId || 'pulsewatch-notification',
    renotify: false
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  event.waitUntil((async () => {
    let targetUrl;

    try {
      targetUrl = new URL(
        event.notification.data?.url || '/dashboard',
        self.location.origin
      );

      // Never navigate users to an external origin.
      if (targetUrl.origin !== self.location.origin) {
        targetUrl = new URL('/dashboard', self.location.origin);
      }
    } catch {
      targetUrl = new URL('/dashboard', self.location.origin);
    }

    const windows = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    });

    for (const client of windows) {
      if (client.url.startsWith(self.location.origin) && 'focus' in client) {
        await client.focus();

        if ('navigate' in client && client.url !== targetUrl.href) {
          await client.navigate(targetUrl.href);
        }

        return;
      }
    }

    await self.clients.openWindow(targetUrl.href);
  })());
});
