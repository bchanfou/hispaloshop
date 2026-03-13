import React, { useState, useEffect } from 'react';
import apiClient from '../../services/api/client';
import { toast } from 'sonner';
import {
  Plus, Edit2, Trash2, Search, FolderOpen, Check, X, Loader2, Tag
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { asLowerText, asText } from '../../utils/safe';

// ─── Inline edit/create form ────────────────────────────────────────────────
function CategoryForm({ initial = {}, onSave, onCancel, saving }) {
  const [name, setName] = useState(initial.name || '');
  const [description, setDescription] = useState(initial.description || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), description: description.trim() });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nombre de la categoría"
        className="flex-1"
        autoFocus
        required
      />
      <Input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Descripción (opcional)"
        className="flex-1"
      />
      <div className="flex gap-2 shrink-0">
        <Button type="submit" disabled={saving || !name.trim()} className="bg-accent">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          <span className="ml-1">{initial.category_id ? 'Guardar' : 'Crear'}</span>
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </div>
    </form>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/categories');
      setCategories(data || []);
    } catch {
      toast.error('Error al cargar las categorías');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data) => {
    setSaving(true);
    try {
      await apiClient.post('/categories', data);
      toast.success('Categoría creada');
      setShowCreateForm(false);
      fetchCategories();
    } catch (e) {
      toast.error(e.message || 'Error al crear la categoría');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (categoryId, data) => {
    setSaving(true);
    try {
      await apiClient.put(`/categories/${categoryId}`, data);
      toast.success('Categoría actualizada');
      setEditingId(null);
      fetchCategories();
    } catch (e) {
      toast.error(e.message || 'Error al actualizar la categoría');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (categoryId, name) => {
    if (!window.confirm(`¿Eliminar la categoría "${name}"? Los productos asociados quedarán sin categoría.`)) return;
    try {
      await apiClient.delete(`/categories/${categoryId}`);
      toast.success('Categoría eliminada');
      fetchCategories();
    } catch {
      toast.error('Error al eliminar la categoría');
    }
  };

  const searchNeedle = asLowerText(searchTerm);
  const filtered = categories.filter(c =>
    asLowerText(c.name).includes(searchNeedle) ||
    asLowerText(c.description).includes(searchNeedle)
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-heading text-3xl font-bold text-text-primary mb-1 flex items-center gap-2">
            <FolderOpen className="w-7 h-7 text-accent" />
            Categorías
          </h1>
          <p className="text-text-muted">
            {categories.length} categoría{categories.length !== 1 ? 's' : ''} en total
          </p>
        </div>
        {!showCreateForm && (
          <Button onClick={() => { setShowCreateForm(true); setEditingId(null); }} className="bg-accent">
            <Plus className="w-4 h-4 mr-2" />
            Nueva categoría
          </Button>
        )}
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-white rounded-xl border border-stone-200 p-4 mb-6">
          <p className="text-sm font-medium text-text-primary mb-3">Nueva categoría</p>
          <CategoryForm
            onSave={handleCreate}
            onCancel={() => setShowCreateForm(false)}
            saving={saving}
          />
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <Input
          placeholder="Buscar categorías..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-accent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Tag className="w-10 h-10 text-text-muted mx-auto mb-3" />
            <p className="text-text-muted">
              {searchTerm ? 'No se encontraron categorías' : 'Aún no hay categorías. Crea la primera.'}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-text-secondary">Nombre</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-text-secondary hidden sm:table-cell">Descripción</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-text-secondary hidden md:table-cell">Slug</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-text-secondary">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map((cat) => (
                <tr key={cat.category_id} className="hover:bg-stone-50">
                  {editingId === cat.category_id ? (
                    <td colSpan={4} className="px-6 py-3">
                      <CategoryForm
                        initial={cat}
                        onSave={(data) => handleUpdate(cat.category_id, data)}
                        onCancel={() => setEditingId(null)}
                        saving={saving}
                      />
                    </td>
                  ) : (
                    <>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                            <Tag className="w-4 h-4 text-accent" />
                          </div>
                          <span className="font-medium text-text-primary">{cat.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden sm:table-cell">
                        <span className="text-sm text-text-muted line-clamp-1">
                          {cat.description || <span className="italic">Sin descripción</span>}
                        </span>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <code className="text-xs bg-stone-100 px-2 py-0.5 rounded text-text-secondary">
                          {cat.slug || asLowerText(asText(cat.name)).replace(/\s+/g, '-')}
                        </code>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setEditingId(cat.category_id); setShowCreateForm(false); }}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-300 text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(cat.category_id, cat.name)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
