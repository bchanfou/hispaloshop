import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// ── Emoji reactions (fila superior del sheet) ────────────────────────────────
const REACTIONS = ['👍', '❤️', '🔥', '😢', '😮', '💯', '😂'];

function ReactionsBar() {
  return (
    <div className="flex items-center justify-around border-b border-stone-100 px-2 py-2.5">
      {REACTIONS.map((emoji) => (
        <motion.button
          key={emoji}
          type="button"
          whileTap={{ scale: 1.45 }}
          className="text-[22px] leading-none active:opacity-80"
          aria-label={emoji}
        >
          {emoji}
        </motion.button>
      ))}
    </div>
  );
}

// ── Formatea tiempo relativo ─────────────────────────────────────────────────
function relTime(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60)   return 'Ahora';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

// ── Avatar placeholder ────────────────────────────────────────────────────────
function Avatar({ src, size = 8, alt = '' }) {
  const cls = `h-${size} w-${size} shrink-0 overflow-hidden rounded-full bg-stone-100`;
  return (
    <div className={cls}>
      {src ? (
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <svg className="h-full w-full fill-stone-300" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
        </svg>
      )}
    </div>
  );
}

// ── Item de comentario ────────────────────────────────────────────────────────
function CommentItem({ comment, onLike, onReply }) {
  const [liked,      setLiked]      = useState(comment.liked);
  const [likeCount,  setLikeCount]  = useState(comment.likes);
  const [showReplies, setShowReplies] = useState(false);

  const handleLike = () => {
    const next = !liked;
    setLiked(next);
    setLikeCount((n) => next ? n + 1 : n - 1);
    onLike?.(comment.id, next);
  };

  return (
    <div className="mb-4">
      <div className="flex gap-2.5">
        <Avatar src={comment.user.avatar} size={8} alt={comment.user.username} />

        <div className="min-w-0 flex-1">
          {/* Username inline + texto */}
          <div className="flex items-start justify-between gap-2">
            <p className="flex-1 text-[13px] leading-[1.45] text-stone-800">
              <span className="mr-1.5 font-semibold text-stone-950">
                {comment.user.username}
              </span>
              {comment.text}
            </p>

            {/* Like del comentario */}
            <button
              type="button"
              onClick={handleLike}
              className="shrink-0 p-1 active:opacity-60"
            >
              <Heart
                className={`h-[14px] w-[14px] transition-colors ${
                  liked ? 'fill-stone-950 text-stone-950' : 'text-stone-300'
                }`}
                strokeWidth={liked ? 0 : 1.8}
              />
            </button>
          </div>

          {/* Meta: tiempo + likes + responder */}
          <div className="mt-1 flex items-center gap-3">
            <span className="text-[11px] text-stone-400">{relTime(comment.timestamp)}</span>
            {likeCount > 0 ? (
              <span className="text-[11px] text-stone-400">
                {likeCount} me gusta
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => onReply?.(comment.user.username)}
              className="text-[11px] font-semibold text-stone-500 active:text-stone-950"
            >
              Responder
            </button>
          </div>

          {/* Botón expandir respuestas */}
          {comment.replies?.length > 0 ? (
            <button
              type="button"
              onClick={() => setShowReplies((v) => !v)}
              className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-stone-500 active:opacity-60"
            >
              <div className="h-px w-5 bg-stone-300" />
              {showReplies
                ? 'Ocultar respuestas'
                : `Ver ${comment.replies.length} respuesta${comment.replies.length > 1 ? 's' : ''}`}
            </button>
          ) : null}

          {/* Respuestas */}
          {showReplies ? comment.replies?.map((reply) => (
            <div key={reply.id} className="mt-3 flex gap-2">
              <Avatar src={reply.user.avatar} size={6} alt={reply.user.username} />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] leading-[1.4] text-stone-800">
                  <span className="mr-1 font-semibold text-stone-950">
                    {reply.user.username}
                  </span>
                  {reply.text}
                </p>
                <span className="text-[10px] text-stone-400">{relTime(reply.timestamp)}</span>
              </div>
            </div>
          )) : null}
        </div>
      </div>
    </div>
  );
}

