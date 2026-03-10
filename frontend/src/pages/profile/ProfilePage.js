import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, 
  Star, 
  Users, 
  ShoppingBag, 
  MessageCircle,
  Share2,
  CheckCircle2,
  Plus,
  Settings,
  MoreHorizontal
} from 'lucide-react';
import ProfileTabs from '../../components/profile/ProfileTabs';
import StoreView from '../../components/profile/StoreView';
import PostsGrid from '../../components/profile/PostsGrid';
import InfoView from '../../components/profile/InfoView';

const PROFILE_DATA = {
  name: 'Cortijo Andaluz',
  handle: '@cortijoandaluz',
  avatar: 'https://images.unsplash.com/photo-1548685913-fe6678babe8d?w=400',
  cover: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800',
  bio: '🫒 Aceite de oliva premium desde 1970\n🧀 Productos artesanales de Andalucía\n🚚 Envíos a toda España\n📍 Córdoba, España',
  location: 'Córdoba, España',
  rating: 4.9,
  sales: 12543,
  followers: 45600,
  following: 234,
  isVerified: true,
  isFollowing: false
};

const HIGHLIGHTS = [
  { id: 1, name: 'Novedades', image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=200' },
  { id: 2, name: 'Proceso', image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=200' },
  { id: 3, name: 'Recetas', image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=200' },
  { id: 4, name: 'Eventos', image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=200' },
];

function ProfilePage() {
  const [activeTab, setActiveTab] = useState('store');
  const [isFollowing, setIsFollowing] = useState(PROFILE_DATA.isFollowing);

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
  };

  return (
    <div className="min-h-screen bg-background-subtle pb-20">
      {/* Cover Image */}
      <div className="relative h-32 overflow-hidden">
        <img
          src={PROFILE_DATA.cover}
          alt="Cover"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent" />
        
        {/* Top Actions */}
        <div className="absolute top-4 right-4 flex gap-2">
          <button className="p-2 bg-black/30 backdrop-blur-md rounded-full text-white hover:bg-slate-950/40 transition-colors">
            <Share2 className="w-5 h-5" />
          </button>
          <button className="p-2 bg-black/30 backdrop-blur-md rounded-full text-white hover:bg-slate-950/40 transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Profile Info */}
      <div className="px-4 -mt-12 relative">
        {/* Avatar */}
        <div className="relative inline-block">
          <div className="w-24 h-24 rounded-full border-4 border-[#F5F1E8] overflow-hidden bg-white">
            <img
              src={PROFILE_DATA.avatar}
              alt={PROFILE_DATA.name}
              className="w-full h-full object-cover"
            />
          </div>
          {PROFILE_DATA.isVerified && (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-state-amber rounded-full flex items-center justify-center border-2 border-white">
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
          )}
        </div>

        {/* Name & Handle */}
        <div className="mt-3">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            {PROFILE_DATA.name}
          </h1>
          <p className="text-text-muted">{PROFILE_DATA.handle}</p>
        </div>

        {/* Bio */}
        <p className="mt-2 text-sm text-gray-900 whitespace-pre-line">
          {PROFILE_DATA.bio}
        </p>

        {/* Location */}
        <div className="flex items-center gap-1 mt-2 text-sm text-text-muted">
          <MapPin className="w-4 h-4" />
          <span>{PROFILE_DATA.location}</span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 mt-4 py-3 border-y border-stone-200">
          <div className="text-center">
            <div className="flex items-center gap-1 justify-center">
              <Star className="w-4 h-4 fill-state-amber text-state-amber" />
              <span className="font-bold text-gray-900">{PROFILE_DATA.rating}</span>
            </div>
            <span className="text-xs text-text-muted">Valoración</span>
          </div>
          <div className="text-center">
            <span className="font-bold text-gray-900">
              {PROFILE_DATA.sales >= 1000 ? `${(PROFILE_DATA.sales / 1000).toFixed(1)}k` : PROFILE_DATA.sales}
            </span>
            <span className="text-xs text-text-muted block">Ventas</span>
          </div>
          <div className="text-center">
            <span className="font-bold text-gray-900">
              {PROFILE_DATA.followers >= 1000 ? `${(PROFILE_DATA.followers / 1000).toFixed(1)}k` : PROFILE_DATA.followers}
            </span>
            <span className="text-xs text-text-muted block">Seguidores</span>
          </div>
          <div className="text-center">
            <span className="font-bold text-gray-900">{PROFILE_DATA.following}</span>
            <span className="text-xs text-text-muted block">Siguiendo</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleFollow}
            className={`flex-1 py-2.5 rounded-full font-medium text-sm transition-colors ${
              isFollowing
                ? 'bg-background-subtle text-gray-900 border border-stone-300'
                : 'bg-accent text-white'
            }`}
          >
            {isFollowing ? 'Siguiendo' : 'Seguir'}
          </button>
          <button className="flex-1 py-2.5 bg-background-subtle text-gray-900 rounded-full font-medium text-sm border border-stone-300 hover:bg-[#EBE6D5] transition-colors">
            Mensaje
          </button>
          <button className="px-3 py-2.5 bg-background-subtle text-gray-900 rounded-full border border-stone-300 hover:bg-[#EBE6D5] transition-colors">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>

        {/* Highlights */}
        <div className="flex gap-4 mt-6 overflow-x-auto pb-2 scrollbar-hide">
          {HIGHLIGHTS.map((highlight) => (
            <button key={highlight.id} className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-accent p-0.5">
                <img
                  src={highlight.image}
                  alt={highlight.name}
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <span className="text-xs text-gray-900">{highlight.name}</span>
            </button>
          ))}
          <button className="flex flex-col items-center gap-1 flex-shrink-0">
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-[#6B7280] flex items-center justify-center">
              <Plus className="w-6 h-6 text-text-muted" />
            </div>
            <span className="text-xs text-text-muted">Nueva</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6">
        <ProfileTabs activeTab={activeTab} onChange={setActiveTab} />
        
        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'store' && <StoreView />}
            {activeTab === 'posts' && <PostsGrid />}
            {activeTab === 'info' && <InfoView />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default ProfilePage;
