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
      className="p-4 transition-all"
      style={{ borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', background: 'var(--color-white)' }}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 flex items-center justify-center shrink-0" style={{ borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' }}>
          <Icon className="w-4.5 h-4.5" style={{ color: 'var(--color-stone)' }} />
        </div>
      </div>
      <p className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--color-black)' }}>{value}</p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--color-stone)' }}>{title}</p>
      {description && <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-stone)', opacity: 0.7 }}>{description}</p>}
    </Wrapper>
  );
}

function PendingRow({ label, count, to }) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between p-3.5 transition-all text-sm"
      style={{ borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', background: 'var(--color-white)' }}
    >
      <span className="font-medium" style={{ color: 'var(--color-stone)' }}>{label}</span>
      <div className="flex items-center gap-2">
        {count > 0 && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center" style={{ background: 'var(--color-red-light)', color: 'var(--color-red)' }}>
            {count}
          </span>
        )}
        <ArrowRight className="w-4 h-4" style={{ color: 'var(--color-stone)' }} />
      </div>
    </Link>
  );
}

function QuickLink({ icon: Icon, label, to }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 p-3.5 transition-all text-sm font-semibold"
      style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', color: 'var(--color-black)' }}
    >
      <Icon className="w-5 h-5 shrink-0" style={{ color: 'var(--color-stone)' }} />
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
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--color-stone)' }} />
      </div>
    );
  }

  const pendingProducers = stats?.pending_producers || 0;
  const pendingProducts = stats?.pending_products || 0;
  const pendingCertificates = stats?.pending_certificates || 0;
  const pendingModeration = stats?.pending_moderation || 0;
  const openSupport = stats?.open_support || 0;

  return (
    <div style={{ fontFamily: 'var(--font-sans)', background: 'var(--color-cream)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-black)' }}>Panel de administración</h1>
        {/* ADMIN badge — NEUTRAL, NOT green */}
        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full" style={{ background: 'var(--color-surface)', color: 'var(--color-stone)' }}>ADMIN</span>
      </div>
      <p className="text-sm mb-6" style={{ color: 'var(--color-stone)' }}>Gestión de tu mercado en una vista</p>

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
        <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--color-black)' }}>Cola de revisión</h2>
        <div className="space-y-2">
          <PendingRow label="Productores pendientes" count={pendingProducers} to="/admin/producers" />
          <PendingRow label="Verificaciones pendientes" count={stats?.pending_verifications || 0} to="/admin/verification" />
          <PendingRow label="Productos por revisar" count={pendingProducts} to="/admin/products" />
          <PendingRow label="Certificados" count={pendingCertificates} to="/admin/certificates" />
          <PendingRow label="Moderación de contenido" count={pendingModeration} to="/admin/moderation" />
          <PendingRow label="Soporte abierto" count={openSupport} to="/admin/support" />
          <PendingRow label="Reembolsos" count={stats?.refunded_orders || 0} to="/admin/refunds" />
        </div>
      </div>

      {/* Verification — blocked producers */}
      {(stats?.blocked_by_expired_cert || 0) > 0 && (
        <div className="mb-5">
          <Link
            to="/admin/verification"
            className="flex items-center gap-3 p-3.5 transition-all text-sm"
            style={{ borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-red)', background: 'var(--color-red-light)' }}
          >
            <span className="font-medium" style={{ color: 'var(--color-red)' }}>
              {stats.blocked_by_expired_cert} productor(es) bloqueados por certificado caducado
            </span>
            <ArrowRight className="w-4 h-4 ml-auto shrink-0" style={{ color: 'var(--color-red)' }} />
          </Link>
        </div>
      )}

      {/* B2B Operations */}
      <div className="mb-5">
        <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--color-black)' }}>Operaciones B2B</h2>
        <div className="space-y-2">
          <PendingRow label="Disputas B2B activas" count={stats?.b2b_disputes || 0} to="/b2b/operations" />
          <PendingRow label="Docs. vencidos" count={stats?.b2b_expired_docs || 0} to="/b2b/operations" />
        </div>
      </div>

      {/* Fiscal */}
      <div className="mb-5">
        <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--color-black)' }}>Fiscal</h2>
        <div className="space-y-2">
          <PendingRow label="Certificados pendientes de revisión" count={stats?.fiscal_pending_review || 0} to="/admin/fiscal" />
          <PendingRow label="Retenciones acumuladas YTD" count={0} to="/admin/fiscal" />
        </div>
        <Link
          to="/admin/fiscal"
          className="flex items-center justify-center gap-2 mt-3 py-2.5 text-sm font-semibold transition-colors"
          style={{ color: 'var(--color-black)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', background: 'var(--color-white)' }}
        >
          Gestión fiscal <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Quick actions */}
      <div className="mb-5">
        <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--color-black)' }}>Acciones rápidas</h2>
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
