import React from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Send, Bookmark } from 'lucide-react';
import { Link } from 'react-router-dom';

function Count({ n }) {
  if (!n && n !== 0) return null;
  let label;
  if (n >= 1_000_000) label = `${(n / 1_000_000).toFixed(1)}M`;
  else if (n >= 1_000) label = `${(n / 1_000).toFixed(1)}k`;
  else label = String(n);

  return (
    <span style={{
      fontSize: 11, fontWeight: 600, color: '#fff',
      fontFamily: 'var(--font-sans)',
      textShadow: '0 1px 3px rgba(0,0,0,0.5)',
      lineHeight: 1,
    }}>
      {label}
    </span>
  );
}

function SidebarAction({ icon, count, onClick, active = false }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.82 }}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
        transition: 'background 0.15s',
      }}>
        {icon}
      </div>
      {count !== undefined ? <Count n={count} /> : null}
    </motion.button>
  );
}

function ReelSidebar({
  reel,
  isLiked,
  likesCount,
  isSaved,
  onLike,
  onSave,
  onOpenComments,
  onShare,
}) {
  return (
    <div
      style={{
        position: 'absolute', right: 8, zIndex: 20,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
        bottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 100px), 116px)',
      }}
    >
      {/* Avatar */}
      <Link
        to={`/user/${reel.user.id}`}
        onClick={(e) => e.stopPropagation()}
        style={{ marginBottom: 6 }}
      >
        <div style={{
          width: 44, height: 44, borderRadius: '50%', overflow: 'hidden',
          border: '2px solid #fff', background: 'rgba(255,255,255,0.2)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}>
          {reel.user.avatar ? (
            <img src={reel.user.avatar} alt={reel.user.username}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <svg style={{ width: '100%', height: '100%', fill: 'rgba(255,255,255,0.5)' }} viewBox="0 0 24 24">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
            </svg>
          )}
        </div>
      </Link>

      {/* Like */}
      <SidebarAction
        active={isLiked}
        onClick={onLike}
        count={likesCount}
        icon={
          <Heart
            size={28}
            strokeWidth={isLiked ? 0 : 1.8}
            fill={isLiked ? '#fff' : 'none'}
            color="#fff"
            style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.4))' }}
          />
        }
      />

      {/* Comments */}
      <SidebarAction
        onClick={onOpenComments}
        count={reel.stats.comments}
        icon={
          <MessageCircle
            size={28} strokeWidth={1.8} color="#fff"
            style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.4))' }}
          />
        }
      />

      {/* Share */}
      <SidebarAction
        onClick={onShare}
        count={reel.stats.shares > 0 ? reel.stats.shares : undefined}
        icon={
          <Send
            size={26} strokeWidth={1.8} color="#fff"
            style={{ transform: 'rotate(-10deg)', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.4))' }}
          />
        }
      />

      {/* Bookmark */}
      <SidebarAction
        active={isSaved}
        onClick={onSave}
        icon={
          <Bookmark
            size={28}
            strokeWidth={isSaved ? 0 : 1.8}
            fill={isSaved ? '#fff' : 'none'}
            color="#fff"
            style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.4))' }}
          />
        }
      />
    </div>
  );
}

export default ReelSidebar;