// ── Datos iniciales (placeholder hasta que la API de comentarios esté disponible) ──
const PLACEHOLDER_COMMENTS = [
  {
    id: 'pc1',
    user: { id: 'u1', username: 'maria_gourmet', avatar: 'https://i.pravatar.cc/150?u=1' },
    text: '¡Se ve increíble! 😍 ¿Hacen envíos a Barcelona?',
    likes: 12, liked: false, replies: [],
    timestamp: Date.now() - 3_600_000,
  },
  {
    id: 'pc2',
    user: { id: 'u2', username: 'juanfoodies', avatar: 'https://i.pravatar.cc/150?u=2' },
    text: 'El mejor queso que he probado en mi vida 🧀',
    likes: 45, liked: true,
    replies: [
      {
        id: 'pr1',
        user: { id: 'u3', username: 'queserialaantigua', avatar: 'https://i.pravatar.cc/150?u=3' },
        text: '¡Gracias Juan! Nos alegra que te guste ❤️',
        likes: 8, liked: false, timestamp: Date.now() - 1_800_000,
      },
    ],
    timestamp: Date.now() - 7_200_000,
  },
  {
    id: 'pc3',
    user: { id: 'u4', username: 'laura_cocina', avatar: 'https://i.pravatar.cc/150?u=4' },
    text: '¿Cuánto tiempo de curación tiene?',
    likes: 3, liked: false, replies: [],
    timestamp: Date.now() - 10_800_000,
  },
];

// ── Componente principal ──────────────────────────────────────────────────────
function ReelComments({ isOpen, onClose, reelId, commentsCount }) {
  const { user }  = useAuth();
  const [comments, setComments] = useState(PLACEHOLDER_COMMENTS);
  const [text,     setText]     = useState('');
  const inputRef = useRef(null);

  // Focus al abrir
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 380);
      return () => clearTimeout(t);
    }
    setText('');
  }, [isOpen]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!text.trim()) return;

    setComments((prev) => [
      {
        id: `c-${Date.now()}`,
        user: {
          id:       user?.user_id || 'me',
          username: user?.username || user?.name || 'Tú',
          avatar:   user?.profile_image || null,
        },
        text:      text.trim(),
        likes:     0,
        liked:     false,
        replies:   [],
        timestamp: Date.now(),
      },
      ...prev,
    ]);
    setText('');
  };

  const handleReply = (username) => {
    const mention = `@${username} `;
    setText((cur) => (cur.startsWith(mention) ? cur : mention));
    inputRef.current?.focus();
  };

  const handleLikeComment = (commentId, liked) => {
    // TODO: POST /reels/:reelId/comments/:commentId/like
  };

  const displayCount = Math.max(commentsCount ?? 0, comments.length);

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          {/* ── Backdrop ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/45"
          />

          {/* ── Sheet ── */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 z-50 flex max-h-[75vh] flex-col overflow-hidden rounded-t-[20px] bg-white shadow-2xl"
          >
            {/* Handle */}
            <div className="flex shrink-0 justify-center pb-2 pt-3">
              <div className="h-1 w-8 rounded-full bg-stone-200" />
            </div>

            {/* ── Cabecera Comentarios + X ── */}
            <div className="flex shrink-0 items-center justify-between px-4 pb-2.5">
              <span className="text-[15px] font-semibold text-stone-950">
                Comentarios
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar comentarios"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 active:bg-stone-200"
              >
                <X className="h-4 w-4 text-stone-600" strokeWidth={2.2} />
              </button>
            </div>

            {/* ── Barra de emoji reactions ── */}
            <ReactionsBar />

            {/* ── Contador ── */}
            {displayCount > 0 ? (
              <div className="shrink-0 px-4 pb-1 pt-3">
                <span className="text-[12px] font-medium text-stone-400">
                  {displayCount.toLocaleString('es-ES')} comentarios
                </span>
              </div>
            ) : null}

            {/* ── Lista de comentarios ── */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-2 pt-3">
              {comments.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-[14px] text-stone-400">Sé el primero en comentar</p>
                </div>
              ) : (
                comments.map((c) => (
                  <CommentItem
                    key={c.id}
                    comment={c}
                    onLike={handleLikeComment}
                    onReply={handleReply}
                  />
                ))
              )}
            </div>

            {/* ── Input flotante ── */}
            <div
              className="shrink-0 border-t border-stone-100 bg-white px-3 py-2.5"
              style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)' }}
            >
              <div className="flex items-center gap-2.5">
                {/* Avatar propio */}
                <Avatar src={user?.profile_image || null} size={8} alt="Tú" />

                {/* Input + botón publicar */}
                <form
                  onSubmit={handleSubmit}
                  className="flex flex-1 items-center gap-2 rounded-full bg-stone-100 px-4 py-2.5"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Únete a la conversación..."
                    className="flex-1 bg-transparent text-[13px] text-stone-950 placeholder-stone-400 outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); }
                    }}
                  />

                  {/* "Publicar" — aparece cuando hay texto */}
                  <AnimatePresence>
                    {text.trim() ? (
                      <motion.button
                        type="submit"
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.7 }}
                        transition={{ duration: 0.14 }}
                        className="shrink-0 text-[13px] font-semibold text-stone-950 active:opacity-60"
                      >
                        Publicar
                      </motion.button>
                    ) : null}
                  </AnimatePresence>
                </form>
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

export default ReelComments;
