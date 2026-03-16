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
    icon: data.icon || '/brand/logo-icon.png',
    badge: data.badge || '/brand/logo-icon.png',
    data: { ...(data.data || {}), action_url: data.action_url, type: data.type },
    vibrate: [100, 50, 100],
    tag: data.tag || data.type || data.data?.conversation_id || 'default',
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Hispaloshop', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};

  // Resolve URL based on notification type
  let url = data.action_url || data.url || '/';
  if (!url || url === '/') {
    if (data.type === 'chat' && data.conversation_id) {
      url = '/dashboard?openChat=true';
    } else if (data.type === 'order_confirmed') {
      url = '/producer/orders';
    } else if (data.type === 'commission_earned') {
      url = '/influencer/dashboard';
    } else if (data.type === 'order_shipped') {
      url = '/orders';
    }
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.postMessage({ type: 'NOTIFICATION_CLICK', data });
          if (url !== '/') client.navigate(url);
          return;
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
