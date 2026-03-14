import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../services/api/client';
import {
  FileCheck, Loader2, Package, ShieldAlert, ShoppingBag, Users,
  TrendingUp, UserPlus, RotateCcw, HeadphonesIcon, Shield, ArrowRight
} from 'lucide-react';

function KPICard({ icon: Icon, title, value, description, to }) {
  const Wrapper = to ? Link : 'div';
  return (
    <Wrapper
      to={to}
      className="rounded-xl border border-stone-200 bg-white p-4 hover:shadow-sm transition-all"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-lg bg-stone-100 flex items-center justify-center shrink-0">
          <Icon className="w-4.5 h-4.5 text-stone-700" />
        </div>
      </div>
      <p className="text-2xl font-extrabold text-stone-950 tracking-tight">{value}</p>
      <p className="text-xs text-stone-500 mt-0.5">{title}</p>
      {description && <p className="text-[11px] text-stone-400 mt-0.5">{description}</p>}
    </Wrapper>
  );
}

function PendingRow({ label, count, to }) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between p-3.5 rounded-xl border border-stone-200 bg-white hover:shadow-sm transition-all text-sm"
    >
      <span className="text-stone-700 font-medium">{label}</span>
      <div className="flex items-center gap-2">
        {count > 0 && (
          <span className="bg-stone-950 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
            {count}
          </span>
        )}
        <ArrowRight className="w-4 h-4 text-stone-400" />
      </div>
    </Link>
  );
}

function QuickLink({ icon: Icon, label, to }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 p-3.5 bg-white rounded-xl border border-stone-200 hover:shadow-sm transition-all text-sm font-semibold text-stone-950"
    >
      <Icon className="w-5 h-5 text-stone-500 shrink-0" />
      {label}
    </Link>
  );
}

export default function AdminOverview() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    apiClient.get('/admin/stats').then(data => {
      if (active) setStats(data || {});
    }).catch(() => {
      if (active) setStats({});
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-stone-500" />
      </div>
    );
  }

  const pendingProducers = stats?.pending_producers || 0;
  const pendingProducts = stats?.pending_products || 0;
  const pendingCertificates = stats?.pending_certificates || 0;
  const pendingModeration = stats?.pending_moderation || 0;
  const openSupport = stats?.open_support || 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-950 mb-1">Panel de administración</h1>
      <p className="text-sm text-stone-500 mb-6">Gestión de tu mercado en una vista</p>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <KPICard
          icon={TrendingUp}
          value={`${(stats?.gmv_month || 0).toFixed(0)}€`}
          title="GMV este mes"
          description={`${stats?.orders_month || 0} pedidos`}
          to="/admin/orders"
        />
        <KPICard
          icon={UserPlus}
          value={stats?.new_users_month || 0}
          title="Nuevos usuarios"
          description="Este mes"
        />
        <KPICard
          icon={Users}
          value={stats?.total_producers || 0}
          title="Productores"
          description={`${pendingProducers} pendientes`}
          to="/admin/producers"
        />
        <KPICard
          icon={Package}
          value={stats?.total_products || 0}
          title="Productos"
          description={`${pendingProducts} por revisar`}
          to="/admin/products"
        />
      </div>

      {/* Pending review queue */}
      <div className="mb-5">
        <h2 className="text-sm font-bold text-stone-950 mb-3">Cola de revisión</h2>
        <div className="space-y-2">
          <PendingRow label="Productores pendientes" count={pendingProducers} to="/admin/producers" />
          <PendingRow label="Productos por revisar" count={pendingProducts} to="/admin/products" />
          <PendingRow label="Certificados" count={pendingCertificates} to="/admin/certificates" />
          <PendingRow label="Moderación de contenido" count={pendingModeration} to="/admin/trust-safety" />
          <PendingRow label="Soporte abierto" count={openSupport} to="/admin/support" />
          <PendingRow label="Reembolsos" count={stats?.refunded_orders || 0} to="/admin/refunds" />
        </div>
      </div>

      {/* Quick actions */}
      <div className="mb-5">
        <h2 className="text-sm font-bold text-stone-950 mb-3">Acciones rápidas</h2>
        <div className="grid grid-cols-2 gap-2">
          <QuickLink icon={ShoppingBag} label="Pedidos" to="/admin/orders" />
          <QuickLink icon={ShieldAlert} label="Reseñas" to="/admin/reviews" />
          <QuickLink icon={FileCheck} label="Descuentos" to="/admin/discount-codes" />
          <QuickLink icon={Users} label="Influencers" to="/admin/influencers" />
          <QuickLink icon={HeadphonesIcon} label="Soporte" to="/admin/support" />
          <QuickLink icon={Shield} label="Trust & Safety" to="/admin/trust-safety" />
          <QuickLink icon={RotateCcw} label="Reembolsos" to="/admin/refunds" />
          <QuickLink icon={TrendingUp} label="Crecimiento" to="/admin/growth" />
        </div>
      </div>
    </div>
  );
}
