// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../services/api/client';
import {
  FileCheck, Package, ShieldAlert, ShoppingBag, Users,
  TrendingUp, UserPlus, RotateCcw, HeadphonesIcon, Shield, ArrowRight, Clock
} from 'lucide-react';

function KPICard({ icon: Icon, title, value, description, to }) {
  const Wrapper = to ? Link : 'div';
  return (
    <Wrapper
      to={to}
      className="p-4 bg-white rounded-2xl border border-stone-200 transition-all hover:border-stone-300"
    >
      <div className="w-9 h-9 flex items-center justify-center rounded-2xl bg-stone-100 mb-3">
        <Icon className="w-4 h-4 text-stone-500" />
      </div>
      <p className="text-2xl font-extrabold tracking-tight text-stone-950">{value}</p>
      <p className="text-xs mt-0.5 text-stone-500">{title}</p>
      {description && <p className="text-[11px] mt-0.5 text-stone-400">{description}</p>}
    </Wrapper>
  );
}

function PendingRow({ label, count, to }) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-stone-200 transition-all hover:border-stone-300 text-sm"
    >
      <span className="font-medium text-stone-700">{label}</span>
      <div className="flex items-center gap-2">
        {count > 0 && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center bg-stone-100 text-stone-950">
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
      className="flex items-center gap-3 p-3.5 bg-white rounded-2xl border border-stone-200 transition-all hover:border-stone-300 text-sm font-semibold text-stone-950"
    >
      <Icon className="w-5 h-5 shrink-0 text-stone-500" />
      {label}
    </Link>
  );
}

export default function AdminOverview() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fiscalStats, setFiscalStats] = useState(null);

  useEffect(() => {
    let active = true;
    apiClient.get('/admin/stats').then(data => {
      if (active) setStats(data || {});
    }).catch(() => {
      if (active) setStats({});
    }).finally(() => {
      if (active) setLoading(false);
    });
    apiClient.get('/admin/tax/fiscal-stats').then(data => {
      if (active) setFiscalStats(data || {});
    }).catch(() => {
      if (active) setFiscalStats({});
    });
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <div className="bg-stone-50 min-h-full p-6 space-y-6" aria-busy="true" aria-label="Cargando panel de administración">
        <div className="space-y-2">
          <div className="h-7 w-48 animate-pulse rounded-full bg-stone-200" />
          <div className="h-4 w-72 animate-pulse rounded-full bg-stone-100" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="rounded-2xl bg-white p-5 space-y-3">
              <div className="h-4 w-20 animate-pulse rounded-full bg-stone-100" />
              <div className="h-8 w-16 animate-pulse rounded-full bg-stone-100" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2].map(i => (
            <div key={i} className="rounded-2xl bg-white p-5 space-y-3">
              <div className="h-4 w-32 animate-pulse rounded-full bg-stone-100" />
              <div className="h-24 w-full animate-pulse rounded-2xl bg-stone-50" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const pendingProducers = stats?.pending_producers || 0;
  const pendingProducts = stats?.pending_products || 0;
  const pendingCertificates = stats?.pending_certificates || 0;
  const pendingModeration = stats?.pending_moderation || 0;
  const openSupport = stats?.open_support || 0;

  return (
    <div className="bg-stone-50 min-h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <h1 className="text-2xl font-bold text-stone-950">Panel de administración</h1>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-stone-100 text-stone-500">ADMIN</span>
      </div>
      <p className="text-sm mb-6 text-stone-500">Gestión de tu mercado en una vista</p>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <KPICard
          icon={TrendingUp}
          value={new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(stats?.gmv_month || 0)}
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
        <h2 className="text-sm font-bold mb-3 text-stone-950">Cola de revisión</h2>
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

      {/* Certificate expiry queue */}
      <div className="mb-5">
        <h2 className="text-sm font-bold mb-3 text-stone-950">Certificados por expirar</h2>
        <div className="space-y-2">
          {(stats?.expiring_certificates || 0) > 0 ? (
            <Link
              to="/admin/certificates"
              className="flex items-center justify-between p-3.5 bg-amber-50 rounded-2xl border border-amber-200 transition-all hover:border-amber-300 text-sm"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <span className="font-medium text-amber-800">Certificados que expiran en 30 días</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center bg-amber-100 text-amber-800">
                  {stats.expiring_certificates}
                </span>
                <ArrowRight className="w-4 h-4 text-amber-600" />
              </div>
            </Link>
          ) : (
            <div className="flex items-center gap-2 p-3.5 bg-white rounded-2xl border border-stone-200 text-sm">
              <Clock className="w-4 h-4 text-stone-400" />
              <span className="text-stone-500">No hay certificados próximos a expirar</span>
            </div>
          )}
        </div>
      </div>

      {/* Blocked producers alert */}
      {(stats?.blocked_by_expired_cert || 0) > 0 && (
        <div className="mb-5">
          <Link
            to="/admin/verification"
            className="flex items-center gap-3 p-3.5 bg-stone-100 rounded-2xl border border-stone-200 transition-all hover:border-stone-300 text-sm"
          >
            <span className="font-medium text-stone-950">
              {stats.blocked_by_expired_cert} productor(es) bloqueados por certificado caducado
            </span>
            <ArrowRight className="w-4 h-4 ml-auto shrink-0 text-stone-950" />
          </Link>
        </div>
      )}

      {/* B2B Operations */}
      <div className="mb-5">
        <h2 className="text-sm font-bold mb-3 text-stone-950">Operaciones B2B</h2>
        <div className="space-y-2">
          <PendingRow label="Disputas B2B activas" count={stats?.b2b_disputes || 0} to="/b2b/operations" />
          <PendingRow label="Docs. vencidos" count={stats?.b2b_expired_docs || 0} to="/b2b/operations" />
        </div>
      </div>

      {/* Fiscal */}
      <div className="mb-5">
        <h2 className="text-sm font-bold mb-3 text-stone-950">Fiscal</h2>
        <div className="space-y-2">
          <PendingRow label="Certificados pendientes de revisión" count={stats?.fiscal_pending_review || 0} to="/admin/fiscal" />
          <PendingRow
            label={`Retenciones YTD${fiscalStats === null ? '' : `: ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format((fiscalStats?.total_withheld_ytd_cents || 0) / 100)}`}`}
            count={0}
            to="/admin/fiscal"
          />
        </div>
        <Link
          to="/admin/fiscal"
          className="flex items-center justify-center gap-2 mt-3 py-2.5 text-sm font-semibold bg-white rounded-2xl border border-stone-200 text-stone-950 hover:border-stone-300 transition-colors"
        >
          Gestión fiscal <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Quick actions */}
      <div className="mb-5">
        <h2 className="text-sm font-bold mb-3 text-stone-950">Acciones rápidas</h2>
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
