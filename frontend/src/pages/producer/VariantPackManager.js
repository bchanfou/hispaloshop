import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
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
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col" data-testid="variant-pack-manager">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <div>
            <h2 className="font-heading text-xl font-semibold text-primary">
              Manage Variants & Packs
            </h2>
            <p className="text-sm text-text-muted">{product.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Variants List */}
          {variants.length === 0 ? (
            <div className="text-center py-8 bg-stone-50 rounded-lg border border-dashed border-stone-300">
              <Package className="w-8 h-8 text-stone-400 mx-auto mb-2" />
              <p className="text-text-muted mb-4">No variants yet</p>
              <Button 
                onClick={() => setShowAddVariant(true)}
                className="bg-primary hover:bg-primary-hover text-white"
              >
                <Plus className="w-4 h-4 mr-2" /> Add First Variant
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {variants.map((variant) => (
                <div 
                  key={variant.variant_id} 
                  className="border border-stone-200 rounded-lg overflow-hidden"
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
                        <span className="font-medium text-primary">{variant.name}</span>
                        {variant.sku && (
                          <span className="ml-2 text-xs text-text-muted">SKU: {variant.sku}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-muted">
                        {variant.packs?.length || 0} packs
                      </span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDeleteVariant(variant.variant_id); }}
                        className="p-2 text-stone-400 hover:text-red-500 touch-manipulation"
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
                        <p className="text-sm text-text-muted text-center py-2">
                          No packs for this variant
                        </p>
                      )}

                      {/* Add Pack Form */}
                      {addingPack === variant.variant_id ? (
                        <div className="mt-4 p-4 bg-stone-50 rounded-lg space-y-3">
                          <div className="grid grid-cols-4 gap-3">
                            <Input
                              placeholder="Label (e.g., Pack of 6)"
                              value={newPack.label}
                              onChange={(e) => setNewPack({ ...newPack, label: e.target.value })}
                              className="col-span-2"
                            />
                            <Input
                              type="number"
                              placeholder="Units"
                              min="1"
                              value={newPack.units}
                              onChange={(e) => setNewPack({ ...newPack, units: e.target.value })}
                            />
                            <Input
                              type="number"
                              placeholder="Price"
                              step="0.01"
                              min="0"
                              value={newPack.price}
                              onChange={(e) => setNewPack({ ...newPack, price: e.target.value })}
                            />
                          </div>
                          <div className="flex gap-3 items-center">
                            <Input
                              type="number"
                              placeholder="Stock"
                              min="0"
                              value={newPack.stock}
                              onChange={(e) => setNewPack({ ...newPack, stock: e.target.value })}
                              className="w-32"
                            />
                            <Button 
                              onClick={() => handleAddPack(variant.variant_id)}
                              disabled={saving}
                              className="bg-primary hover:bg-primary-hover text-white"
                            >
                              {saving ? 'Adding...' : 'Add Pack'}
                            </Button>
                            <Button 
                              variant="ghost"
                              onClick={() => {
                                setAddingPack(null);
                                setNewPack({ label: '', units: 1, price: '', stock: '' });
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAddingPack(variant.variant_id)}
                          className="w-full py-2 text-sm text-text-muted border border-dashed border-stone-300 rounded-lg hover:border-stone-400 hover:text-text-secondary"
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
            <div className="p-4 bg-stone-50 rounded-lg border border-stone-200 space-y-3">
              <h3 className="font-medium text-primary">New Variant</h3>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Variant name (e.g., Tomato, 500g)"
                  value={newVariantName}
                  onChange={(e) => setNewVariantName(e.target.value)}
                />
                <Input
                  placeholder="SKU (optional)"
                  value={newVariantSku}
                  onChange={(e) => setNewVariantSku(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <Button 
                  onClick={handleAddVariant}
                  disabled={saving}
                  className="bg-primary hover:bg-primary-hover text-white"
                >
                  {saving ? 'Creating...' : 'Create Variant'}
                </Button>
                <Button 
                  variant="ghost"
                  onClick={() => {
                    setShowAddVariant(false);
                    setNewVariantName('');
                    setNewVariantSku('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Add Variant Button (when variants exist) */}
          {variants.length > 0 && !showAddVariant && (
            <button
              onClick={() => setShowAddVariant(true)}
              className="w-full py-3 text-sm text-text-muted border border-dashed border-stone-300 rounded-lg hover:border-stone-400 hover:text-text-secondary"
            >
              <Plus className="w-4 h-4 inline mr-1" /> Add Another Variant
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-200">
          <Button onClick={onClose} className="w-full bg-primary hover:bg-primary-hover text-white">
            Done
          </Button>
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
      price: parseFloat(editData.price),
      stock: parseInt(editData.stock)
    });
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2 p-2 bg-stone-50 rounded-lg" data-testid={`pack-edit-${pack.pack_id}`}>
        <Input
          value={editData.label}
          onChange={(e) => setEditData({ ...editData, label: e.target.value })}
          className="flex-1 h-8 text-sm"
        />
        <Input
          type="number"
          value={editData.units}
          onChange={(e) => setEditData({ ...editData, units: e.target.value })}
          className="w-16 h-8 text-sm"
        />
        <Input
          type="number"
          step="0.01"
          value={editData.price}
          onChange={(e) => setEditData({ ...editData, price: e.target.value })}
          className="w-24 h-8 text-sm"
        />
        <Input
          type="number"
          value={editData.stock}
          onChange={(e) => setEditData({ ...editData, stock: e.target.value })}
          className="w-20 h-8 text-sm"
        />
        <button onClick={handleSave} className="p-1 text-green-600 hover:bg-green-50 rounded">
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
      className="flex items-center justify-between p-2 bg-white border border-stone-200 rounded-lg"
      data-testid={`pack-${pack.pack_id}`}
    >
      <div className="flex items-center gap-4">
        <span className="font-medium text-sm text-primary">{pack.label}</span>
        <span className="text-xs text-text-muted">{pack.units} unit(s)</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="font-medium text-primary">${pack.price.toFixed(2)}</span>
        <span className={`text-xs px-2 py-1 rounded-full ${
          pack.stock <= 0 
            ? 'bg-red-50 text-red-600' 
            : pack.stock <= 5 
            ? 'bg-amber-50 text-amber-600'
            : 'bg-green-50 text-green-600'
        }`}>
          {pack.stock} in stock
        </span>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setEditing(true)}
            className="p-1 text-stone-400 hover:text-primary hover:bg-stone-100 rounded"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button 
            onClick={() => onDelete(pack.pack_id)}
            className="p-1 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
