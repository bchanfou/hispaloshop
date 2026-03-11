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
    <div className="mb-8 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-stone-950">
          {getGreeting()}, {userName}
        </h1>
        {subtitle ? <p className="mt-2 text-sm text-stone-500">{subtitle}</p> : null}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 transition-all duration-200 hover:shadow-sm"
          aria-label="Notificaciones"
        >
          <Bell className="h-4 w-4" />
          {notificationCount > 0 ? <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-stone-950" /> : null}
        </button>
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 transition-all duration-200 hover:shadow-sm"
          aria-label="Configuración"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default DashboardHeader;
