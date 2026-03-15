/**
 * Notification permission and browser push service.
 * Requests permission at the right moment (first message received).
 */

const DENIED_KEY = 'hispaloshop_notif_denied';

export function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

export function wasPermissionDenied() {
  return localStorage.getItem(DENIED_KEY) === 'true';
}

export async function requestNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  if (wasPermissionDenied()) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') {
    localStorage.setItem(DENIED_KEY, 'true');
    return 'denied';
  }

  const result = await Notification.requestPermission();
  if (result === 'denied') {
    localStorage.setItem(DENIED_KEY, 'true');
  }
  return result;
}

export function showBrowserNotification(title, body, options = {}) {
  if (getNotificationPermission() !== 'granted') return;
  if (document.hasFocus()) return; // Don't show if app is focused

  const notification = new Notification(title, {
    body,
    icon: '/brand/logo-icon.png',
    badge: '/brand/logo-icon.png',
    tag: options.tag || 'hispaloshop-chat',
    ...options,
  });

  if (options.onClick) {
    notification.onclick = options.onClick;
  }

  // Auto-close after 5 seconds
  setTimeout(() => notification.close(), 5000);
  return notification;
}
