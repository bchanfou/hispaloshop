// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Globe, Save, ArrowLeft, Loader2, Plus, Trash2, Package, Clock, CheckCircle, AlertTriangle, Warehouse } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import apiClient from '../../services/api/client';
import { DashboardStatsSkeleton } from '../../components/Skeleton';
const COUNTRIES = {
  ES: {
    name: "España",
    currency: 'EUR'
  },
  US: {
    name: 'Estados Unidos',
    currency: 'USD'
  },
  DE: {
    name: 'Alemania',
    currency: 'EUR'
  },
  FR: {
    name: 'Francia',
    currency: 'EUR'
  },
  IT: {
    name: 'Italia',
    currency: 'EUR'
  },
  PT: {
    name: 'Portugal',
    currency: 'EUR'
  },
  GB: {
    name: 'Reino Unido',
    currency: 'GBP'
  },
  KR: {
    name: 'Corea del Sur',
    currency: 'KRW'
  },
  JP: {
    name: 'Japón',
    currency: 'JPY'
  },
  CA: {
    name: "Canadá",
    currency: 'CAD'
  },
  MX: {
    name: "México",
    currency: 'MXN'
  },
  BR: {
    name: 'Brasil',
    currency: 'BRL'
  },
  AU: {
    name: 'Australia',
    currency: 'AUD'
  }
};
const normalizeEntityId = value => value == null ? '' : String(value);
function MarketRow({
  market,
  onChange,
  onRemove
}) {
  const country = COUNTRIES[market.country_code] || {
    name: market.country_code,
    currency: 'EUR'
  };
  const isValid = market.active ? market.stock > 0 && market.delivery_sla_hours <= 48 && market.price > 0 : true;
  return <div className={`bg-white rounded-2xl border p-4 transition-all ${market.active ? isValid ? 'border-stone-400 bg-stone-50' : 'border-stone-200 bg-stone-50' : 'border-stone-200'}`} data-testid={`market-${market.country_code}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-stone-950">{market.country_code}</span>
          <span className="text-sm text-stone-600">{country.name}</span>
          {market.active && isValid && <CheckCircle className="w-4 h-4 text-stone-950" />}
          {market.active && !isValid && <AlertTriangle className="w-4 h-4 text-stone-500" />}
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={market.active} onChange={e => onChange({
            ...market,
            active: e.target.checked
          })} className="w-4 h-4 accent-stone-950" data-testid={`toggle-${market.country_code}`} />
            <span className="text-xs font-medium text-stone-600">
              {market.active ? 'Activo' : 'Inactivo'}
            </span>
          </label>
          <button onClick={onRemove} className="p-1 hover:bg-stone-50 rounded text-stone-400 hover:text-stone-600" data-testid={`remove-${market.country_code}`}>
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {market.active && <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-[11px] text-stone-500 uppercase tracking-wider block mb-1">Precio ({country.currency})</label>
            <input type="number" step="0.01" min="0" value={market.price || ''} onChange={e => onChange({
          ...market,
          price: parseFloat(e.target.value) || 0
        })} className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 focus:outline-none focus:border-stone-950" placeholder="0.00" data-testid={`price-${market.country_code}`} />
          </div>
          <div>
            <label className="text-[11px] text-stone-500 uppercase tracking-wider block mb-1">Stock</label>
            <input type="number" min="0" value={market.stock || ''} onChange={e => onChange({
          ...market,
          stock: parseInt(e.target.value) || 0
        })} className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 focus:outline-none focus:border-stone-950" placeholder="0" data-testid={`stock-${market.country_code}`} />
          </div>
          <div>
            <label className="text-[11px] text-stone-500 uppercase tracking-wider block mb-1">SLA entrega (h)</label>
            <input type="number" min="1" max="48" value={market.delivery_sla_hours || ''} onChange={e => onChange({
          ...market,
          delivery_sla_hours: Math.min(48, parseInt(e.target.value) || 48)
        })} className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 focus:outline-none focus:border-stone-950" placeholder="48" data-testid={`sla-${market.country_code}`} />
          </div>
          <div>
            <label className="text-[11px] text-stone-500 uppercase tracking-wider block mb-1">Almacen</label>
            <input type="text" value={market.warehouse_id || ''} onChange={e => onChange({
          ...market,
          warehouse_id: e.target.value
        })} className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 focus:outline-none focus:border-stone-950" placeholder="wh_..." />
          </div>
        </div>}

      {market.active && !isValid && <div className="mt-2 text-xs text-stone-500 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          {market.stock <= 0 && 'Stock debe ser > 0. '}
          {market.delivery_sla_hours > 48 && 'SLA max 48h. '}
          {market.price <= 0 && 'Precio requerido. '}
        </div>}
    </div>;
}
export default function ProductCountryManagement() {
  const {
    t
  } = useTranslation();
  const {
    productId
  } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addCountry, setAddCountry] = useState('');
  useEffect(() => {
    fetchData();
  }, [productId]);
  const fetchData = async () => {
    try {
      const [marketsData, productsData] = await Promise.all([apiClient.get(`/producer/products/${productId}/markets`), apiClient.get('/producer/products')]);
      setMarkets(marketsData || []);
      setProduct((productsData || []).find(p => normalizeEntityId(p.product_id || p.id) === normalizeEntityId(productId)) || null);
    } catch (err) {
      toast.error('Error cargando mercados');
    } finally {
      setLoading(false);
    }
  };
  const handleAddCountry = () => {
    if (!addCountry || markets.some(m => m.country_code === addCountry)) return;
    const c = COUNTRIES[addCountry] || {
      currency: 'EUR'
    };
    setMarkets(prev => [...prev, {
      country_code: addCountry,
      stock: 0,
      warehouse_id: '',
      delivery_sla_hours: 48,
      active: false,
      price: product?.price || 0,
      currency: c.currency
    }]);
    setAddCountry('');
  };
  const handleUpdateMarket = (idx, updated) => {
    setMarkets(prev => prev.map((m, i) => i === idx ? {
      ...m,
      ...updated
    } : m));
  };
  const handleRemoveMarket = idx => {
    setMarkets(prev => prev.filter((_, i) => i !== idx));
  };
  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.put(`/producer/products/${productId}/markets`, {
        markets
      });
      toast.success('Mercados actualizados');
    } catch (err) {
      toast.error(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };
  const activeCount = markets.filter(m => m.active).length;
  const usedCodes = new Set(markets.map(m => m.country_code));
  const availableCodes = Object.keys(COUNTRIES).filter(c => !usedCodes.has(c));
  if (loading) return <div className="p-4"><DashboardStatsSkeleton /></div>;
  return <div className="space-y-5" data-testid="market-management-page">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => navigate('/producer/products')} className="p-1 hover:bg-stone-100 rounded-2xl text-stone-600">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-stone-950" data-testid="markets-title">
            Mercados Activos
          </h1>
          <p className="text-sm text-stone-500">
            {product?.name} — {activeCount} mercado{activeCount !== 1 ? 's' : ''} activo{activeCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 text-sm text-stone-700 flex items-start gap-3">
        <Warehouse className="w-5 h-5 text-stone-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium mb-1">{t('product_country_management.reglasDeActivacionPorMercado', 'Reglas de activación por mercado:')}</p>
          <ul className="text-xs space-y-0.5 text-stone-600">
            <li>{t('producer.stockRequired')}</li>
            <li>SLA de entrega maximo 48 horas</li>
            <li>{t('producer.priceRequired')}</li>
          </ul>
        </div>
      </div>

      {/* Add country */}
      {availableCodes.length > 0 && <div className="flex items-center gap-2">
          <select value={addCountry} onChange={e => setAddCountry(e.target.value)} className="text-sm border border-stone-200 rounded-2xl px-3 py-2 bg-white" data-testid="add-country-select">
            <option value="">{t('producer.addMarket')}</option>
            {availableCodes.map(code => <option key={code} value={code}>{code} — {COUNTRIES[code].name}</option>)}
          </select>
          <button onClick={handleAddCountry} disabled={!addCountry} className="px-4 py-2 border border-stone-200 text-stone-600 rounded-2xl hover:bg-stone-50 transition-colors disabled:opacity-50" data-testid="add-country-btn">
            <Plus className="w-4 h-4 mr-1 inline" /> Agregar
          </button>
        </div>}

      {/* Markets list */}
      <div className="space-y-3" data-testid="markets-list">
        {markets.length === 0 ? <div className="text-center py-12 text-stone-500 text-sm">
            <Globe className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>{t('producer.noMarkets')}</p>
          </div> : markets.map((m, idx) => <MarketRow key={m.country_code} market={m} onChange={updated => handleUpdateMarket(idx, updated)} onRemove={() => handleRemoveMarket(idx)} />)}
      </div>

      {/* Save */}
      {markets.length > 0 && <div className="flex justify-end gap-3 pt-2">
          <button onClick={() => navigate('/producer/products')} className="px-4 py-2 border border-stone-200 text-stone-600 rounded-2xl hover:bg-stone-50 transition-colors">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-stone-950 hover:bg-stone-800 disabled:opacity-50 text-white rounded-2xl transition-colors" data-testid="save-markets-btn">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5 inline" /> : <Save className="w-4 h-4 mr-1.5 inline" />}
            Guardar mercados
          </button>
        </div>}
    </div>;
}