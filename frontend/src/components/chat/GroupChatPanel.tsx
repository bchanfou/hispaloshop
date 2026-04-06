// @ts-nocheck
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Users, Crown, UserPlus, LogOut, BellOff, Bell, Flag, Settings, X,
} from 'lucide-react';
import apiClient from '../../services/api/client';

interface GroupChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: any;
  currentUserId: string;
  onLeave: () => void;
  onMuteToggle: () => void;
}

interface Member {
  user_id: string;
  name: string;
  avatar_url?: string;
  role: 'admin' | 'member';
}

const MAX_MEMBERS = 50;

export default function GroupChatPanel({
  isOpen, onClose, conversation, currentUserId, onLeave, onMuteToggle,
}: GroupChatPanelProps) {
  const { t } = useTranslation();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdminTransfer, setShowAdminTransfer] = useState(false);
  const [selectedNewAdmin, setSelectedNewAdmin] = useState<string | null>(null);

  const isAdmin = members.find((m) => m.user_id === currentUserId)?.role === 'admin';
  const isMuted = conversation?.is_muted ?? false;

  useEffect(() => {
    if (!isOpen || !conversation?._id) return;
    setLoading(true);
    apiClient.get(`/chat/groups/${conversation._id}/members`)
      .then((res) => setMembers(res.data?.members ?? res.data ?? []))
      .catch(() => toast.error(t('chat.group.fetchError', 'Error loading members')))
      .finally(() => setLoading(false));
  }, [isOpen, conversation?._id, t]);

  const handleRemoveMember = async (userId: string) => {
    if (!isAdmin) return;
    try {
      await apiClient.delete(`/chat/groups/${conversation._id}/members/${userId}`);
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
      toast.success(t('chat.group.memberRemoved', 'Member removed'));
    } catch { toast.error(t('chat.group.removeError', 'Could not remove member')); }
  };

  const handleLeave = () => {
    if (isAdmin && members.length > 1) {
      setShowAdminTransfer(true);
      return;
    }
    onLeave();
  };

  const confirmLeaveWithTransfer = async () => {
    if (!selectedNewAdmin) { toast.error(t('chat.group.selectAdmin', 'Select a new admin')); return; }
    try {
      await apiClient.post(`/chat/groups/${conversation._id}/transfer-admin`, { new_admin_id: selectedNewAdmin });
      onLeave();
    } catch { toast.error(t('chat.group.transferError', 'Could not transfer admin role')); }
  };

  const handleReport = async () => {
    try {
      await apiClient.post(`/chat/groups/${conversation._id}/report`);
      toast.success(t('chat.group.reported', 'Group reported'));
    } catch { toast.error(t('chat.group.reportError', 'Could not report group')); }
  };

  const handleMute = async () => {
    try {
      await apiClient.post(`/chat/groups/${conversation._id}/mute`);
      onMuteToggle();
    } catch { toast.error(t('chat.group.muteError', 'Could not update notifications')); }
  };

  const overlay = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
  const sheet = {
    hidden: { y: '100%' },
    visible: { y: 0, transition: { type: 'spring', damping: 28, stiffness: 300 } },
    exit: { y: '100%', transition: { duration: 0.2 } },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div className="fixed inset-0 z-40 bg-black/40" variants={overlay}
            initial="hidden" animate="visible" exit="hidden" onClick={onClose} />
          <motion.div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl max-h-[85vh] overflow-y-auto"
            variants={sheet} initial="hidden" animate="visible" exit="exit">
            {/* Header */}
            <div className="sticky top-0 bg-white rounded-t-2xl border-b border-stone-100 px-4 pt-3 pb-2 flex items-center justify-between">
              <h2 className="text-base font-semibold text-stone-950">{t('chat.group.settings', 'Group settings')}</h2>
              <button onClick={onClose} className="p-1.5 rounded-full hover:bg-stone-100 transition-colors">
                <X size={20} className="text-stone-600" />
              </button>
            </div>

            <div className="px-4 pb-6 space-y-5">
              {/* Group info */}
              <div className="pt-4 flex flex-col items-center text-center gap-2">
                <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center">
                  {conversation?.avatar_url
                    ? <img src={conversation.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover" />
                    : <Users size={28} className="text-stone-400" />}
                </div>
                <h3 className="text-lg font-semibold text-stone-950">{conversation?.name ?? 'Group'}</h3>
                {conversation?.description && (
                  <p className="text-sm text-stone-500 max-w-[260px]">{conversation.description}</p>
                )}
                <span className="text-xs text-stone-400">{members.length} / {MAX_MEMBERS} {t('chat.group.members', 'members')}</span>
                {isAdmin && (
                  <button className="text-xs text-stone-600 flex items-center gap-1 hover:text-stone-950 transition-colors">
                    <Settings size={14} /> {t('chat.group.edit', 'Edit group')}
                  </button>
                )}
              </div>

              {/* Members */}
              <div>
                <h4 className="text-sm font-medium text-stone-700 mb-2">{t('chat.group.membersList', 'Members')}</h4>
                {loading ? (
                  <div className="space-y-3">{[0,1,2].map((i) => (
                    <div key={i} className="h-10 rounded-xl bg-stone-100 animate-pulse" />
                  ))}</div>
                ) : (
                  <ul className="space-y-1">
                    {members.map((m) => (
                      <li key={m.user_id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-stone-50 transition-colors">
                        <div className="w-9 h-9 rounded-full bg-stone-200 flex items-center justify-center overflow-hidden shrink-0">
                          {m.avatar_url ? <img src={m.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                            : <span className="text-sm font-medium text-stone-500">{m.name?.[0]?.toUpperCase()}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-stone-950 truncate block">{m.name}</span>
                        </div>
                        {m.role === 'admin' && <Crown size={16} className="text-stone-950 shrink-0" />}
                        {isAdmin && m.user_id !== currentUserId && (
                          <button onClick={() => handleRemoveMember(m.user_id)}
                            className="text-xs text-stone-400 hover:text-stone-700 transition-colors px-2 py-1 rounded-lg hover:bg-stone-100">
                            {t('chat.group.remove', 'Remove')}
                          </button>
                        )}
                      </li>
                    ))}
                    {isAdmin && (
                      <li className="flex items-center gap-3 p-2 rounded-xl hover:bg-stone-50 cursor-pointer transition-colors">
                        <div className="w-9 h-9 rounded-full border-2 border-dashed border-stone-300 flex items-center justify-center">
                          <UserPlus size={16} className="text-stone-400" />
                        </div>
                        <span className="text-sm font-medium text-stone-500">{t('chat.group.addMember', 'Add member')}</span>
                      </li>
                    )}
                  </ul>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-1 pt-1">
                <button onClick={handleMute}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 transition-colors">
                  {isMuted ? <Bell size={18} className="text-stone-500" /> : <BellOff size={18} className="text-stone-500" />}
                  <span className="text-sm text-stone-700">
                    {isMuted ? t('chat.group.unmute', 'Unmute notifications') : t('chat.group.mute', 'Mute notifications')}
                  </span>
                </button>
                <button onClick={handleReport}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 transition-colors">
                  <Flag size={18} className="text-stone-500" />
                  <span className="text-sm text-stone-700">{t('chat.group.report', 'Report group')}</span>
                </button>
                <button onClick={handleLeave}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 transition-colors">
                  <LogOut size={18} className="text-stone-500" />
                  <span className="text-sm text-stone-700">{t('chat.group.leave', 'Leave group')}</span>
                </button>
              </div>
            </div>

            {/* Admin transfer modal */}
            <AnimatePresence>
              {showAdminTransfer && (
                <motion.div className="fixed inset-0 z-[60] flex items-end justify-center"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="absolute inset-0 bg-black/40" onClick={() => setShowAdminTransfer(false)} />
                  <motion.div className="relative bg-white rounded-t-2xl w-full p-4 pb-6 max-h-[60vh] overflow-y-auto"
                    initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}>
                    <h3 className="text-base font-semibold text-stone-950 mb-1">{t('chat.group.transferTitle', 'Select new admin')}</h3>
                    <p className="text-sm text-stone-500 mb-3">{t('chat.group.transferDesc', 'Choose a member to become admin before leaving.')}</p>
                    <ul className="space-y-1 mb-4">
                      {members.filter((m) => m.user_id !== currentUserId).map((m) => (
                        <li key={m.user_id}
                          onClick={() => setSelectedNewAdmin(m.user_id)}
                          className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors ${
                            selectedNewAdmin === m.user_id ? 'bg-stone-100 ring-1 ring-stone-300' : 'hover:bg-stone-50'
                          }`}>
                          <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-xs font-medium text-stone-500">
                            {m.name?.[0]?.toUpperCase()}
                          </div>
                          <span className="text-sm text-stone-950">{m.name}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="flex gap-2">
                      <button onClick={() => setShowAdminTransfer(false)}
                        className="flex-1 py-2.5 rounded-xl border border-stone-200 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors">
                        {t('common.cancel', 'Cancel')}
                      </button>
                      <button onClick={confirmLeaveWithTransfer}
                        className="flex-1 py-2.5 rounded-xl bg-stone-950 text-white text-sm font-medium hover:bg-stone-800 transition-colors">
                        {t('chat.group.confirmLeave', 'Transfer & leave')}
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
