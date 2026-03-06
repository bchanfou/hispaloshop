import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { HelpCircle, Users, Store, Globe, ShoppingBag, ChevronRight, Heart, MessageCircle, Share2, Bookmark } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { API } from '../utils/api';

import SEO from '../components/SEO';
import { CATEGORY_CONFIG } from '../config/categories';

// Botones informativos desplazables
const INFO_BUTTONS = [
  { id: 'about', label: '¿Qué es Hispaloshop?', icon: HelpCircle, href: '/about', color: 'bg-emerald-100 text-emerald-700' },
  { id: 'influencer', label: 'Ser Influencer', icon: Users, href: '/influencer', color: 'bg-violet-100 text-violet-700' },
  { id: 'producer', label: 'Ser Productor', icon: Store, href: '/producer', color: 'bg-amber-100 text-amber-700' },
  { id: 'importer', label: 'Ser Importador', icon: Globe, href: '/importer', color: 'bg-sky-100 text-sky-700' },
];

// Componente de botones informativos desplazables
function InfoButtonsStrip() {
  return (
    <div className="w-full overflow-x-auto scrollbar-hide py-3">
      <div className="flex gap-3 px-4 min-w-max">
        {INFO_BUTTONS.map((btn) => {
          const Icon = btn.icon;
          return (
            <Link
              key={btn.id}
              to={btn.href}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full ${btn.color} hover:opacity-80 transition-opacity whitespace-nowrap`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{btn.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// Categorías minimalistas con iconos
function MinimalCategories() {
  return (
    <div className="w-full overflow-x-auto scrollbar-hide py-2">
      <div className="flex gap-4 px-4 min-w-max">
        {CATEGORY_CONFIG.map((cat) => {
          const Icon = cat.icon;
          return (
            <Link
              key={cat.slug}
              to={`/products?category=${cat.slug}`}
              className="flex flex-col items-center gap-1.5 min-w-[60px] group"
            >
              <div className={`w-12 h-12 rounded-full ${cat.bg} ${cat.color} flex items-center justify-center border ${cat.border} group-hover:scale-105 transition-transform`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] text-center text-[#555] font-medium leading-tight max-w-[60px]">
                {cat.shortLabel}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// Productos destacados - cards horizontales desplazables
function FeaturedProducts({ products }) {
  if (!products || products.length === 0) return null;
  
  return (
    <section className="py-4">
      <div className="px-4 mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#1C1C1C]">Productos destacados</h2>
        <Link to="/products" className="text-xs text-[#2D5A27] hover:underline flex items-center gap-0.5">
          Ver todo <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
        {products.slice(0, 8).map((product) => (
          <Link
            key={product.product_id}
            to={`/products/${product.product_id}`}
            className="flex-shrink-0 w-28 group"
          >
            <div className="w-28 h-28 rounded-2xl overflow-hidden bg-stone-100 border border-stone-200">
              {product.images?.[0] ? (
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-stone-300">
                  <ShoppingBag className="w-8 h-8" />
                </div>
              )}
            </div>
            <p className="mt-2 text-xs font-medium text-[#1C1C1C] truncate">{product.name}</p>
            <p className="text-xs font-semibold text-[#2D5A27]">{product.price?.toFixed(2)} €</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

// Post individual tipo Instagram
function PostCard({ post }) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  
  const handleLike = (e) => {
    e.preventDefault();
    setLiked(!liked);
  };
  
  const handleSave = (e) => {
    e.preventDefault();
    setSaved(!saved);
  };

  return (
    <article className="bg-white border-b border-stone-100 pb-4 mb-4">
      {/* Header del post */}
      <div className="flex items-center justify-between px-4 py-3">
        <Link to={`/profile/${post.user_id}`} className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-stone-200 overflow-hidden">
            <img 
              src={post.user_profile_image || '/default-avatar.png'} 
              alt={post.user_name}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#1C1C1C]">{post.user_name}</p>
            <p className="text-[10px] text-[#7A7A7A]">2h</p>
          </div>
        </Link>
        <button className="text-[#7A7A7A] hover:text-[#1C1C1C]">
          <span className="text-xl">⋯</span>
        </button>
      </div>
      
      {/* Imagen del post */}
      <div className="w-full aspect-square bg-stone-100">
        <img
          src={post.image_url || post.media_url}
          alt={post.caption || 'Post'}
          className="w-full h-full object-cover"
        />
      </div>
      
      {/* Acciones */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <button onClick={handleLike} className={`transition-colors ${liked ? 'text-red-500' : 'text-[#1C1C1C]'}`}>
            <Heart className={`w-6 h-6 ${liked ? 'fill-current' : ''}`} />
          </button>
          <button className="text-[#1C1C1C]">
            <MessageCircle className="w-6 h-6" />
          </button>
          <button className="text-[#1C1C1C]">
            <Share2 className="w-6 h-6" />
          </button>
        </div>
        <button onClick={handleSave} className={`transition-colors ${saved ? 'text-[#1C1C1C]' : 'text-[#1C1C1C]'}`}>
          <Bookmark className={`w-6 h-6 ${saved ? 'fill-current' : ''}`} />
        </button>
      </div>
      
      {/* Likes y caption */}
      <div className="px-4">
        <p className="text-sm font-semibold text-[#1C1C1C]">{post.likes_count || 245} me gusta</p>
        <div className="mt-1">
          <span className="text-sm font-semibold text-[#1C1C1C]">{post.user_name}</span>{' '}
          <span className="text-sm text-[#1C1C1C]">{post.caption}</span>
        </div>
        <p className="text-[10px] text-[#7A7A7A] mt-1">Ver {post.comments_count || 31} comentarios</p>
      </div>
    </article>
  );
}

// Feed social con scroll infinito
function SocialFeedInfinite({ user }) {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const observerRef = useRef();

  // Cargar posts iniciales
  useEffect(() => {
    const loadPosts = async () => {
      setLoading(true);
      try {
        // En producción, esto vendría de la API con filtro de usuarios seguidos
        // const res = await axios.get(`${API}/feed?type=following&page=1&limit=10`);
        
        // Por ahora usamos demo posts mezclados
        const initialPosts = [];
        setPosts(initialPosts);
        setHasMore(initialPosts.length === 3);
      } catch (err) {
        console.error('Error loading feed:', err);
      }
      setLoading(false);
    };
    
    loadPosts();
  }, []);

  // Load more posts
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    try {
      // Simular carga de más posts
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // En producción: const res = await axios.get(`${API}/feed?type=following&page=${page + 1}&limit=10`);
      const newPosts = [];
      
      if (newPosts.length === 0) {
        setHasMore(false);
      } else {
        setPosts(prev => [...prev, ...newPosts]);
        setPage(p => p + 1);
      }
    } catch (err) {
      console.error('Error loading more posts:', err);
    }
    setLoading(false);
  }, [page, loading, hasMore]);

  // Intersection observer para scroll infinito
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );
    
    if (observerRef.current) {
      observer.observe(observerRef.current);
    }
    
    return () => observer.disconnect();
  }, [loadMore, hasMore]);

  if (posts.length === 0 && !loading) {
    return (
      <div className="text-center py-10">
        <p className="text-[#7A7A7A]">No hay publicaciones para mostrar</p>
        <Link to="/discover" className="text-[#2D5A27] text-sm mt-2 inline-block">
          Descubre perfiles para seguir
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      {/* Header del feed */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
        <h2 className="text-sm font-semibold text-[#1C1C1C]">Feed</h2>
        <Link to="/discover" className="text-xs text-[#2D5A27]">
          Explorar
        </Link>
      </div>
      
      {/* Posts */}
      <div className="bg-[#FAFAFA]">
        {posts.map((post, index) => (
          <PostCard key={`${post.id}-${index}`} post={post} />
        ))}
      </div>
      
      {/* Loading indicator / Observer target */}
      <div ref={observerRef} className="py-8 text-center">
        {loading && (
          <div className="flex items-center justify-center gap-2 text-[#7A7A7A]">
            <div className="w-5 h-5 border-2 border-stone-200 border-t-[#2D5A27] rounded-full animate-spin" />
            <span className="text-sm">Cargando más...</span>
          </div>
        )}
        {!hasMore && posts.length > 0 && (
          <p className="text-xs text-[#7A7A7A]">No hay más publicaciones</p>
        )}
      </div>
    </div>
  );
}

export default function HomePage() {
  const [featured, setFeatured] = useState([]);
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${API}/products?approved_only=true`).then((response) => {
      const data = (response.data.products || response.data || []).slice(0, 15);
      setFeatured(Array.isArray(data) ? data : []);
    }).catch(() => {
      setFeatured([]);
    });
  }, []);

  const structuredData = useMemo(() => ([
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Hispaloshop',
      url: 'https://www.hispaloshop.com',
      description: 'Productos artesanales de tu zona y delicatessen importadas con pago seguro y trazabilidad real.',
    },
  ]), []);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-white">
      <SEO
        title="Hispaloshop - Descubre productos reales"
        description="Productos artesanales de tu zona y delicatessen importadas con pago seguro y trazabilidad real."
        url="https://www.hispaloshop.com"
        structuredData={structuredData}
      />

      <Header />

      <main className="pt-14">
        {/* Botones informativos desplazables */}
        <InfoButtonsStrip />
        
        {/* Título principal */}
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold text-[#1C1C1C]">DESCUBRE PRODUCTOS REALES</h1>
        </div>
        
        {/* Categorías minimalistas */}
        <MinimalCategories />
        
        {/* Productos destacados */}
        <FeaturedProducts products={featured} />
        
        {/* Separador */}
        <div className="h-2 bg-[#F5F5F5] my-2" />
        
        {/* Feed social */}
        <SocialFeedInfinite user={user} />
      </main>

      <Footer />
    </div>
  );
}
