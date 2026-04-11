// Section 3.6.2b — DualRoleLayout
// Routes shared between producer and importer (e.g. /b2b/*, /producer/*) wrap
// their <Outlet/> with this helper. It picks the correct dashboard chrome
// based on the authenticated user's role so importers stay inside the
// importer sidebar/identity even when reusing producer pages.

import React, { lazy, Suspense } from 'react';
import { useAuth } from '../../context/AuthContext';

const ProducerLayout = lazy(() => import('./ProducerLayoutResponsive'));
const ImporterLayout = lazy(() => import('./ImporterLayoutResponsive'));

function LayoutFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function DualRoleLayout() {
  const { user, loading } = useAuth();

  if (loading) return <LayoutFallback />;

  const Layout = user?.role === 'importer' ? ImporterLayout : ProducerLayout;

  return (
    <Suspense fallback={<LayoutFallback />}>
      <Layout />
    </Suspense>
  );
}
