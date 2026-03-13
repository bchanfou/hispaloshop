import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';
import { API } from '../../utils/api';
import { 
  Search, Star, Eye, EyeOff, Trash2, User, Package
} from 'lucide-react';
import { asLowerText } from '../../utils/safe';



export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const response = await axios.get(`${API}/admin/reviews`, { withCredentials: true });
      setReviews(response.data);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVisibility = async (review) => {
    try {
      const endpoint = review.visible 
        ? `${API}/admin/reviews/${review.review_id}/hide`
        : `${API}/admin/reviews/${review.review_id}/show`;
      
      await axios.put(endpoint, {}, { withCredentials: true });
      toast.success(review.visible ? 'Review hidden' : 'Review visible');
      fetchReviews();
    } catch (error) {
      toast.error('Failed to update review visibility');
    }
  };

  const handleDelete = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review? This action cannot be undone.')) {
      return;
    }
    
    try {
      await axios.delete(`${API}/admin/reviews/${reviewId}`, { withCredentials: true });
      toast.success('Review deleted');
      fetchReviews();
    } catch (error) {
      toast.error('Failed to delete review');
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-reviews">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-semibold text-primary">Reviews</h1>
        <p className="text-text-muted text-sm mt-1">Moderate customer reviews</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-stone-300 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Star className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wider">Total Reviews</p>
              <p className="font-heading text-xl font-semibold text-primary">{reviews.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-stone-300 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <Eye className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wider">Visible</p>
              <p className="font-heading text-xl font-semibold text-primary">
                {reviews.filter(r => r.visible).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-stone-300 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Star className="w-5 h-5 text-amber-600 fill-amber-400" />
            </div>
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wider">Average Rating</p>
              <p className="font-heading text-xl font-semibold text-primary">
                {reviews.length > 0 
                  ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
                  : '—'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <Input
          placeholder="Search reviews..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
          data-testid="search-reviews-input"
        />
      </div>

      {/* Reviews Table */}
      <div className="bg-white border border-stone-300 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-stone-50 border-b border-stone-300">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Product</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">User</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Rating</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Comment</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Date</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Visibility</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {filteredReviews.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-12 text-center text-text-muted">
                  {searchTerm ? 'No reviews found' : 'No reviews yet'}
                </td>
              </tr>
            ) : (
              filteredReviews.map((review) => (
                <tr key={review.review_id} className="hover:bg-stone-50" data-testid={`review-row-${review.review_id}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-text-muted" />
                      <span className="font-body text-sm text-primary truncate max-w-[150px]">
                        {review.product_name || 'Unknown'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-text-muted" />
                      <span className="font-body text-sm text-text-secondary">
                        {review.user_name || 'Anonymous'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span className="font-medium text-primary">{review.rating}</span>
                      <span className="text-xs text-text-muted">/10</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-body text-sm text-text-secondary truncate max-w-[200px]" title={review.comment}>
                      {review.comment}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-body text-sm text-text-muted">
                      {formatDate(review.created_at)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggleVisibility(review)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        review.visible
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-stone-100 text-stone-500 border border-stone-200'
                      }`}
                      data-testid={`toggle-visibility-${review.review_id}`}
                    >
                      {review.visible ? (
                        <>
                          <Eye className="w-3 h-3" /> Visible
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3 h-3" /> Hidden
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(review.review_id)}
                      className="p-2 text-text-muted hover:text-red-500 hover:bg-red-50 rounded"
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
  );
}
