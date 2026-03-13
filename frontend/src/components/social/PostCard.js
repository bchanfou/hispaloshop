import { useState } from 'react';
import { Heart, MessageCircle, Share2, Bookmark, ShoppingBag } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../services/api/client';
import { toast } from 'sonner';

export function PostCard({ post }) {
  const [showQuickBuy, setShowQuickBuy] = useState(null);
  const [localLiked, setLocalLiked] = useState(post.user_has_liked);
  const [localSaved, setLocalSaved] = useState(post.user_has_saved);
  const [localLikesCount, setLocalLikesCount] = useState(post.likes_count || 0);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const likeMutation = useMutation({
    mutationFn: () => apiClient.post(`/posts/${post.id || post._id}/like`),
    onSuccess: (data) => {
      if (data.action === 'liked') {
        setLocalLiked(true);
        setLocalLikesCount(prev => prev + 1);
      } else {
        setLocalLiked(false);
        setLocalLikesCount(prev => prev - 1);
      }
    },
    onError: () => {
      toast.error('Error al dar like');
    }
  });

  const saveMutation = useMutation({
    mutationFn: () => apiClient.post(`/posts/${post.id || post._id}/save`),
    onSuccess: (data) => {
      if (data.action === 'saved') {
        setLocalSaved(true);
        toast.success('Guardado en coleccion');
      } else {
        setLocalSaved(false);
      }
    }
  });

  const handleLike = (e) => {
    e.preventDefault();
    likeMutation.mutate();
  };

  const handleQuickBuy = async (product) => {
    try {
      await apiClient.post('/cart/quick-buy', {
        product_id: product.product_id,
        quantity: 1,
        affiliate_code: product.affiliate_code,
        post_id: post.id || post._id
      });
      navigate('/cart');
    } catch (error) {
      toast.error('Error al añadir al carrito');
    }
  };

  const handleShare = async () => {
    const postId = post.id || post._id;
    const shareUrl = `${window.location.origin}/posts/${postId}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: post.author_name || 'Publicacion',
          text: post.content?.slice(0, 120) || 'Mira esta publicacion en Hispaloshop',
          url: shareUrl,
        });
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      toast.success('Enlace copiado');
    } catch {
      toast.error('No se pudo compartir esta publicacion');
    }
  };

  const media = post.media?.[0];
  const hasProducts = post.tagged_products?.length > 0;

  return (
    <div className="bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition">
      {/* Header */}
      <div className="p-4 flex items-center gap-3">
        <img 
          src={post.author_avatar || '/default-avatar.png'} 
          alt={post.author_name}
          className="w-10 h-10 rounded-full object-cover"
        />
        <div className="flex-1 min-w-0">
          <Link 
            to={`/profile/${post.author_id}`}
            className="font-semibold hover:underline truncate block"
          >
            {post.author_name}
          </Link>
          <p className="text-xs text-gray-500 capitalize">{post.author_type}</p>
        </div>
        {post.score_reason && (
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
            {post.score_reason}
          </span>
        )}
      </div>

      {/* Media */}
      <div className="relative bg-gray-100">
        {media?.type === 'video' ? (
          <video 
            src={media.url} 
            poster={media.thumbnail_url}
            className="w-full aspect-square object-cover"
            controls
          />
        ) : (
          <img 
            src={media?.url || '/placeholder-post.png'}
            alt="Post"
            className="w-full aspect-square object-cover"
          />
        )}
        
        {/* Tags de productos */}
        {post.tagged_products?.map((tp, idx) => (
          tp.position && (
            <button
              key={idx}
              onClick={() => setShowQuickBuy(showQuickBuy === tp.product_id ? null : tp.product_id)}
              className="absolute w-8 h-8 bg-white/90 backdrop-blur rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition z-10"
              style={{ left: `${tp.position.x}%`, top: `${tp.position.y}%`, transform: 'translate(-50%, -50%)' }}
            >
              <ShoppingBag className="w-4 h-4 text-purple-600" />
            </button>
          )
        ))}
      </div>

      {/* Acciones */}
      <div className="p-4 flex items-center gap-4">
        <button 
          onClick={handleLike}
          disabled={likeMutation.isLoading}
          className={`flex items-center gap-1 transition ${localLiked ? 'text-red-500' : 'text-gray-700 hover:text-red-500'}`}
        >
          <Heart className={`w-6 h-6 ${localLiked ? 'fill-current' : ''}`} />
          <span className="font-medium">{localLikesCount}</span>
        </button>
        
        <Link 
          to={`/posts/${post.id || post._id}`} 
          className="flex items-center gap-1 text-gray-700 hover:text-blue-500 transition"
        >
          <MessageCircle className="w-6 h-6" />
          <span className="font-medium">{post.comments_count || 0}</span>
        </Link>
        
        <button onClick={handleShare} className="flex items-center gap-1 text-gray-700 hover:text-green-500 transition" aria-label="Compartir publicacion">
          <Share2 className="w-6 h-6" />
        </button>
        
        <button 
          onClick={() => saveMutation.mutate()}
          className={`ml-auto transition ${localSaved ? 'text-yellow-500' : 'text-gray-700 hover:text-yellow-500'}`}
        >
          <Bookmark className={`w-6 h-6 ${localSaved ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Contenido */}
      <div className="px-4 pb-3">
        <p className="text-sm">
          <Link to={`/profile/${post.author_id}`} className="font-semibold mr-2 hover:underline">
            {post.author_name}
          </Link>
          {post.content}
        </p>
        {post.hashtags?.length > 0 && (
          <p className="text-sm text-purple-600 mt-2">
            {post.hashtags.map(h => `#${h}`).join(' ')}
          </p>
        )}
      </div>

      {/* Productos taggeados */}
      {hasProducts && (
        <div className="px-4 pb-4">
          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
            Productos en este post
          </p>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {post.tagged_products.map((tp) => (
              <div key={tp.product_id} className="flex-shrink-0 w-36 relative">
                <div 
                  className="border rounded-lg overflow-hidden bg-white cursor-pointer hover:shadow-md transition"
                  onClick={() => setShowQuickBuy(showQuickBuy === tp.product_id ? null : tp.product_id)}
                >
                  <div className="relative">
                    <img 
                      src={tp.product_image || '/placeholder-product.png'} 
                      alt={tp.product_name}
                      className="w-full h-28 object-cover"
                    />
                    {tp.affiliate_code && (
                      <span className="absolute top-1 right-1 bg-purple-600 text-white text-[10px] px-1.5 py-0.5 rounded">
                        Afiliado
                      </span>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-medium truncate">{tp.product_name}</p>
                    <p className="text-base font-bold text-purple-700">
                      €{(tp.product_price_cents / 100).toFixed(2)}
                    </p>
                  </div>
                </div>
                
                {/* Quick Buy Popover */}
                {showQuickBuy === tp.product_id && (
                  <div className="absolute z-50 bottom-full left-0 mb-2 w-40 bg-white rounded-lg shadow-xl border p-3">
                    <p className="text-xs font-medium mb-2 truncate">{tp.product_name}</p>
                    {tp.caption && (
                      <p className="text-xs text-gray-500 mb-2 italic">"{tp.caption}"</p>
                    )}
                    <button
                      onClick={() => handleQuickBuy(tp)}
                      className="w-full bg-purple-600 text-white text-xs py-2 rounded-lg hover:bg-purple-700 transition"
                    >
                      Comprar Ahora
                    </button>
                    <button
                      onClick={() => setShowQuickBuy(null)}
                      className="w-full mt-1 text-gray-500 text-xs py-1 hover:text-gray-700"
                    >
                      Cerrar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
