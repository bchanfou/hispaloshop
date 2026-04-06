// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Plus, Check, X, Loader2 } from 'lucide-react';
import apiClient from '../../services/api/client';
import { toast } from 'sonner';

interface AddToWishlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName?: string;
}

const overlay = { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } };
const sheet = {
  hidden: { y: '100%' },
  visible: { y: 0, transition: { type: 'spring', damping: 28, stiffness: 300 } },
  exit: { y: '100%', transition: { duration: 0.2 } },
};

export default function AddToWishlistModal({ isOpen, onClose, productId, productName }: AddToWishlistModalProps) {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState<Record<string, boolean>>({});
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    apiClient.get('/wishlists')
      .then((data) => setLists(data?.wishlists ?? data ?? []))
      .catch(() => toast.error('No se pudieron cargar las listas'))
      .finally(() => setLoading(false));
  }, [isOpen]);

  const hasProduct = (list) =>
    (list.items ?? []).some((i) => (i.product_id ?? i.productId ?? i) === productId);

  const toggle = async (list) => {
    const id = list._id ?? list.id;
    if (toggling[id]) return;
    setToggling((p) => ({ ...p, [id]: true }));
    try {
      if (hasProduct(list)) {
        await apiClient.delete(`/wishlists/${id}/items/${productId}`);
        setLists((prev) =>
          prev.map((l) =>
            (l._id ?? l.id) === id
              ? { ...l, items: (l.items ?? []).filter((i) => (i.product_id ?? i.productId ?? i) !== productId) }
              : l,
          ),
        );
      } else {
        await apiClient.post(`/wishlists/${id}/items`, { product_id: productId });
        setLists((prev) =>
          prev.map((l) =>
            (l._id ?? l.id) === id ? { ...l, items: [...(l.items ?? []), { product_id: productId }] } : l,
          ),
        );
      }
    } catch {
      toast.error('Error al actualizar la lista');
    } finally {
      setToggling((p) => ({ ...p, [id]: false }));
    }
  };

  const createList = async () => {
    const title = newTitle.trim();
    if (!title || creating) return;
    setCreating(true);
    try {
      const data = await apiClient.post('/wishlists', { title });
      setLists((prev) => [...prev, data]);
      setNewTitle('');
      setShowCreate(false);
      toast.success('Lista creada');
    } catch {
      toast.error('Error al crear la lista');
    } finally {
      setCreating(false);
    }
  };

  const listRows = lists.map((list) => {
    const id = list._id ?? list.id;
    const checked = hasProduct(list);
    const isDefault = (list.title ?? '').toLowerCase() === 'favoritos';
    return (
      <button key={id} onClick={() => toggle(list)}
        className="w-full flex items-center gap-3 py-3 px-2 rounded-xl hover:bg-stone-50 transition-colors">
        <div className={`w-5 h-5 rounded flex items-center justify-center border ${checked ? 'bg-stone-950 border-stone-950' : 'border-stone-300'}`}>
          {checked && <Check size={14} className="text-white" strokeWidth={2.5} />}
        </div>
        {isDefault && <Heart size={16} className="text-stone-950" />}
        <span className="flex-1 text-left text-sm font-medium text-stone-900">{list.title}</span>
        <span className="text-xs text-stone-400">{(list.items ?? []).length}</span>
        {toggling[id] && <Loader2 size={14} className="animate-spin text-stone-400" />}
      </button>
    );
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div className="fixed inset-0 z-50 bg-black/40" variants={overlay}
            initial="hidden" animate="visible" exit="exit" onClick={onClose} />
          <motion.div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl max-h-[75vh] flex flex-col"
            variants={sheet} initial="hidden" animate="visible" exit="exit">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-stone-100">
              <h2 className="text-lg font-semibold text-stone-950">
                {productName ? `Guardar "${productName}"` : 'Guardar en lista'}
              </h2>
              <button onClick={onClose} className="p-1.5 rounded-full hover:bg-stone-100 transition-colors">
                <X size={20} className="text-stone-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1">
              {loading ? (
                <div className="flex items-center justify-center py-10"><Loader2 size={24} className="animate-spin text-stone-400" /></div>
              ) : lists.length === 0 ? (
                <p className="text-sm text-stone-400 text-center py-6">No tienes listas todavia</p>
              ) : listRows}
              {showCreate ? (
                <div className="flex items-center gap-2 pt-2">
                  <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Nombre de la lista"
                    className="flex-1 text-sm border border-stone-200 rounded-xl px-3 py-2 focus:outline-none focus:border-stone-400"
                    maxLength={60} autoFocus onKeyDown={(e) => e.key === 'Enter' && createList()} />
                  <button onClick={createList} disabled={creating || !newTitle.trim()}
                    className="px-3 py-2 bg-stone-950 text-white text-sm rounded-xl disabled:opacity-40">
                    {creating ? <Loader2 size={14} className="animate-spin" /> : 'Crear'}
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowCreate(true)}
                  className="flex items-center gap-2 py-3 px-2 text-sm font-medium text-stone-600 hover:text-stone-950 transition-colors">
                  <Plus size={16} /> Nueva lista
                </button>
              )}
            </div>
            <div className="px-5 pb-5 pt-3 border-t border-stone-100">
              <button onClick={onClose}
                className="w-full py-3 bg-stone-950 text-white text-sm font-semibold rounded-full hover:bg-stone-800 transition-colors">
                Hecho
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
