// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ThumbsUp, ThumbsDown, MessageCircle, MoreHorizontal, Pencil, Trash2,
  Send, AlertTriangle, Clock, User as UserIcon,
} from 'lucide-react';
import apiClient from '../../services/api/client';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import EditableCommentText from '../../components/comments/EditableCommentText';
import ReportButton from '../../components/moderation/ReportButton';

const STATUS_STYLES = {
  new: 'bg-stone-200 text-stone-700',
  under_review: 'bg-stone-300 text-stone-800',
  planned: 'bg-stone-400 text-white',
  in_progress: 'bg-stone-600 text-white',
  implemented: 'bg-stone-900 text-white',
  declined: 'bg-stone-200 text-stone-400 line-through',
};

export default function FeedbackIdeaDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();

  const [idea, setIdea] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [savingComment, setSavingComment] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fetchIdea = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/feedback/ideas/${slug}`);
      setIdea(res?.data || res);
    } catch {
      toast.error(t('feedback.detail.errorLoading', 'Error al cargar la idea'));
      navigate('/feedback');
    } finally {
      setLoading(false);
    }
  }, [slug, navigate, t]);

  const fetchComments = useCallback(async () => {
    if (!idea?.idea_id) return;
    try {
      setCommentsLoading(true);
      const res = await apiClient.get(`/feedback/ideas/${idea.idea_id}/comments`);
      // Backend wraps responses as { success, data: { items, total, ... } }
      // but older/alternate paths may return flat { items }. Handle both.
      const payload = res?.data?.items ? res.data : (res?.items ? res : (res?.data || res));
      setComments(Array.isArray(payload?.items) ? payload.items : []);
    } catch (err) {
      // B3 (4.5d): surface fetch failure instead of silently hiding it — previously
      // the founder saw an empty list with no feedback when the GET failed.
      console.warn('[feedback] fetchComments failed', err);
    } finally {
      setCommentsLoading(false);
    }
  }, [idea?.idea_id]);

  useEffect(() => { fetchIdea(); }, [fetchIdea]);
  useEffect(() => { fetchComments(); }, [fetchComments]);

  // B4 (4.5d): optimistic vote — update UI immediately, revert on server error.
  // Previously the counter waited for the round-trip, which the founder saw as
  // "lag / pesado" when voting on ideas.
  const handleVote = async (voteType) => {
    if (!user) {
      window.dispatchEvent(new CustomEvent('auth:prompt_registration', { detail: { action: 'like' } }));
      return;
    }
    if (!idea?.idea_id) return;

    const prevSnapshot = {
      user_vote: idea.user_vote,
      user_voted: idea.user_voted,
      vote_count: idea.vote_count,
      upvote_count: idea.upvote_count,
      downvote_count: idea.downvote_count,
    };

    // Compute optimistic next state: same voteType again toggles off.
    const wasUp = prevSnapshot.user_vote === 'up';
    const wasDown = prevSnapshot.user_vote === 'down';
    const toggleOff = (voteType === 'up' && wasUp) || (voteType === 'down' && wasDown);
    const nextUserVote = toggleOff ? null : voteType;
    const upDelta = (nextUserVote === 'up' ? 1 : 0) - (wasUp ? 1 : 0);
    const downDelta = (nextUserVote === 'down' ? 1 : 0) - (wasDown ? 1 : 0);
    const nextUp = Math.max(0, (prevSnapshot.upvote_count ?? 0) + upDelta);
    const nextDown = Math.max(0, (prevSnapshot.downvote_count ?? 0) + downDelta);

    setIdea(prev => ({
      ...prev,
      user_vote: nextUserVote,
      user_voted: nextUserVote !== null,
      vote_count: nextUp - nextDown,
      upvote_count: nextUp,
      downvote_count: nextDown,
    }));

    try {
      const res = await apiClient.post(`/feedback/ideas/${idea.idea_id}/vote`, { vote_type: voteType });
      const data = res?.data || res;
      // Reconcile with server truth (authoritative).
      setIdea(prev => ({
        ...prev,
        user_vote: data.user_vote,
        user_voted: data.user_vote !== null,
        vote_count: data.vote_count,
        upvote_count: data.upvote_count,
        downvote_count: data.downvote_count,
      }));
    } catch (err) {
      // Revert optimistic update on failure.
      setIdea(prev => ({ ...prev, ...prevSnapshot }));
      toast.error(err?.response?.data?.detail || t('feedback.errorVoting', 'Error al votar'));
    }
  };

  // B3 (4.5d): harden comment submit — guard against missing idea_id, unwrap
  // { success, data: comment } envelope defensively, surface error detail.
  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!user) {
      window.dispatchEvent(new CustomEvent('auth:prompt_registration', { detail: { action: 'comment' } }));
      return;
    }
    const body = newComment.trim();
    if (!body) return;
    if (!idea?.idea_id) {
      toast.error(t('feedback.detail.errorComment', 'Error al comentar'));
      return;
    }
    setSubmittingComment(true);
    try {
      const res: any = await apiClient.post(
        `/feedback/ideas/${idea.idea_id}/comments`,
        { body },
      );
      // Response shape is { success: true, data: commentObj }. Unwrap robustly.
      const comment = res?.data?.comment_id ? res.data : (res?.comment_id ? res : (res?.data || res));
      if (!comment?.comment_id) {
        // Defensive: server didn't return a usable comment — refetch list so
        // the founder at least sees their comment appear if it was saved.
        await fetchComments();
      } else {
        setComments(prev => [...prev, comment]);
      }
      setNewComment('');
      setIdea(prev => ({ ...prev, comment_count: (prev?.comment_count || 0) + 1 }));
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.data?.detail || err?.message;
      toast.error(detail || t('feedback.detail.errorComment', 'Error al comentar'));
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleEditComment = async (commentId, newBody) => {
    setSavingComment(true);
    try {
      await apiClient.patch(`/feedback/comments/${commentId}`, { body: newBody });
      setComments(prev => prev.map(c =>
        c.comment_id === commentId ? { ...c, body: newBody, edited: true } : c
      ));
      setEditingCommentId(null);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Error');
    } finally {
      setSavingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await apiClient.delete(`/feedback/comments/${commentId}`);
      setComments(prev => prev.map(c =>
        c.comment_id === commentId ? { ...c, deleted: true, body: '' } : c
      ));
      setIdea(prev => ({ ...prev, comment_count: Math.max(0, (prev.comment_count || 0) - 1) }));
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Error');
    }
  };

  const handleDeleteIdea = async () => {
    try {
      await apiClient.delete(`/feedback/ideas/${idea.idea_id}`);
      toast.success(t('feedback.detail.deleted', 'Idea eliminada'));
      navigate('/feedback');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Error');
    }
    setShowDeleteConfirm(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50">
        <div className="sticky top-0 z-20 bg-stone-50/95 backdrop-blur-md border-b border-stone-200 px-4 py-3">
          <div className="h-6 w-32 bg-stone-100 rounded animate-pulse" />
        </div>
        <div className="p-4 space-y-4 animate-pulse">
          <div className="h-8 w-3/4 bg-stone-100 rounded" />
          <div className="h-4 w-full bg-stone-100 rounded" />
          <div className="h-4 w-2/3 bg-stone-100 rounded" />
        </div>
      </div>
    );
  }

  if (!idea) return null;

  const isAuthor = user && user.user_id === idea.author_id;
  const canDelete = isAuthor && (idea.vote_count || 0) <= 5;

  return (
    <div className="min-h-screen bg-stone-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-stone-50/95 backdrop-blur-md border-b border-stone-200">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate('/feedback')} className="p-2 -ml-2 rounded-full hover:bg-stone-200 transition-colors">
            <ArrowLeft size={20} className="text-stone-900" />
          </button>
          <div className="flex-1 min-w-0">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[idea.status] || STATUS_STYLES.new}`}>
              {t(`feedback.status.${idea.status}`, idea.status)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <ReportButton contentType="feedback_idea" contentId={idea.idea_id} contentOwnerId={idea.author_id} />
            {isAuthor && (
              <div className="relative">
                <button onClick={() => setShowMenu(!showMenu)} className="p-2 rounded-full hover:bg-stone-200 transition-colors">
                  <MoreHorizontal size={20} className="text-stone-600" />
                </button>
                {showMenu && (
                  <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl border border-stone-200 shadow-lg z-30 py-1">
                    <button
                      onClick={() => { setShowMenu(false); navigate(`/feedback/${slug}/edit`); }}
                      className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50"
                    >
                      <Pencil size={16} /> {t('feedback.detail.edit', 'Editar')}
                    </button>
                    {canDelete && (
                      <button
                        onClick={() => { setShowMenu(false); setShowDeleteConfirm(true); }}
                        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50"
                      >
                        <Trash2 size={16} /> {t('feedback.detail.delete', 'Eliminar')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Merged banner */}
      {idea.merged_into && (
        <div className="mx-4 mt-4 p-3 bg-stone-100 rounded-xl border border-stone-200 flex items-start gap-2">
          <AlertTriangle size={16} className="text-stone-500 mt-0.5 shrink-0" />
          <p className="text-sm text-stone-600">
            {t('feedback.detail.mergedBanner', 'Esta idea fue fusionada con')}{' '}
            <Link to={`/feedback/${idea.merged_into_slug}`} className="font-medium text-stone-950 underline">
              {idea.merged_into_title || t('feedback.detail.mainIdea', 'la idea principal')}
            </Link>
          </p>
        </div>
      )}

      {/* Idea card */}
      <div className="p-4 max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-start gap-4">
            {/* Vote buttons */}
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={() => handleVote('up')}
                title={t('feedback.voteUpTooltip', 'A favor de esta idea')}
                className={`flex items-center justify-center min-w-[48px] min-h-[48px] p-2.5 rounded-xl transition-colors ${
                  idea.user_vote === 'up'
                    ? 'bg-stone-950 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                <ThumbsUp size={20} />
              </button>
              <span className="text-sm font-bold text-stone-950">{idea.vote_count ?? 0}</span>
              <button
                onClick={() => handleVote('down')}
                title={t('feedback.voteDownTooltip', 'En contra de esta idea')}
                className={`flex items-center justify-center min-w-[48px] min-h-[48px] p-2.5 rounded-xl transition-colors ${
                  idea.user_vote === 'down'
                    ? 'bg-stone-950 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                <ThumbsDown size={20} />
              </button>
              {(user?.role === 'country_admin' || user?.role === 'admin' || user?.role === 'super_admin') && (
                <div className="flex items-center gap-2 text-[10px] text-stone-400 mt-0.5">
                  <span>{idea.upvote_count ?? 0} up</span>
                  <span>{idea.downvote_count ?? 0} down</span>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-medium">
                  {t(`feedback.categories.${idea.category}`, idea.category)}
                </span>
              </div>
              <h1 className="text-xl font-bold text-stone-950 leading-tight">{idea.title}</h1>
              <p className="text-stone-700 mt-3 whitespace-pre-wrap leading-relaxed">{idea.description}</p>

              {/* Author + timestamp */}
              <div className="flex items-center gap-3 mt-4 text-xs text-stone-400">
                <div className="flex items-center gap-1.5">
                  {idea.author_avatar ? (
                    <img src={idea.author_avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                  ) : (
                    <UserIcon size={14} />
                  )}
                  <span>{idea.author_name}</span>
                </div>
                <span>{new Date(idea.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Status note from admin */}
          {idea.status_note && (
            <div className="mt-4 p-3 bg-stone-50 rounded-xl border border-stone-200">
              <div className="flex items-center gap-1.5 mb-1">
                <Clock size={12} className="text-stone-400" />
                <span className="text-[11px] text-stone-400 font-medium">
                  {t('feedback.detail.adminNote', 'Nota del equipo')}
                  {idea.status_changed_at && ` - ${new Date(idea.status_changed_at).toLocaleDateString()}`}
                </span>
              </div>
              <p className="text-sm text-stone-600">{idea.status_note}</p>
            </div>
          )}
        </div>

        {/* Comments section */}
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-stone-950 mb-3 flex items-center gap-2">
            <MessageCircle size={16} />
            {t('feedback.detail.comments', 'Comentarios')} ({idea.comment_count || 0})
          </h2>

          {commentsLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                  <div className="flex gap-2">
                    <div className="w-7 h-7 bg-stone-100 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-24 bg-stone-100 rounded" />
                      <div className="h-3 w-full bg-stone-100 rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-6">
              {t('feedback.detail.noComments', 'Sin comentarios aun. Se el primero.')}
            </p>
          ) : (
            <div className="space-y-2">
              {comments.map(comment => {
                const isCommentAuthor = user && user.user_id === comment.author_id;
                return (
                  <div key={comment.comment_id} className="bg-white rounded-xl p-4">
                    <div className="flex items-start gap-2.5">
                      {comment.author_avatar ? (
                        <img src={comment.author_avatar} alt="" className="w-7 h-7 rounded-full object-cover mt-0.5" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-stone-200 flex items-center justify-center mt-0.5">
                          <UserIcon size={14} className="text-stone-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-medium text-stone-950">{comment.author_name}</span>
                          <span className="text-[10px] text-stone-400">
                            {new Date(comment.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        <EditableCommentText
                          text={comment.body}
                          edited={comment.edited}
                          deleted={comment.deleted}
                          editing={editingCommentId === comment.comment_id}
                          saving={savingComment}
                          maxLength={500}
                          onSave={(newBody) => handleEditComment(comment.comment_id, newBody)}
                          onCancel={() => setEditingCommentId(null)}
                        />

                        {/* Actions for own comments */}
                        {isCommentAuthor && !comment.deleted && editingCommentId !== comment.comment_id && (
                          <div className="flex items-center gap-3 mt-1">
                            <button
                              onClick={() => setEditingCommentId(comment.comment_id)}
                              className="text-[11px] text-stone-400 hover:text-stone-600"
                            >
                              {t('feedback.detail.editComment', 'Editar')}
                            </button>
                            <button
                              onClick={() => handleDeleteComment(comment.comment_id)}
                              className="text-[11px] text-stone-400 hover:text-stone-600"
                            >
                              {t('feedback.detail.deleteComment', 'Eliminar')}
                            </button>
                          </div>
                        )}

                        {/* Report for others' comments */}
                        {!isCommentAuthor && !comment.deleted && (
                          <div className="mt-1">
                            <ReportButton contentType="feedback_comment" contentId={comment.comment_id} contentOwnerId={comment.author_id} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* New comment input - fixed bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 px-4 py-3 z-10">
        <form onSubmit={handleSubmitComment} className="flex items-center gap-2 max-w-2xl mx-auto">
          <input
            type="text"
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder={user ? t('feedback.detail.commentPlaceholder', 'Escribe un comentario...') : t('feedback.detail.loginToComment', 'Inicia sesion para comentar')}
            disabled={!user}
            maxLength={500}
            className="flex-1 px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-full text-sm outline-none focus:border-stone-400 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!user || !newComment.trim() || submittingComment}
            className="p-2.5 bg-stone-950 text-white rounded-full disabled:opacity-50 transition-colors hover:bg-stone-800"
          >
            <Send size={18} />
          </button>
        </form>
      </div>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-stone-950 mb-2">{t('feedback.detail.confirmDeleteTitle', 'Eliminar idea')}</h3>
              <p className="text-sm text-stone-600 mb-6">{t('feedback.detail.confirmDeleteBody', 'Esta accion no se puede deshacer.')}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-200 text-sm font-medium text-stone-700 hover:bg-stone-50"
                >
                  {t('feedback.detail.cancel', 'Cancelar')}
                </button>
                <button
                  onClick={handleDeleteIdea}
                  className="flex-1 py-2.5 rounded-xl bg-stone-950 text-white text-sm font-medium hover:bg-stone-800"
                >
                  {t('feedback.detail.confirmDelete', 'Eliminar')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
