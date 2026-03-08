import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import useSWR from 'swr';
import { useAuth } from '../../context/AuthContext';

const StoryAvatar = ({ story, onClick }) => {
  const { user, hasUnseen, isEmpty } = story;
  
  const getRingColor = () => {
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
              src={user.avatar || user.picture || '/default-avatar.png'}
              alt={user.username || user.name}
              className="w-full h-full rounded-full object-cover"
            />
          )}
        </div>
      </div>
      
      <span className={`text-xs font-medium truncate max-w-[72px] ${
        isEmpty ? 'text-[#6B7280]' : 'text-[#1A1A1A]'
      }`}>
        {isEmpty ? 'Tu historia' : (user.username || user.name || 'Usuario')}
      </span>
    </button>
  );
};

const StoriesCarousel = () => {
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const { user } = useAuth();

  // Fetch real stories from API
  const { data: storiesData, isLoading } = useSWR(
    '/stories/feed',
    async (url) => {
      const res = await fetch(url);
      if (!res.ok) return [];
      return res.json();
    },
    { 
      revalidateOnFocus: false,
      fallbackData: []
    }
  );

  const handleStoryClick = (story) => {
    if (story.isEmpty) {
      navigate('/stories/create');
    } else {
      navigate('/stories', { state: { startWithId: story.id } });
    }
  };

  // Build stories array with "Your Story" first if user is logged in
  const stories = React.useMemo(() => {
    const feedStories = (storiesData?.stories || storiesData || []).slice(0, 10);
    
    if (user) {
      const yourStory = {
        id: 'self',
        user: { 
          id: user.user_id, 
          username: 'Tu historia', 
          avatar: user.picture,
          name: user.name 
        },
        hasUnseen: false,
        isEmpty: true
      };
      return [yourStory, ...feedStories];
    }
    
    return feedStories;
  }, [storiesData, user]);

  if (isLoading) {
    return (
      <div className="bg-white py-4 border-b border-stone-100">
        <div className="flex gap-4 overflow-x-auto px-4 scrollbar-hide">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div className="w-16 h-16 rounded-full bg-stone-200 animate-pulse" />
              <div className="w-12 h-3 bg-stone-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (stories.length === 0) {
    return (
      <div className="bg-white py-4 border-b border-stone-100">
        <div className="flex gap-4 overflow-x-auto px-4 scrollbar-hide">
          {user && (
            <StoryAvatar
              story={{
                id: 'self',
                user: { 
                  id: user.user_id, 
                  username: 'Tu historia', 
                  avatar: user.picture,
                  name: user.name 
                },
                hasUnseen: false,
                isEmpty: true
              }}
              onClick={() => navigate('/stories/create')}
            />
          )}
          <div className="flex items-center text-sm text-stone-500 py-4">
            No hay historias disponibles
          </div>
        </div>
      </div>
    );
  }

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
