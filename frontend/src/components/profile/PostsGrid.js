import React from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Play } from 'lucide-react';

const MOCK_POSTS = [
  {
    id: 1,
    type: 'image',
    image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400',
    likes: 1234,
    comments: 89,
    caption: 'Proceso de recogida de aceitunas 🫒✨'
  },
  {
    id: 2,
    type: 'reel',
    image: 'https://images.unsplash.com/photo-1552767059-ce182ead6c1b?w=400',
    likes: 3456,
    comments: 234,
    caption: 'Cómo hacer el mejor queso curado 🧀'
  },
  {
    id: 3,
    type: 'image',
    image: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400',
    likes: 892,
    comments: 45,
    caption: 'Nuestra finca en invierno ❄️'
  },
  {
    id: 4,
    type: 'image',
    image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400',
    likes: 567,
    comments: 23,
    caption: 'Miel recién recolectada 🍯'
  },
  {
    id: 5,
    type: 'reel',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400',
    likes: 8901,
    comments: 456,
    caption: 'Así amasamos nuestro pan 🍞'
  },
  {
    id: 6,
    type: 'image',
    image: 'https://images.unsplash.com/photo-1548685913-fe6678babe8d?w=400',
    likes: 2234,
    comments: 167,
    caption: 'Pack degustación disponible 🎁'
  },
  {
    id: 7,
    type: 'image',
    image: 'https://images.unsplash.com/photo-1606913084603-3e7702b01627?w=400',
    likes: 1567,
    comments: 98,
    caption: 'Visita a nuestra bodega 🍷'
  },
  {
    id: 8,
    type: 'reel',
    image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400',
    likes: 12345,
    comments: 890,
    caption: 'Desayuno andaluz completo ☕'
  },
  {
    id: 9,
    type: 'image',
    image: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400',
    likes: 445,
    comments: 34,
    caption: 'Nuevos productos esta semana ✨'
  }
];

function PostsGrid() {
  return (
    <div className="px-1 pb-4">
      <div className="grid grid-cols-3 gap-1">
        {MOCK_POSTS.map((post, index) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.03 }}
            className="relative aspect-square group cursor-pointer overflow-hidden bg-background-subtle"
          >
            <img
              src={post.image}
              alt={post.caption}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            
            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
              <div className="flex items-center gap-1 text-white">
                <Heart className="w-5 h-5 fill-white" />
                <span className="font-semibold">{post.likes >= 1000 ? `${(post.likes / 1000).toFixed(1)}k` : post.likes}</span>
              </div>
              <div className="flex items-center gap-1 text-white">
                <MessageCircle className="w-5 h-5 fill-white" />
                <span className="font-semibold">{post.comments}</span>
              </div>
            </div>

            {/* Reel indicator */}
            {post.type === 'reel' && (
              <div className="absolute top-2 right-2">
                <Play className="w-4 h-4 text-white fill-white drop-shadow-md" />
              </div>
            )}

            {/* Multiple images indicator */}
            {post.type === 'carousel' && (
              <div className="absolute top-2 right-2">
                <div className="w-4 h-4 border-2 border-white rounded-sm" />
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default PostsGrid;
