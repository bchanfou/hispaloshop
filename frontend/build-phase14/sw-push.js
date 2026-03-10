/* eslint-disable no-restricted-globals */

// Service Worker for Web Push Notifications - Hispaloshop

self.addEventListener('push', (event) => {
  let data = { title: 'Hispaloshop', body: 'Tienes un nuevo mensaje' };
  try {
    if (event.data) data = event.data.json();
  } catch (e) {
    // fallback
  }

  const options = {
    body: data.body || '',
    icon: data.icon || '/logo192.png',
    badge: data.badge || '/logo192.png',
    data: data.data || {},
    vibrate: [100, 50, 100],
    tag: data.data?.conversation_id || 'default',
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Hispaloshop', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};

  let url = '/';
  if (data.type === 'chat' && data.conversation_id) {
    url = '/dashboard?openChat=true';
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.postMessage({ type: 'NOTIFICATION_CLICK', data });
          return;
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
