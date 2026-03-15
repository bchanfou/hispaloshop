import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import ChatToastNotification from './ChatToastNotification';
import { useNavigate } from 'react-router-dom';
import { requestNotificationPermission, showBrowserNotification } from '@/services/notifications';

const MAX_TOASTS = 3;
const AUTO_DISMISS_MS = 4000;

export default function ChatToastContainer() {
  const [toasts, setToasts] = useState([]);
  const navigate = useNavigate();
  const permissionRequested = useRef(false);

  const addToast = useCallback((notification) => {
    // Request notification permission on first message (lazy, high relevance)
    if (!permissionRequested.current) {
      permissionRequested.current = true;
      requestNotificationPermission();
    }

    // Show browser notification if app not focused
    showBrowserNotification(notification.senderName, notification.preview, {
      tag: `chat-${notification.conversationId}`,
      onClick: () => {
        window.focus();
        navigate(`/messages/${notification.conversationId}`);
      },
    });

    setToasts((prev) => {
      const next = [{ ...notification, id: Date.now() }, ...prev];
      return next.slice(0, MAX_TOASTS);
    });
  }, [navigate]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleOpen = useCallback((conversationId) => {
    navigate(`/messages/${conversationId}`);
    setToasts([]); // Clear all toasts
  }, [navigate]);

  // Auto-dismiss
  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      setToasts((prev) => prev.slice(0, -1)); // Remove oldest
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toasts]);

  // Expose addToast globally for BottomNavBar/ChatProvider to call
  useEffect(() => {
    window.__hispaloChatToast = addToast;
    return () => { delete window.__hispaloChatToast; };
  }, [addToast]);

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[80] flex flex-col items-center gap-2 pointer-events-none"
      style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <ChatToastNotification
            key={toast.id}
            notification={toast}
            onClose={() => removeToast(toast.id)}
            onOpen={handleOpen}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
