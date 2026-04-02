// @ts-nocheck
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import apiClient from '../../services/api/client';
import {
  Globe, Package, Users, Clock, AlertTriangle,
  Loader2, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { useLocale } from '../../context/LocaleContext';
import { useTranslation } from 'react-i18next';

// ALL_COUNTRIES and COUNTRY_META now derived from LocaleContext (135 countries)

function SACard({ children, className = '' }) {
  return (
    <div className={`bg-[#1A1D27] rounded-[14px] border border-white/[0.08] p-5 ${className}`}>
      {children}
    </div>
  );
}

function ToggleSwitch({ active, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="relative w-[50px] h-7 rounded-full shrink-0 transition-colors disabled:opacity-50"
      style={{ background: active ? '#0c0a09' : '#3A3A3C' }}
    >
      <div
        className="absolute top-[3px] w-[22px] h-[22px] rounded-full bg-white transition-all shadow"
        style={{ left: active ? 26 : 3 }}
      />
    </button>
  );
}

export default function MarketCoverage() {
  const { countries: ctxCountries } = useLocale();
  const [marketData, setMarketData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(null);

  // Derive ALL_COUNTRIES and COUNTRY_META from backend (135 countries)
  const ALL_COUNTRIES = useMemo(() =>
    Object.entries(ctxCountries || {}).map(([code, data]) => ({
      code, name: data.name || code, flag: data.flag || '',
    })),
    [ctxCountries]
  );
  const COUNTRY_META = useMemo(() => {
    const meta = {};
    Object.entries(ctxCountries || {}).forEach(([code, data]) => {
      meta[code] = { currency: data.currency || 'EUR', lang: (data.languages || ['en'])[0] };
    });
    return meta;
  }, [ctxCountries]);

  const fetchData = useCallback(async () => {
    try {
      const data = await apiClient.get('/admin/market-coverage');
      setMarketData(data);
    } catch {
      setMarketData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const coverage = Array.isArray(marketData?.coverage) ? marketData.coverage : [];
  const activeCountryCodes = new Set(coverage.map(c => c.country_code));

  const totalProducts = coverage.reduce((s, c) => s + (c.active_products || 0), 0);
  const totalSellers = coverage.reduce((s, c) => s + (c.active_sellers || 0), 0);
  const totalStock = coverage.reduce((s, c) => s + (c.total_stock || 0), 0);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-white/30" />
      </div>
    );
  }

  return (
    <div className="max-w-[800px] mx-auto pb-16">
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white mb-1">Mercados</h1>
          <p className="text-sm text-white/40">
            Activa un país para que los vendedores locales puedan registrarse.
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); fetchData(); }}
          className="px-3 py-2 bg-white/[0.08] rounded-2xl text-white/60 hover:bg-white/[0.12] transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { icon: Globe, label: 'Mercados activos', value: coverage.length },
          { icon: Package, label: 'Productos activos', value: totalProducts },
          { icon: Users, label: 'Vendedores', value: totalSellers },
          { icon: Clock, label: 'Stock global', value: totalStock.toLocaleString() },
        ].map(stat => (
          <SACard key={stat.label} className="!p-4">
            <stat.icon className="w-4 h-4 text-white/30 mb-2" />
            <p className="text-xl font-extrabold text-white">{stat.value}</p>
            <p className="text-[10px] text-white/30">{stat.label}</p>
          </SACard>
        ))}
      </div>

      {/* Migration alert */}
      {marketData?.products_without_inventory > 0 && (
        <div className="bg-[#78716c]/10 border border-[#78716c]/20 rounded-2xl p-3.5 flex items-center gap-3 mb-5">
          <AlertTriangle className="w-4 h-4 text-[#78716c] shrink-0" />
          <p className="text-xs text-[#78716c]">
            {marketData.products_without_inventory} productos sin inventory_by_country
          </p>
        </div>
      )}

      {/* Countries list with toggles */}
      <SACard>
        {ALL_COUNTRIES.map((country, i) => {
          const isActive = activeCountryCodes.has(country.code);
          const countryData = coverage.find(c => c.country_code === country.code);

          return (
            <div
              key={country.code}
              className={`flex items-center gap-3.5 py-3.5 ${i < ALL_COUNTRIES.length - 1 ? 'border-b border-white/[0.06]' : ''}`}
            >
              <span className="text-xl">{country.flag}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">{country.name}</p>
                {isActive && countryData ? (
                  <p className="text-xs text-white/35">
                    {countryData.active_sellers || 0} vendedores · {countryData.active_products || 0} productos · {(countryData.total_stock || 0).toLocaleString()} stock
                  </p>
                ) : (
                  <p className="text-xs text-white/20">Inactivo</p>
                )}
              </div>
              {isActive && countryData && (
                <span className="text-[11px] text-white/30">
                  SLA {countryData.avg_sla_hours || '—'}h
                </span>
              )}
              <ToggleSwitch
                active={isActive}
                disabled={activating === country.code}
                onClick={() => {
                  // Toggle is informational — actual activation is done via inventory
                  toast.info(isActive
                    ? `${country.name}: mercado activo con ${countryData?.active_products || 0} productos`
                    : `${country.name}: sin productos con inventario en este país`
                  );
                }}
              />
            </div>
          );
        })}
      </SACard>

      {/* Active market details table */}
      {coverage.length > 0 && (
        <SACard className="mt-4">
          <h3 className="text-[15px] font-bold text-white mb-4">Detalle de mercados activos</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/30 text-[11px] uppercase tracking-wider">
                  <th className="text-left py-2 pr-3">País</th>
                  <th className="text-right py-2 px-2">Prods</th>
                  <th className="text-right py-2 px-2">Sellers</th>
                  <th className="text-right py-2 px-2">Stock</th>
                  <th className="text-right py-2 px-2">SLA</th>
                  <th className="text-right py-2 px-2">Sin stock</th>
                  <th className="text-right py-2 px-2">Moneda</th>
                  <th className="text-right py-2 px-2">Idioma</th>
                  <th className="text-right py-2 pl-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {coverage.map(c => {
                  const info = ALL_COUNTRIES.find(ac => ac.code === c.country_code);
                  const meta = COUNTRY_META[c.country_code] || {};
                  const isReady = (c.active_products || 0) >= 5 && (c.active_sellers || 0) >= 1;
                  return (
                    <tr key={c.country_code} className="border-t border-white/[0.06]">
                      <td className="py-2.5 pr-3 text-white font-medium">
                        {info?.flag || ''} {c.country_code}
                      </td>
                      <td className="text-right py-2.5 px-2 text-white/60">{c.active_products}</td>
                      <td className="text-right py-2.5 px-2 text-white/60">{c.active_sellers}</td>
                      <td className="text-right py-2.5 px-2 text-white/60">{(c.total_stock || 0).toLocaleString()}</td>
                      <td className="text-right py-2.5 px-2 text-white/60">{c.avg_sla_hours}h</td>
                      <td className="text-right py-2.5 px-2">
                        <span className={c.out_of_stock > 0 ? 'text-[#78716c] font-bold' : 'text-white/30'}>
                          {c.out_of_stock}
                        </span>
                      </td>
                      <td className="text-right py-2.5 px-2 text-white/60 font-mono text-[11px]">{meta.currency || '—'}</td>
                      <td className="text-right py-2.5 px-2 text-white/60 font-mono text-[11px]">{meta.lang || '—'}</td>
                      <td className="text-right py-2.5 pl-2">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${isReady ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-500'}`}>
                          {isReady ? 'Listo' : 'Insuficiente'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SACard>
      )}
    </div>
  );
}
