import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Send } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// Mock comments
const MOCK_COMMENTS = [
  {
    id: 'c1',
    user: { id: 'u1', username: 'maria_gourmet', avatar: 'https://i.pravatar.cc/150?u=1' },
    text: '¡Se ve increíble! 😍 ¿Hacen envíos a Barcelona?',
    likes: 12,
    liked: false,
    replies: [],
    timestamp: Date.now() - 3600000,
  },
  {
    id: 'c2',
    user: { id: 'u2', username: 'juanfoodies', avatar: 'https://i.pravatar.cc/150?u=2' },
    text: 'El mejor queso que he probado en mi vida 🧀',
    likes: 45,
    liked: true,
    replies: [
      {
        id: 'r1',
        user: { id: 'u3', username: 'queserialaantigua', avatar: 'https://i.pravatar.cc/150?u=3' },
        text: '¡Gracias Juan! Nos alegra que te guste ❤️',
        likes: 8,
        liked: false,
        timestamp: Date.now() - 1800000,
      }
    ],
    timestamp: Date.now() - 7200000,
  },
  {
    id: 'c3',
    user: { id: 'u4', username: 'laura_cocina', avatar: 'https://i.pravatar.cc/150?u=4' },
    text: '¿Cuánto tiempo de curación tiene?',
    likes: 3,
    liked: false,
    replies: [],
    timestamp: Date.now() - 10800000,
  },
];

function CommentItem({ comment, onLike }) {
  const [liked, setLiked] = useState(comment.liked);
  const [likes, setLikes] = useState(comment.likes);
  const [showReplies, setShowReplies] = useState(false);

  const handleLike = () => {
    setLiked(!liked);
    setLikes(liked ? likes - 1 : likes + 1);
    onLike?.(comment.id, !liked);
  };

  const formatTime = (timestamp) => {
    const hours = Math.floor((Date.now() - timestamp) / 3600000);
    if (hours < 1) return 'Ahora';
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  return (
    <div className="mb-4">
      <div className="flex gap-3">
        <img
          src={comment.user.avatar}
          alt={comment.user.username}
          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="font-semibold text-sm">{comment.user.username}</span>
              <span className="text-sm text-stone-950 ml-1">{comment.text}</span>
            </div>
            <button
              onClick={handleLike}
              className="flex-shrink-0 p-1"
            >
              <Heart className={`w-4 h-4 ${liked ? 'fill-[#FF3040] text-[#FF3040]' : 'text-text-muted'}`} />
            </button>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
            <span>{formatTime(comment.timestamp)}</span>
            {likes > 0 && <span>{likes} me gusta</span>}
            <button className="font-semibold">Responder</button>
          </div>
          
          {/* Replies */}
          {comment.replies?.length > 0 && (
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="text-xs text-text-muted mt-2 flex items-center gap-1"
            >
              <div className="w-6 h-px bg-stone-500" />
              {showReplies ? 'Ocultar' : `Ver ${comment.replies.length} respuesta${comment.replies.length > 1 ? 's' : ''}`}
            </button>
          )}
          
          {showReplies && comment.replies?.map((reply) => (
            <div key={reply.id} className="flex gap-2 mt-3 ml-2">
              <img
                src={reply.user.avatar}
                alt={reply.user.username}
                className="w-6 h-6 rounded-full object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-xs">{reply.user.username}</span>
                <span className="text-xs text-stone-950 ml-1">{reply.text}</span>
                <div className="text-[10px] text-stone-400 mt-0.5">
                  {formatTime(reply.timestamp)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReelComments({ isOpen, onClose, commentsCount }) {
  const { user } = useAuth();
  const [comments, setComments] = useState(MOCK_COMMENTS);
  const [newComment, setNewComment] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const comment = {
      id: `new-${Date.now()}`,
      user: {
        id: user?.user_id || 'me',
        username: user?.name || 'Tú',
        avatar: user?.profile_image || '/default-avatar.png',
      },
      text: newComment,
      likes: 0,
      liked: false,
      replies: [],
      timestamp: Date.now(),
    };

    setComments([comment, ...comments]);
    setNewComment('');
  };

  const handleLikeComment = (commentId, liked) => {
    // TODO: API call
    console.log('Like comment:', commentId, liked);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-h-[70vh] flex flex-col"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-stone-300 rounded-full" />
            </div>
            
            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-3 border-b border-stone-100">
              <span className="font-semibold text-lg">{commentsCount} comentarios</span>
              <button onClick={onClose} className="p-2">
                <X className="w-5 h-5 text-text-muted" />
              </button>
            </div>
            
            {/* Comments list */}
            <div className="flex-1 overflow-y-auto p-4">
              {comments.length === 0 ? (
                <div className="text-center py-10 text-text-muted">
                  <p className="text-sm">Sé el primero en comentar</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    onLike={handleLikeComment}
                  />
                ))
              )}
            </div>
            
            {/* Input */}
            <form onSubmit={handleSubmit} className="p-3 border-t border-stone-100 bg-white">
              <div className="flex items-center gap-3">
                <img
                  src={user?.profile_image || '/default-avatar.png'}
                  alt="Tú"
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Añade un comentario..."
                    className="w-full bg-stone-100 rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!newComment.trim()}
                  className="p-2 text-accent disabled:opacity-30"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default ReelComments;
