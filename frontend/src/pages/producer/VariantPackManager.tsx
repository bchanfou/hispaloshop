// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, X, Package, Edit2, Save, ChevronDown, ChevronRight } from 'lucide-react';
import apiClient from '../../services/api/client';



export default function VariantPackManager({ product, onClose, onUpdate }) {
  const [variants, setVariants] = useState(product.variants || []);
  const [expandedVariant, setExpandedVariant] = useState(null);
  const [newVariantName, setNewVariantName] = useState('');
  const [newVariantSku, setNewVariantSku] = useState('');
  const [showAddVariant, setShowAddVariant] = useState(false);
  const [addingPack, setAddingPack] = useState(null); // variant_id when adding pack
  const [newPack, setNewPack] = useState({ label: '', units: 1, price: '', stock: '' });
  const [saving, setSaving] = useState(false);

  // Auto-expand first variant
  useEffect(() => {
    if (variants.length > 0 && !expandedVariant) {
      setExpandedVariant(variants[0].variant_id);
    }
  }, [variants]);

  const handleAddVariant = async () => {
    if (!newVariantName.trim()) {
      toast.error('Variant name is required');
      return;
    }

    setSaving(true);
    try {
      const response = await apiClient.post(
        `/producer/products/${product.product_id}/variants`,
        { name: newVariantName.trim(), sku: newVariantSku.trim() || null }
      );
      setVariants([...variants, response]);
      setNewVariantName('');
      setNewVariantSku('');
      setShowAddVariant(false);
      setExpandedVariant(response.variant_id);
      toast.success('Variant created');
      onUpdate?.();
    } catch (error) {
      toast.error(error.message || 'Failed to create variant');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVariant = async (variantId) => {
    if (!window.confirm('Delete this variant and all its packs?')) return;

    try {
      await apiClient.delete(
        `/producer/products/${product.product_id}/variants/${variantId}`
      );
      setVariants(variants.filter(v => v.variant_id !== variantId));
      if (expandedVariant === variantId) {
        setExpandedVariant(variants.length > 1 ? variants[0].variant_id : null);
      }
      toast.success('Variant deleted');
      onUpdate?.();
    } catch (error) {
      toast.error(error.message || 'Failed to delete variant');
    }
  };

  const handleAddPack = async (variantId) => {
    if (!newPack.label.trim() || !newPack.price || !newPack.stock) {
      toast.error('Please fill all pack fields');
      return;
    }

    setSaving(true);
    try {
      const response = await apiClient.post(
        `/producer/products/${product.product_id}/packs`,
        {
          variant_id: variantId,
          label: newPack.label.trim(),
          units: parseInt(newPack.units) || 1,
          price: parseFloat(newPack.price),
          stock: parseInt(newPack.stock)
        }
      );

      // Update local state
      setVariants(variants.map(v => {
        if (v.variant_id === variantId) {
          return { ...v, packs: [...(v.packs || []), response] };
        }
        return v;
      }));

      setNewPack({ label: '', units: 1, price: '', stock: '' });
      setAddingPack(null);
      toast.success('Pack created');
      onUpdate?.();
    } catch (error) {
      toast.error(error.message || 'Failed to create pack');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePack = async (packId, updates) => {
    try {
      await apiClient.put(
        `/producer/products/${product.product_id}/packs/${packId}`,
        updates
      );

      // Update local state
      setVariants(variants.map(v => ({
        ...v,
        packs: v.packs?.map(p =>
          p.pack_id === packId ? { ...p, ...updates } : p
        )
      })));

      toast.success('Pack updated');
      onUpdate?.();
    } catch (error) {
      toast.error(error.message || 'Failed to update pack');
    }
  };

  const handleDeletePack = async (packId) => {
    if (!window.confirm('Delete this pack?')) return;

    try {
      await apiClient.delete(
        `/producer/products/${product.product_id}/packs/${packId}`
      );

      // Update local state
      setVariants(variants.map(v => ({
        ...v,
        packs: v.packs?.filter(p => p.pack_id !== packId)
      })));

      toast.success('Pack deleted');
      onUpdate?.();
    } catch (error) {
      toast.error(error.message || 'Failed to delete pack');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col" data-testid="variant-pack-manager">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-stone-950">
              Manage Variants &amp; Packs
            </h2>
            <p className="text-sm text-stone-500">{product.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-2xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Variants List */}
          {variants.length === 0 ? (
            <div className="text-center py-8 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
              <Package className="w-8 h-8 text-stone-400 mx-auto mb-2" />
              <p className="text-stone-500 mb-4">No variants yet</p>
              <button
                onClick={() => setShowAddVariant(true)}
                className="px-4 py-2 bg-stone-950 hover:bg-stone-800 disabled:opacity-50 text-white rounded-2xl transition-colors"
              >
                <Plus className="w-4 h-4 mr-2 inline" /> Add First Variant
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {variants.map((variant) => (
                <div
                  key={variant.variant_id}
                  className="border border-stone-200 rounded-2xl overflow-hidden"
                  data-testid={`variant-${variant.variant_id}`}
                >
                  {/* Variant Header */}
                  <button
                    type="button"
                    className="w-full px-4 py-3 bg-stone-50 flex items-center justify-between touch-manipulation"
                    onClick={() => setExpandedVariant(
                      expandedVariant === variant.variant_id ? null : variant.variant_id
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {expandedVariant === variant.variant_id ? (
                        <ChevronDown className="w-4 h-4 text-stone-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-stone-400" />
                      )}
                      <div className="text-left">
                        <span className="font-medium text-stone-950">{variant.name}</span>
                        {variant.sku && (
                          <span className="ml-2 text-xs text-stone-500">SKU: {variant.sku}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-stone-500">
                        {variant.packs?.length || 0} packs
                      </span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDeleteVariant(variant.variant_id); }}
                        className="p-2 text-stone-400 hover:text-stone-700 touch-manipulation"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </button>

                  {/* Variant Packs */}
                  {expandedVariant === variant.variant_id && (
                    <div className="p-4 space-y-3">
                      {/* Packs List */}
                      {variant.packs?.length > 0 ? (
                        <div className="space-y-2">
                          {variant.packs.map((pack) => (
                            <PackRow
                              key={pack.pack_id}
                              pack={pack}
                              onUpdate={handleUpdatePack}
                              onDelete={handleDeletePack}
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-stone-500 text-center py-2">
                          No packs for this variant
                        </p>
                      )}

                      {/* Add Pack Form */}
                      {addingPack === variant.variant_id ? (
                        <div className="mt-4 p-4 bg-stone-50 rounded-2xl space-y-3">
                          <div className="grid grid-cols-4 gap-3">
                            <input
                              placeholder="Label (e.g., Pack of 6)"
                              value={newPack.label}
                              onChange={(e) => setNewPack({ ...newPack, label: e.target.value })}
                              className="col-span-2 px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 focus:outline-none focus:border-stone-950"
                            />
                            <input
                              type="number"
                              placeholder="Units"
                              min="1"
                              value={newPack.units}
                              onChange={(e) => setNewPack({ ...newPack, units: e.target.value })}
                              className="px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 focus:outline-none focus:border-stone-950"
                            />
                            <input
                              type="number"
                              placeholder="Price"
                              step="0.01"
                              min="0"
                              value={newPack.price}
                              onChange={(e) => setNewPack({ ...newPack, price: e.target.value })}
                              className="px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 focus:outline-none focus:border-stone-950"
                            />
                          </div>
                          <div className="flex gap-3 items-center">
                            <input
                              type="number"
                              placeholder="Stock"
                              min="0"
                              value={newPack.stock}
                              onChange={(e) => setNewPack({ ...newPack, stock: e.target.value })}
                              className="w-32 px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 focus:outline-none focus:border-stone-950"
                            />
                            <button
                              onClick={() => handleAddPack(variant.variant_id)}
                              disabled={saving}
                              className="px-4 py-2 bg-stone-950 hover:bg-stone-800 disabled:opacity-50 text-white rounded-2xl transition-colors"
                            >
                              {saving ? 'Adding...' : 'Add Pack'}
                            </button>
                            <button
                              onClick={() => {
                                setAddingPack(null);
                                setNewPack({ label: '', units: 1, price: '', stock: '' });
                              }}
                              className="px-4 py-2 border border-stone-200 text-stone-600 rounded-2xl hover:bg-stone-50 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAddingPack(variant.variant_id)}
                          className="w-full py-2 text-sm text-stone-500 border border-dashed border-stone-200 rounded-2xl hover:border-stone-400 hover:text-stone-600"
                        >
                          <Plus className="w-4 h-4 inline mr-1" /> Add Pack
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add Variant Form */}
          {showAddVariant && (
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
              <h3 className="font-medium text-stone-950">New Variant</h3>
              <div className="grid grid-cols-2 gap-3">
                <input
                  placeholder="Variant name (e.g., Tomato, 500g)"
                  value={newVariantName}
                  onChange={(e) => setNewVariantName(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 focus:outline-none focus:border-stone-950"
                />
                <input
                  placeholder="SKU (optional)"
                  value={newVariantSku}
                  onChange={(e) => setNewVariantSku(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 focus:outline-none focus:border-stone-950"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleAddVariant}
                  disabled={saving}
                  className="px-4 py-2 bg-stone-950 hover:bg-stone-800 disabled:opacity-50 text-white rounded-2xl transition-colors"
                >
                  {saving ? 'Creating...' : 'Create Variant'}
                </button>
                <button
                  onClick={() => {
                    setShowAddVariant(false);
                    setNewVariantName('');
                    setNewVariantSku('');
                  }}
                  className="px-4 py-2 border border-stone-200 text-stone-600 rounded-2xl hover:bg-stone-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Add Variant Button (when variants exist) */}
          {variants.length > 0 && !showAddVariant && (
            <button
              onClick={() => setShowAddVariant(true)}
              className="w-full py-3 text-sm text-stone-500 border border-dashed border-stone-200 rounded-2xl hover:border-stone-400 hover:text-stone-600"
            >
              <Plus className="w-4 h-4 inline mr-1" /> Add Another Variant
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-stone-950 hover:bg-stone-800 disabled:opacity-50 text-white rounded-2xl transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// Pack Row Component with inline editing
function PackRow({ pack, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    label: pack.label,
    units: pack.units,
    price: pack.price,
    stock: pack.stock
  });

  const handleSave = () => {
    onUpdate(pack.pack_id, {
      label: editData.label,
      units: parseInt(editData.units),
      price: parseFloat(editData.price) || 0,
      stock: parseInt(editData.stock) || 0
    });
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2 p-2 bg-stone-50 rounded-2xl" data-testid={`pack-edit-${pack.pack_id}`}>
        <input
          value={editData.label}
          onChange={(e) => setEditData({ ...editData, label: e.target.value })}
          className="flex-1 px-2 py-1 border border-stone-200 rounded-2xl text-stone-950 text-sm focus:outline-none focus:border-stone-950"
        />
        <input
          type="number"
          value={editData.units}
          onChange={(e) => setEditData({ ...editData, units: e.target.value })}
          className="w-16 px-2 py-1 border border-stone-200 rounded-2xl text-stone-950 text-sm focus:outline-none focus:border-stone-950"
        />
        <input
          type="number"
          step="0.01"
          value={editData.price}
          onChange={(e) => setEditData({ ...editData, price: e.target.value })}
          className="w-24 px-2 py-1 border border-stone-200 rounded-2xl text-stone-950 text-sm focus:outline-none focus:border-stone-950"
        />
        <input
          type="number"
          value={editData.stock}
          onChange={(e) => setEditData({ ...editData, stock: e.target.value })}
          className="w-20 px-2 py-1 border border-stone-200 rounded-2xl text-stone-950 text-sm focus:outline-none focus:border-stone-950"
        />
        <button onClick={handleSave} className="p-1 text-stone-950 hover:bg-stone-100 rounded">
          <Save className="w-4 h-4" />
        </button>
        <button onClick={() => setEditing(false)} className="p-1 text-stone-400 hover:bg-stone-100 rounded">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-between p-2 bg-white border border-stone-200 rounded-2xl"
      data-testid={`pack-${pack.pack_id}`}
    >
      <div className="flex items-center gap-4">
        <span className="font-medium text-sm text-stone-950">{pack.label}</span>
        <span className="text-xs text-stone-500">{pack.units} unit(s)</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="font-medium text-stone-950">${(Number(pack.price) || 0).toFixed(2)}</span>
        <span className="text-xs px-2 py-1 rounded-full bg-stone-100 text-stone-700">
          {pack.stock} in stock
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setEditing(true)}
            className="p-1 text-stone-400 hover:text-stone-950 hover:bg-stone-100 rounded"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(pack.pack_id)}
            className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
