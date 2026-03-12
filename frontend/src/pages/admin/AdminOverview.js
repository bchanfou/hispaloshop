import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { FileCheck, Loader2, Package, ShieldAlert, ShoppingBag, Users } from 'lucide-react';
import { API } from '../../utils/api';
import { useTranslation } from 'react-i18next';

function AdminCard({ icon: Icon, title, value, description, to }) {
  return (
    <Link to={to} className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-stone-500">{title}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-stone-950">{value}</p>
          <p className="mt-2 text-sm text-stone-500">{description}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-100 text-stone-700">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Link>
  );
}

export default function AdminOverview() {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await axios.get(`${API}/admin/stats`, { withCredentials: true });
        if (active) setStats(response.data || {});
      } catch {
        if (active) setStats({});
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const pendingCount = useMemo(
    () => (stats?.pending_producers || 0) + (stats?.pending_products || 0) + (stats?.pending_certificates || 0),
    [stats],
  );
  const producerTotal = stats?.total_producers || 0;
  const productTotal = stats?.total_products || 0;
  const pendingProducers = stats?.pending_producers || stats?.pending_moderation?.users || 0;
  const pendingProducts = stats?.pending_products || stats?.pending_moderation?.products || 0;
  const pendingCertificates = stats?.pending_certificates || 0;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-stone-500" />
      </div>
    );
  }

  return (
    <div className="ds-page">
      <div className="ds-shell">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight text-stone-950">{t('admin.dashboard', 'Panel de administración')}</h1>
          <p className="mt-2 text-sm text-stone-500">Usuarios, productos, informes y certificados dentro de una misma cuadrícula de gestión.</p>
        </header>

        <section className="ds-section ds-grid-4">
          <AdminCard icon={Users} title="Usuarios" value={producerTotal} description={`${pendingProducers} pendientes`} to="/admin/producers" />
          <AdminCard icon={Package} title="Productos" value={productTotal} description={`${pendingProducts} por revisar`} to="/admin/products" />
          <AdminCard icon={ShieldAlert} title="Informes" value={pendingCount} description="Revisión operativa" to="/admin/reviews" />
          <AdminCard icon={FileCheck} title="Certificados" value={pendingCertificates} description="Validaciones abiertas" to="/admin/certificates" />
        </section>

        <section className="ds-section grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-stone-950">Cola de revisión</h2>
            <div className="mt-5 space-y-3">
              <Link to="/admin/producers" className="flex items-center justify-between rounded-2xl border border-stone-100 bg-stone-50 p-4 text-sm text-stone-700 transition-all duration-200 hover:shadow-sm">
                <span>Productores e importadores</span>
                <span>{pendingProducers}</span>
              </Link>
              <Link to="/admin/products" className="flex items-center justify-between rounded-2xl border border-stone-100 bg-stone-50 p-4 text-sm text-stone-700 transition-all duration-200 hover:shadow-sm">
                <span>Productos pendientes</span>
                <span>{pendingProducts}</span>
              </Link>
              <Link to="/admin/certificates" className="flex items-center justify-between rounded-2xl border border-stone-100 bg-stone-50 p-4 text-sm text-stone-700 transition-all duration-200 hover:shadow-sm">
                <span>Certificados</span>
                <span>{pendingCertificates}</span>
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-stone-950">Atajos de gestión</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Link to="/admin/orders" className="rounded-2xl border border-stone-100 bg-stone-50 p-4 text-sm text-stone-700 transition-all duration-200 hover:shadow-sm">
                <ShoppingBag className="mb-3 h-4 w-4" />
                Pedidos
              </Link>
              <Link to="/admin/reviews" className="rounded-2xl border border-stone-100 bg-stone-50 p-4 text-sm text-stone-700 transition-all duration-200 hover:shadow-sm">
                <ShieldAlert className="mb-3 h-4 w-4" />
                Moderación
              </Link>
              <Link to="/admin/discount-codes" className="rounded-2xl border border-stone-100 bg-stone-50 p-4 text-sm text-stone-700 transition-all duration-200 hover:shadow-sm">
                <FileCheck className="mb-3 h-4 w-4" />
                Descuentos
              </Link>
              <Link to="/admin/influencers" className="rounded-2xl border border-stone-100 bg-stone-50 p-4 text-sm text-stone-700 transition-all duration-200 hover:shadow-sm">
                <Users className="mb-3 h-4 w-4" />
                Influencers
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
