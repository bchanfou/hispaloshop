import React from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreVertical, Edit2, MapPin, Link as LinkIcon, Mail, CheckCircle, Star, Package, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

function VerificationBadge() {
  return (
    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
      <CheckCircle className="w-3 h-3 text-white" />
    </div>
  );
}

function FollowButton({ isFollowing, onToggle }) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onToggle}
      className={`flex-1 py-2.5 px-4 rounded-full font-medium text-sm transition-colors ${
        isFollowing
          ? 'bg-stone-100 text-[#1A1A1A] border border-stone-200'
          : 'bg-[#2D5A3D] text-white'
      }`}
    >
      {isFollowing ? 'Siguiendo' : 'Seguir'}
    </motion.button>
  );
}

function ProfileHeader({ profile, isOwner = false }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = React.useState(false);

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
  };

  return (
    <div className="bg-white">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 hover:bg-stone-100 rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="font-semibold">@{profile.username}</span>
        <div className="flex items-center gap-2">
          {isOwner && (
            <button className="p-2 hover:bg-stone-100 rounded-full">
              <Edit2 className="w-5 h-5" />
            </button>
          )}
          <button className="p-2 hover:bg-stone-100 rounded-full">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Profile info */}
      <div className="px-4 pb-4">
        {/* Avatar */}
        <div className="flex justify-center mb-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg">
              <img
                src={profile.avatar}
                alt={profile.displayName}
                className="w-full h-full object-cover"
              />
            </div>
            {profile.verified && (
              <div className="absolute bottom-0 right-0">
                <VerificationBadge />
              </div>
            )}
          </div>
        </div>

        {/* Name & type */}
        <div className="text-center mb-4">
          <h1 className="text-xl font-bold flex items-center justify-center gap-2">
            {profile.displayName}
            {profile.verified && <VerificationBadge />}
          </h1>
          <p className="text-sm text-[#6B7280] capitalize">
            {profile.type === 'producer' ? 'Productor' : profile.type === 'importer' ? 'Importador' : 'Consumidor'}
            {profile.location && ` · ${profile.location.city}, ${profile.location.country}`}
          </p>
        </div>

        {/* Stats */}
        <div className="flex justify-center gap-6 mb-4">
          <div className="text-center">
            <div className="flex items-center gap-1 text-[#E6A532]">
              <Star className="w-4 h-4 fill-[#E6A532]" />
              <span className="font-bold">{profile.stats.rating}</span>
            </div>
            <span className="text-xs text-[#6B7280]">{profile.stats.reviews} reseñas</span>
          </div>
          <div className="text-center">
            <div className="flex items-center gap-1">
              <Package className="w-4 h-4 text-[#2D5A3D]" />
              <span className="font-bold">{profile.stats.sales >= 1000 ? `${(profile.stats.sales / 1000).toFixed(1)}k` : profile.stats.sales}</span>
            </div>
            <span className="text-xs text-[#6B7280]">ventas</span>
          </div>
          <div className="text-center">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4 text-[#2D5A3D]" />
              <span className="font-bold">{profile.stats.followers >= 1000 ? `${(profile.stats.followers / 1000).toFixed(1)}k` : profile.stats.followers}</span>
            </div>
            <span className="text-xs text-[#6B7280]">seguidores</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mb-4">
          {isOwner ? (
            <>
              <Link
                to="/dashboard/store/edit"
                className="flex-1 py-2.5 px-4 rounded-full font-medium text-sm bg-[#2D5A3D] text-white text-center"
              >
                Editar perfil
              </Link>
              <Link
                to="/dashboard"
                className="flex-1 py-2.5 px-4 rounded-full font-medium text-sm bg-stone-100 text-[#1A1A1A] text-center"
              >
                Ver stats
              </Link>
            </>
          ) : (
            <>
              <FollowButton isFollowing={isFollowing} onToggle={handleFollow} />
              <button className="flex-1 py-2.5 px-4 rounded-full font-medium text-sm bg-stone-100 text-[#1A1A1A]">
                Contactar
              </button>
            </>
          )}
        </div>

        {/* Bio */}
        <p className="text-sm text-[#1A1A1A] text-center mb-3">
          {profile.bio}
        </p>

        {/* Links */}
        <div className="flex justify-center gap-4 text-sm">
          {profile.links?.web && (
            <a 
              href={profile.links.web}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[#2D5A3D]"
            >
              <LinkIcon className="w-4 h-4" />
              <span>Web</span>
            </a>
          )}
          {profile.location && (
            <span className="flex items-center gap-1 text-[#6B7280]">
              <MapPin className="w-4 h-4" />
              {profile.location.city}
            </span>
          )}
          <button className="flex items-center gap-1 text-[#6B7280]">
            <Mail className="w-4 h-4" />
            <span>Email</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProfileHeader;
