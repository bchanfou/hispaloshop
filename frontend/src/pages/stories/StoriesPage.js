import React from 'react';
import { Navigate } from 'react-router-dom';

// Stories are now handled by /create/story and the feed StoriesBar/StoryViewer
const StoriesPage = () => <Navigate to="/" replace />;

export default StoriesPage;
