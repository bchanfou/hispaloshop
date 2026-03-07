import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

// Mock data for stories
const MOCK_STORIES = [
  {
    id: 'self',
    user: { id: 'self', username: 'Tu historia', avatar: null, isSelf: true },
    hasUnseen: false,
    isEmpty: true
  },
  {
    id: '1',
    user: { id: 'u1', username: 'cortijoandaluz', avatar: 'https://images.unsplash.com/photo-1548685913-fe6678babe8d?w=100' },
    hasUnseen: true,
    isLive: false
  },
  {
    id: '2',
    user: { id: 'u2', username: 'queserialaantigua', avatar: 'https://images.unsplash.com/photo-1552767059-ce182ead6c1b?w=100' },
    hasUnseen: true,
    isLive: true
  },
  {
    id: '3',
    user: { id: 'u3', username: 'mieldelsur', avatar: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=100' },
    hasUnseen: false,
    isLive: false
  },
  {
    id: '4',
    user: { id: 'u4', username: 'embutidos_juan', avatar: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=100' },
    hasUnseen: true,
    isLive: false
  },
  {
    id: '5',
    user: { id: 'u5', username: 'panaderiamaria', avatar: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=100' },
    hasUnseen: false,
    isLive: false
  },
  {
    id: '6',
    user: { id: 'u6', username: 'conservas_premium', avatar: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=100' },
    hasUnseen: true,
    isLive: false
  },
];

const StoryAvatar = ({ story, onClick }) => {
  const { user, hasUnseen, isLive, isEmpty } = story;
  
  const getRingColor = () => {
    if (isLive) return 'bg-gradient-to-tr from-red-500 via-purple-500 to-blue-500';
    if (hasUnseen) return 'bg-gradient-to-tr from-[#E6A532] via-[#2D5A3D] to-[#16A34A]';
    return 'bg-gray-200';
  };

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 flex-shrink-0 snap-start"
    >
      <div className={`relative p-[2px] rounded-full ${getRingColor()}`}>
        <div className="w-16 h-16 rounded-full bg-white p-[2px]">
          {isEmpty ? (
            <div className="w-full h-full rounded-full bg-gray-100 flex items-center justify-center">
              <Plus className="w-6 h-6 text-[#6B7280]" />
            </div>
          ) : (
            <img
              src={user.avatar}
              alt={user.username}
              className="w-full h-full rounded-full object-cover"
            />
          )}
        </div>
        
        {isLive && (
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            LIVE
          </span>
        )}
      </div>
      
      <span className={`text-xs font-medium truncate max-w-[72px] ${
        isEmpty ? 'text-[#6B7280]' : 'text-[#1A1A1A]'
      }`}>
        {isEmpty ? 'Tu historia' : user.username}
      </span>
    </button>
  );
};

const StoriesCarousel = () => {
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const [stories] = useState(MOCK_STORIES);

  const handleStoryClick = (story) => {
    if (story.isEmpty) {
      // Open story creator
      navigate('/stories/create');
    } else {
      // Open story viewer
      navigate('/stories', { state: { startWithId: story.id } });
    }
  };

  return (
    <div className="bg-white py-4 border-b border-stone-100">
      <div 
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto px-4 scrollbar-hide scroll-smooth snap-x"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {stories.map((story) => (
          <StoryAvatar
            key={story.id}
            story={story}
            onClick={() => handleStoryClick(story)}
          />
        ))}
      </div>
    </div>
  );
};

export default StoriesCarousel;
