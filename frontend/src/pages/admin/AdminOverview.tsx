// @ts-nocheck
// Section 3.6.5 (audit cleanup): legacy /admin overview replaced by the
// Section 3.3 super-admin global dashboard. Kept as a 1-line redirect so
// bookmarks and sidebar links continue to work.
import React from 'react';
import { Navigate } from 'react-router-dom';

export default function AdminOverview() {
  return <Navigate to="/super-admin/overview" replace />;
}
