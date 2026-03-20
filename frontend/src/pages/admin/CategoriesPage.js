import React, { useState, useEffect } from 'react';
import apiClient from '../../services/api/client';
import { toast } from 'sonner';
import {
  Plus, Edit2, Trash2, Search, FolderOpen, Check, X, Loader2, Tag
} from 'lucide-react';
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
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nombre de la categoría"
        className="flex-1 w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 focus:outline-none focus:border-stone-950"
        autoFocus
        required
      />
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Descripción (opcional)"
        className="flex-1 w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 focus:outline-none focus:border-stone-950"
      />
      <div className="flex gap-2 shrink-0">
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="inline-flex items-center px-4 py-2 bg-stone-950 hover:bg-stone-800 disabled:opacity-50 text-white rounded-2xl transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          <span className="ml-1">{initial.category_id ? 'Guardar' : 'Crear'}</span>
        </button>
        <button
          type="button"
          className="px-4 py-2 border border-stone-200 text-stone-600 rounded-2xl hover:bg-stone-50 transition-colors"
          onClick={onCancel}
        >
          <X className="w-4 h-4" />
        </button>
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
          <h1 className="text-3xl font-bold text-stone-950 mb-1 flex items-center gap-2">
            <FolderOpen className="w-7 h-7 text-stone-950" />
            Categorías
          </h1>
          <p className="text-stone-500">
            {categories.length} categoría{categories.length !== 1 ? 's' : ''} en total
          </p>
        </div>
        {!showCreateForm && (
          <button
            onClick={() => { setShowCreateForm(true); setEditingId(null); }}
            className="inline-flex items-center px-4 py-2 bg-stone-950 hover:bg-stone-800 disabled:opacity-50 text-white rounded-2xl transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva categoría
          </button>
        )}
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-white rounded-2xl border border-stone-200 p-4 mb-6">
          <p className="text-sm font-medium text-stone-950 mb-3">Nueva categoría</p>
          <CategoryForm
            onSave={handleCreate}
            onCancel={() => setShowCreateForm(false)}
            saving={saving}
          />
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
        <input
          placeholder="Buscar categorías..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 focus:outline-none focus:border-stone-950 pl-10"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-stone-950" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Tag className="w-10 h-10 text-stone-500 mx-auto mb-3" />
            <p className="text-stone-500">
              {searchTerm ? 'No se encontraron categorías' : 'Aún no hay categorías. Crea la primera.'}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-stone-600">Nombre</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-stone-600 hidden sm:table-cell">Descripción</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-stone-600 hidden md:table-cell">Slug</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-stone-600">Acciones</th>
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
                          <div className="w-8 h-8 rounded-2xl bg-stone-100 flex items-center justify-center shrink-0">
                            <Tag className="w-4 h-4 text-stone-950" />
                          </div>
                          <span className="font-medium text-stone-950">{cat.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden sm:table-cell">
                        <span className="text-sm text-stone-500 line-clamp-1">
                          {cat.description || <span className="italic">Sin descripción</span>}
                        </span>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <code className="text-xs bg-stone-100 px-2 py-0.5 rounded text-stone-600">
                          {cat.slug || asLowerText(asText(cat.name)).replace(/\s+/g, '-')}
                        </code>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            className="px-4 py-2 border border-stone-200 text-stone-600 rounded-2xl hover:bg-stone-50 transition-colors"
                            onClick={() => { setEditingId(cat.category_id); setShowCreateForm(false); }}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            className="px-4 py-2 border border-stone-200 text-stone-600 rounded-2xl hover:bg-stone-50 transition-colors"
                            onClick={() => handleDelete(cat.category_id, cat.name)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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
