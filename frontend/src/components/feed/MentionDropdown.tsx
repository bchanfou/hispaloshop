// @ts-nocheck
import React from 'react';

export default function MentionDropdown({ suggestions, activeIndex, onSelect }) {
  if (!suggestions?.length) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 bg-white rounded-2xl shadow-lg overflow-hidden z-50 max-h-[200px] overflow-y-auto">
      {suggestions.map((user, i) => (
        <button
          key={user.user_id || user.username || i}
          onClick={() => onSelect(user)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 text-left border-none cursor-pointer transition-colors ${
            i === activeIndex ? 'bg-stone-100' : 'bg-white hover:bg-stone-50'
          }`}
        >
          <img
            src={user.profile_image || user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username || 'U')}&background=f5f5f4&color=78716c&size=32`}
            alt=""
            className="w-8 h-8 rounded-full object-cover bg-stone-100"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-stone-950 truncate">{user.name || user.username}</p>
            <p className="text-xs text-stone-500 truncate">@{user.username}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
