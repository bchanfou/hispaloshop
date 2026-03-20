import React from 'react';

export default function ChatLayout({ sidebar, children }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] h-[calc(100vh-72px)] bg-white rounded-2xl overflow-hidden border">
      <aside className="border-r bg-stone-50">{sidebar}</aside>
      <main className="flex flex-col min-h-0">{children}</main>
    </div>
  );
}
