import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

const TYPE_BADGES = {
  b2c: {
    label: 'Tienda',
    bg: '#f5f5f4',
    color: '#78716c',
  },
  b2b: {
    label: 'B2B',
    bg: '#E8EEF6',
    color: '#3060A0',
  },
  collab: {
    label: 'Collab',
    bg: '#F5F0F8',
    color: '#8060B0',
  },
};

function Avatar({ src, name }) {
  const initial = (name || 'U').trim().charAt(0).toUpperCase();

  if (src) {
    return (
      <img
        src={src}
        alt={`Avatar de ${name || 'usuario'}`}
        loading="lazy"
        className="shrink-0 rounded-full object-cover"
        style={{ width: 32, height: 32 }}
      />
    );
  }

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: 32,
        height: 32,
        backgroundColor: '#f5f5f4',
        color: '#0c0a09',
        fontSize: 13,
        fontWeight: 600,
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {initial}
    </div>
  );
}

export default function ChatToastNotification({ notification, onClose, onOpen }) {
  const badge = TYPE_BADGES[notification.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.97 }}
      transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
      drag="y"
      dragConstraints={{ top: -200, bottom: 0 }}
      dragElastic={{ top: 0.3, bottom: 0 }}
      onDragEnd={(_, info) => {
        if (info.offset.y < -40) {
          onClose();
        }
      }}
      className="pointer-events-auto w-[min(92vw,400px)]"
      style={{
        background: '#ffffff',
        border: '0.5px solid #e7e5e4',
        borderRadius: '16px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        padding: '10px 14px',
      }}
    >
      <div className="flex items-center gap-3">
        {/* Clickable area: avatar + text */}
        <button
          type="button"
          onClick={() => onOpen(notification.conversationId)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          aria-label={`Abrir chat con ${notification.senderName}`}
        >
          <Avatar src={notification.avatar} name={notification.senderName} />

          <div className="min-w-0 flex-1">
            {/* Name row + badge */}
            <div className="flex items-center gap-1.5">
              <span
                className="truncate"
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#0c0a09',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                {notification.senderName}
              </span>

              {badge && (
                <span
                  className="shrink-0 rounded-full"
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    lineHeight: 1,
                    padding: '2px 6px',
                    backgroundColor: badge.bg,
                    color: badge.color,
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  {badge.label}
                </span>
              )}
            </div>

            {/* Preview */}
            <p
              className="truncate"
              style={{
                fontSize: 12,
                color: '#78716c',
                fontFamily: 'Inter, sans-serif',
                marginTop: 1,
              }}
            >
              {notification.preview}
            </p>
          </div>
        </button>

        {/* Close button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="flex shrink-0 items-center justify-center rounded-full"
          style={{
            width: 28,
            height: 28,
            color: '#78716c',
          }}
          aria-label="Cerrar notificacion"
        >
          <X style={{ width: 16, height: 16 }} />
        </button>
      </div>
    </motion.div>
  );
}
