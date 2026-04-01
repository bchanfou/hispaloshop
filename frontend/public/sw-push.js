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
    data: { ...(data.data || {}), action_url: data.action_url || (data.data || {}).action_url, type: data.type || (data.data || {}).type },
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
    const t = data.type;
    if (t === 'chat' && data.conversation_id) {
      url = '/dashboard?openChat=true';
    // Orders
    } else if (t === 'order_confirmed' || t === 'new_order') {
      url = '/producer/orders';
    } else if (t === 'order_shipped' || t === 'order_preparing' || t === 'order_delivered' || t === 'order_review_request') {
      url = '/orders';
    } else if (t === 'order_payment_failed') {
      url = '/orders';
    // Influencer
    } else if (t === 'commission_earned' || t === 'tier_upgraded' || t === 'payout_sent') {
      url = '/influencer/dashboard';
    // B2B
    } else if (t === 'b2b_offer_received' || t === 'b2b_offer_accepted' || t === 'b2b_request_rejected') {
      url = '/b2b/operations';
    } else if (t === 'b2b_contract_ready' || t === 'b2b_contract_signed') {
      url = data.operation_id ? '/b2b/contract/' + data.operation_id : '/b2b/operations';
    } else if (t === 'b2b_payment_received') {
      url = '/b2b/operations';
    // Verification
    } else if (t === 'verification_approved' || t === 'verification_rejected') {
      url = '/producer/verification';
    // Social
    } else if (t === 'new_follower' || t === 'follow_request_accepted' || t === 'new_follow_request') {
      url = '/notifications';
    } else if (t === 'post_liked' || t === 'post_commented' || t === 'new_like' || t === 'new_comment' || t === 'mentioned') {
      url = '/notifications';
    } else if (t === 'story_like' || t === 'story_reply') {
      url = '/notifications';
    // System
    } else if (t === 'support_reply') {
      url = '/settings';
    } else if (t === 'certificate_expiring') {
      url = '/producer/certificates';
    } else if (t === 'collab_proposal') {
      url = '/collaborations';
    } else if (t === 'new_product') {
      url = '/notifications';
    }
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          return client.focus().then((focused) => {
            focused.postMessage({ type: 'NOTIFICATION_CLICK', data });
            if (url !== '/') return focused.navigate(url);
          });
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
