import { useEffect, useRef } from 'react';
import axios from 'axios';
import { API } from '../utils/api';

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

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        const vapidKey = process.env.REACT_APP_VAPID_PUBLIC_KEY;
        if (!vapidKey) return;

        const existing = await reg.pushManager.getSubscription();
        if (existing) {
          await axios.post(`${API}/push/subscribe`, { subscription: existing.toJSON() }, { withCredentials: true });
          subscribedRef.current = true;
          return;
        }

        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });

        await axios.post(`${API}/push/subscribe`, { subscription: subscription.toJSON() }, { withCredentials: true });
        subscribedRef.current = true;
      } catch (err) {
        console.warn('[Push] Setup failed:', err.message);
      }
    };

    setup();
  }, [user]);
}
