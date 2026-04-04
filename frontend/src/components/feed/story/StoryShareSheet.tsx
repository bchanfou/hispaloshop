// @ts-nocheck
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Send } from 'lucide-react';
import i18n from '../../../locales/i18n';

interface Conversation {
  id?: string;
  _id?: string;
  conversation_id?: string;
  name?: string;
  other_user?: {
    name?: string;
    username?: string;
    avatar_url?: string;
    avatar?: string;
    profile_image?: string;
  };
  participants?: Array<{ name?: string; username?: string }>;
}

interface StoryShareSheetProps {
  open: boolean;
  loading: boolean;
  conversations: Conversation[];
  search: string;
  sendingId: string | null;
  onSearchChange: (value: string) => void;
  onClose: () => void;
  onShareToUser: (conversation: Conversation) => void;
}

export default function StoryShareSheet({
  open,
  loading,
  conversations,
  search,
  sendingId,
  onSearchChange,
  onClose,
  onShareToUser,
}: StoryShareSheetProps) {
  const filtered = conversations.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = (
      c.other_user?.name ||
      c.other_user?.username ||
      c.name ||
      ''
    ).toLowerCase();
    return name.includes(q);
  });

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="absolute bottom-0 left-0 right-0 z-[100] bg-stone-950 rounded-t-3xl max-h-[60vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <span className="text-base font-semibold text-white">
              Compartir historia
            </span>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border-none cursor-pointer"
              aria-label="Cerrar panel de compartir"
            >
              <X size={16} className="text-white" />
            </button>
          </div>

          {/* Search */}
          <div className="px-4 pb-2">
            <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-2">
              <Search size={16} className="text-white/40 shrink-0" />
              <input
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={i18n.t(
                  'story_viewer.buscarConversacion',
                  'Buscar conversación...',
                )}
                className="flex-1 bg-transparent text-white border-none outline-none text-sm placeholder:text-white/30 font-sans"
                autoFocus
              />
            </div>
          </div>

          {/* Conversations list */}
          <div className="flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom,8px)+8px)]">
            {loading ? (
              <div className="flex justify-center py-6">
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-white/40 text-sm py-6">
                {search
                  ? 'Sin resultados'
                  : 'No hay conversaciones recientes'}
              </p>
            ) : (
              filtered.slice(0, 20).map((conv) => {
                const convId =
                  conv.id || conv._id || conv.conversation_id;
                const otherUser =
                  conv.other_user || conv.participants?.[0] || {};
                const name =
                  otherUser.name ||
                  otherUser.username ||
                  conv.name ||
                  'Usuario';
                const avatar =
                  otherUser.avatar_url ||
                  otherUser.avatar ||
                  otherUser.profile_image;

                return (
                  <button
                    key={convId}
                    onClick={() => onShareToUser(conv)}
                    disabled={sendingId === convId}
                    className="flex items-center gap-3 w-full px-2 py-3 bg-transparent border-none cursor-pointer rounded-2xl hover:bg-white/10 transition-colors text-left disabled:opacity-50"
                  >
                    {avatar ? (
                      <img
                        src={avatar}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                        {name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="flex-1 text-sm text-white font-medium truncate">
                      {name}
                    </span>
                    {sendingId === convId ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                    ) : (
                      <Send
                        size={16}
                        className="text-white/40 shrink-0"
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
