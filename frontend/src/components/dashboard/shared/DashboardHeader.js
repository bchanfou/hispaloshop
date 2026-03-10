import React from 'react';
import { Bell, Settings } from 'lucide-react';

function DashboardHeader({ userName, subtitle, notificationCount = 0 }) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {getGreeting()}, {userName} 👋
        </h1>
        {subtitle && (
          <p className="text-text-muted mt-1">{subtitle}</p>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <button className="relative p-2.5 rounded-full hover:bg-stone-100 transition-colors">
          <Bell className="w-5 h-5 text-gray-900" />
          {notificationCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </button>
        <button className="p-2.5 rounded-full hover:bg-stone-100 transition-colors">
          <Settings className="w-5 h-5 text-gray-900" />
        </button>
      </div>
    </div>
  );
}

export default DashboardHeader;
