import React, { Suspense, lazy } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';

// Lazy load story components for better performance
const StoryViewer = lazy(() => import('../../components/stories/StoryViewer'));
const StoryCreator = lazy(() => import('../../components/stories/StoryCreator'));

// Loading fallback
const StoryLoader = () => (
  <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
  </div>
);

/**
 * StoriesPage - Main container for story-related routes
 * 
 * Routes:
 * - /stories - Story viewer for watching stories
 * - /stories/create - Story creator for creating new stories
 */
const StoriesPage = () => {
  const location = useLocation();
  
  return (
    <Suspense fallback={<StoryLoader />}>
      <Routes>
        <Route path="/" element={<StoryViewer />} />
        <Route path="/create" element={<StoryCreator />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default StoriesPage;
