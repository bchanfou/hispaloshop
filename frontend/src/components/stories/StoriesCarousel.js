import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// Mock data para stories
const MOCK_STORIES = [
  { id: '1', user: { id: 'u1', name: 'María', avatar: 'https://i.pravatar.cc/150?u=maria' }, type: 'image', seen: false },
  { id: '2', user: { id: 'u2', name: 'Carlos', avatar: 'https://i.pravatar.cc/150?u=carlos' }, type: 'video', seen: false, isLive: true },
  { id: '3', user: { id: 'u3', name: 'Ana', avatar: 'https://i.pravatar.cc/150?u=ana' }, type: 'image', seen: true },
  { id: '4', user: { id: 'u4', name: 'Pedro', avatar: 'https://i.pravatar.cc/150?u=pedro' }, type: 'image', seen: false },
  { id: '5', user: { id: 'u5', name: 'Lucía', avatar: 'https://i.pravatar.cc/150?u=lucia' }, type: 'image', seen: true },
  { id: '6', user: { id: 'u6', name: 'Miguel', avatar: 'https://i.pravatar.cc/150?u=miguel' }, type: 'video', seen: false },
];

function StoryRing({ story, onClick }) {
  // Determinar color del anillo
  const getRingColor = () => {
    if (story.isLive) return 'bg-gradient-to-tr from-yellow-400 to-orange-500';
    if (story.seen) return 'bg-[#6B7280]';
    return 'bg-gradient-to-tr from-emerald-400 to-[#2D5A3D]';
  };

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 flex-shrink-0"
    >
      <div className={`p-[3px] rounded-full ${getRingColor()}`}>
        <div className="w-16 h-16 rounded-full border-2 border-white overflow-hidden bg-stone-100">
          <img
            src={story.user.avatar}
            alt={story.user.name}
            className="w-full h-full object-cover"
          />
        </div>
      </div>
      <span className="text-xs text-[#6B7280] truncate max-w-[72px]">
        {story.user.name}
      </span>
      {story.isLive && (
        <span className="absolute top-0 right-0 px-1.5 py-0.5 bg-gradient-to-r from-red-500 to-red-600 text-white text-[8px] font-bold rounded-full">
          LIVE
        </span>
      )}
    </motion.button>
  );
}

function StoriesCarousel({ onCreateStory, onViewStory }) {
  const { user } = useAuth();
  const scrollRef = useRef(null);

  return (
    <div className="bg-white py-4 border-b border-stone-100">
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto px-4 scrollbar-hide scroll-smooth snap-x"
      >
        {/* Tu historia */}
        <button
          onClick={onCreateStory}
          className="flex flex-col items-center gap-1.5 flex-shrink-0 snap-start"
        >
          <div className="relative">
            <div className="w-[70px] h-[70px] rounded-full border-2 border-dashed border-stone-300 flex items-center justify-center bg-stone-50 hover:bg-stone-100 transition-colors">
              {user?.profile_image ? (
                <img
                  src={user.profile_image}
                  alt="Tu historia"
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-stone-200 flex items-center justify-center">
                  <span className="text-xl text-stone-400">
                    {(user?.name || 'U')[0].toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <div className="absolute bottom-0 right-0 w-6 h-6 bg-[#2D5A3D] rounded-full flex items-center justify-center border-2 border-white">
              <Plus className="w-4 h-4 text-white" />
            </div>
          </div>
          <span className="text-xs text-[#6B7280]">Tu historia</span>
        </button>

        {/* Stories de otros usuarios */}
        {MOCK_STORIES.map((story) => (
          <div key={story.id} className="snap-start">
            <StoryRing
              story={story}
              onClick={() => onViewStory(story)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default StoriesCarousel;
