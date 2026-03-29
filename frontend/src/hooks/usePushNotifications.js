import { useEffect, useRef } from 'react';
import apiClient from '../services/api/client';
import { requestNotificationPermission } from '../services/notifications';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function usePushNotifications(user) {
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (!user || subscribedRef.current) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    const setup = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw-push.js');
        await navigator.serviceWorker.ready;

        const permission = await requestNotificationPermission();
        if (permission !== 'granted') return;

        // Try env var first, fall back to backend API
        let vapidKey = process.env.REACT_APP_VAPID_PUBLIC_KEY;
        if (!vapidKey) {
          try {
            const data = await apiClient.get('/push/vapid-key');
            vapidKey = data?.publicKey;
          } catch {
            // backend unreachable or endpoint missing
          }
        }
        if (!vapidKey) {
          // VAPID not configured — push disabled silently
          return;
        }

        const existing = await reg.pushManager.getSubscription();
        if (existing) {
          await apiClient.post(`/push/subscribe`, { subscription: existing.toJSON() });
          subscribedRef.current = true;
          return;
        }

        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });

        await apiClient.post(`/push/subscribe`, { subscription: subscription.toJSON() });
        subscribedRef.current = true;
      } catch (err) {
        // Push setup failed — silent in production
      }
    };

    setup();
  }, [user]);
}
