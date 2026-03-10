import React from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Share2, Bookmark, ShoppingBag, Plus, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function CountDisplay({ count }) {
  if (count >= 1000000) return <span>{(count / 1000000).toFixed(1)}M</span>;
  if (count >= 1000) return <span>{(count / 1000).toFixed(1)}k</span>;
  return <span>{count}</span>;
}

function ReelSidebar({ 
  reel,
  isLiked,
  likesCount,
  isSaved,
  isFollowing,
  onLike,
  onSave,
  onFollow,
  onOpenComments,
  onOpenProduct,
  onShare,
}) {
  const navigate = useNavigate();
  const hasProduct = !!reel.productTag;

  const handleProfileClick = () => {
    navigate(`/user/${reel.user.id}`);
  };

  const buttonVariants = {
    tap: { scale: 0.85 },
    hover: { scale: 1.05 },
  };

  return (
    <div className="absolute right-2 bottom-24 flex flex-col items-center gap-4 z-20">
      {/* Avatar con botón follow */}
      <div className="relative mb-2">
        <motion.button
          variants={buttonVariants}
          whileTap="tap"
          whileHover="hover"
          onClick={handleProfileClick}
          className="relative"
        >
          <img
            src={reel.user.avatar}
            alt={reel.user.username}
            className="w-12 h-12 rounded-full border-2 border-white object-cover"
          />
          {reel.user.verified && (
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
              <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            </div>
          )}
        </motion.button>
        
        {/* Botón follow */}
        <motion.button
          initial={false}
          animate={isFollowing ? { scale: [1, 1.2, 1] } : {}}
          onClick={onFollow}
          className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center ${
            isFollowing 
              ? 'bg-transparent border border-white' 
              : 'bg-[#FF3040]'
          }`}
        >
          {isFollowing ? (
            <Check className="w-3 h-3 text-white" />
          ) : (
            <Plus className="w-3 h-3 text-white" />
          )}
        </motion.button>
      </div>

      {/* Like */}
      <motion.button
        variants={buttonVariants}
        whileTap="tap"
        whileHover="hover"
        onClick={onLike}
        className="flex flex-col items-center gap-0.5"
      >
        <div className={`p-2 rounded-full ${isLiked ? 'bg-white/10' : ''}`}>
          <Heart 
            className={`w-7 h-7 ${isLiked ? 'text-[#FF3040] fill-[#FF3040]' : 'text-white'}`}
            strokeWidth={isLiked ? 0 : 2}
          />
        </div>
        <span className="text-white text-xs font-medium drop-shadow-lg">
          <CountDisplay count={likesCount} />
        </span>
      </motion.button>

      {/* Comments */}
      <motion.button
        variants={buttonVariants}
        whileTap="tap"
        whileHover="hover"
        onClick={onOpenComments}
        className="flex flex-col items-center gap-0.5"
      >
        <div className="p-2">
          <MessageCircle className="w-7 h-7 text-white" />
        </div>
        <span className="text-white text-xs font-medium drop-shadow-lg">
          <CountDisplay count={reel.stats.comments} />
        </span>
      </motion.button>

      {/* Share */}
      <motion.button
        variants={buttonVariants}
        whileTap="tap"
        whileHover="hover"
        onClick={onShare}
        className="flex flex-col items-center gap-0.5"
      >
        <div className="p-2">
          <Share2 className="w-7 h-7 text-white" />
        </div>
        <span className="text-white text-xs font-medium drop-shadow-lg">
          <CountDisplay count={reel.stats.shares} />
        </span>
      </motion.button>

      {/* Product (solo si hay producto) */}
      {hasProduct && (
        <motion.button
          variants={buttonVariants}
          whileTap="tap"
          whileHover="hover"
          onClick={onOpenProduct}
          className="flex flex-col items-center gap-0.5"
        >
          <div className="w-12 h-12 rounded-full bg-state-amber flex items-center justify-center shadow-lg">
            <ShoppingBag className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-[10px] font-medium drop-shadow-lg">Producto</span>
        </motion.button>
      )}

      {/* Save */}
      <motion.button
        variants={buttonVariants}
        whileTap="tap"
        whileHover="hover"
        onClick={onSave}
        className="flex flex-col items-center gap-0.5 mt-2"
      >
        <div className="p-2">
          <Bookmark className={`w-7 h-7 text-white ${isSaved ? 'fill-white' : ''}`} />
        </div>
      </motion.button>
    </div>
  );
}

export default ReelSidebar;
