// @ts-nocheck
import React, { useState, useEffect } from 'react';
import apiClient from '../../services/api/client';
import { toast } from 'sonner';
import {
  Search, Star, Eye, EyeOff, Trash2, User, Package
} from 'lucide-react';
import { asLowerText } from '../../utils/safe';



export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionBusy, setActionBusy] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const data = await apiClient.get('/admin/reviews');
      setReviews(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Error al cargar reseñas');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVisibility = async (review) => {
    if (actionBusy) return;
    setActionBusy(true);
    try {
      const endpoint = review.visible
        ? `/admin/reviews/${review.review_id}/hide`
        : `/admin/reviews/${review.review_id}/show`;

      await apiClient.put(endpoint, {});
      toast.success(review.visible ? 'Reseña oculta' : 'Reseña visible');
      fetchReviews();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Error al actualizar visibilidad');
    } finally {
      setActionBusy(false);
    }
  };

  const handleDelete = async (reviewId) => {
    if (actionBusy) return;
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta reseña? Esta acción no se puede deshacer.')) {
      return;
    }

    setActionBusy(true);
    try {
      await apiClient.delete(`/admin/reviews/${reviewId}`);
      toast.success('Reseña eliminada');
      fetchReviews();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Error al eliminar reseña');
    } finally {
      setActionBusy(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const searchNeedle = asLowerText(searchTerm);
  const filteredReviews = reviews.filter(review =>
    asLowerText(review.user_name).includes(searchNeedle) ||
    asLowerText(review.product_name).includes(searchNeedle) ||
    asLowerText(review.comment).includes(searchNeedle)
  );

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Cargando reviews">
        <div className="space-y-2">
          <div className="h-6 w-32 animate-pulse rounded-full bg-stone-100" />
          <div className="h-3.5 w-52 animate-pulse rounded-full bg-stone-100" />
        </div>
        <div className="rounded-2xl border border-stone-100 bg-white p-4 space-y-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-10 w-10 animate-pulse rounded-full bg-stone-100" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-1/3 animate-pulse rounded-full bg-stone-100" />
                <div className="h-3 w-2/3 animate-pulse rounded-full bg-stone-100" />
              </div>
              <div className="h-6 w-16 animate-pulse rounded-full bg-stone-100" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-reviews">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-stone-950">Reseñas</h1>
        <p className="text-stone-500 text-sm mt-1">Moderar reseñas de clientes</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-stone-200 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-stone-100 rounded-2xl">
              <Star className="w-5 h-5 text-stone-700" />
            </div>
            <div>
              <p className="text-xs text-stone-500 uppercase tracking-wider">Total de reseñas</p>
              <p className="text-xl font-semibold text-stone-950">{reviews.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-stone-100 rounded-2xl">
              <Eye className="w-5 h-5 text-stone-700" />
            </div>
            <div>
              <p className="text-xs text-stone-500 uppercase tracking-wider">Visible</p>
              <p className="text-xl font-semibold text-stone-950">
                {reviews.filter(r => r.visible).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-stone-100 rounded-2xl">
              <Star className="w-5 h-5 text-stone-500 fill-stone-400" />
            </div>
            <div>
              <p className="text-xs text-stone-500 uppercase tracking-wider">Calificación promedio</p>
              <p className="text-xl font-semibold text-stone-950">
                {(() => {
                  if (reviews.length === 0) return '—';
                  const avg = reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length;
                  return isNaN(avg) ? '—' : avg.toFixed(1);
                })()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
        <input
          placeholder="Buscar reseñas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-3 py-2 border border-stone-200 rounded-2xl text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-950"
          data-testid="search-reviews-input"
        />
      </div>

      {/* Reviews Table */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto -mx-4 px-4">
        <table className="w-full min-w-[800px]">
          <thead className="bg-stone-50 border-b border-stone-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider">Producto</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider">Usuario</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider">Calificación</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider">Comentario</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider">Fecha</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider">Visibilidad</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {filteredReviews.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-12 text-center text-stone-500">
                  {searchTerm ? 'No se encontraron reseñas' : 'Aún no hay reseñas'}
                </td>
              </tr>
            ) : (
              filteredReviews.map((review) => (
                <tr key={review.review_id} className="hover:bg-stone-50" data-testid={`review-row-${review.review_id}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-stone-500" />
                      <span className="text-sm text-stone-950 truncate max-w-[150px]">
                        {review.product_name || 'Unknown'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-stone-500" />
                      <span className="text-sm text-stone-600">
                        {review.user_name || 'Anonymous'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-stone-400 text-stone-400" />
                      <span className="font-medium text-stone-950">{review.rating}</span>
                      <span className="text-xs text-stone-500">/10</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-stone-600 truncate max-w-[200px]" title={review.comment}>
                      {review.comment}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-stone-500">
                      {formatDate(review.created_at)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggleVisibility(review)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        review.visible
                          ? 'bg-stone-950 text-white'
                          : 'border border-stone-200 text-stone-400 bg-white'
                      }`}
                      data-testid={`toggle-visibility-${review.review_id}`}
                    >
                      {review.visible ? (
                        <>
                          <Eye className="w-3 h-3" /> Visible
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3 h-3" /> Oculta
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(review.review_id)}
                      className="p-2 text-stone-500 hover:text-stone-700 hover:bg-stone-50 rounded-2xl transition-colors"
                      data-testid={`delete-review-${review.review_id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
