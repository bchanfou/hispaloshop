// @ts-nocheck
// Section 3.6.5 (audit cleanup): legacy moderation page replaced by the
// Section 3.5 / 3.5b unified super-admin moderation dashboard. Kept as a
// 1-line redirect so bookmarks keep working.
import React from 'react';
import { Navigate } from 'react-router-dom';

export default function AdminModerationPage() {
  return <Navigate to="/super-admin/moderation" replace />;
}
