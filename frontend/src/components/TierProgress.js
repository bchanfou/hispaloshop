import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { TrendingUp, Users, DollarSign, RefreshCw, Loader2, Award, Zap, Crown } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { API } from '../utils/api';

function ProgressBar({ current, target, label, color = '#2D5A27' }) {
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  return (
    <div data-testid={`progress-${label}`}>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-text-secondary">{label}</span>
        <span className="text-text-muted">{current} / {target}</span>
      </div>
      <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export default function TierProgress() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchTier(); }, []);

  const fetchTier = async () => {
    try {
      const res = await axios.get(`${API}/influencers/me/tier`, { withCredentials: true });
      setData(res.data);
    } catch (err) {
      if (err.response?.status !== 404) toast.error('Error cargando tier');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-text-muted" /></div>;
  if (!data) return null;

  const tierIcons = { HERCULES: Award, ATENEA: Zap, TITAN: Crown };
  const tierColors = { HERCULES: '#6b7280', ATENEA: '#2D5A27', TITAN: '#d97706' };
  const Icon = tierIcons[data.current_tier] || Award;
  const color = tierColors[data.current_tier] || '#6b7280';

  return (
    <div className="space-y-4" data-testid="tier-progress">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-bold text-text-primary">Mi Tier</h2>
        <Button variant="ghost" size="sm" onClick={() => { setLoading(true); fetchTier(); }}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Current tier card */}
      <div className="bg-white rounded-xl border border-stone-200 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${color}15` }}>
            <Icon className="w-6 h-6" style={{ color }} />
          </div>
          <div>
            <span className="font-heading text-xl font-bold" style={{ color }}>{data.current_tier}</span>
            <p className="text-sm text-text-muted">Comision: {(data.commission_rate * 100).toFixed(0)}% por venta</p>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="text-center p-3 bg-stone-50 rounded-lg">
            <Users className="w-4 h-4 mx-auto text-text-muted mb-1" />
            <p className="text-lg font-bold text-text-primary">{data.metrics?.unique_customers || 0}</p>
            <p className="text-[10px] text-text-muted uppercase">Clientes</p>
          </div>
          <div className="text-center p-3 bg-stone-50 rounded-lg">
            <DollarSign className="w-4 h-4 mx-auto text-text-muted mb-1" />
            <p className="text-lg font-bold text-text-primary">${(data.metrics?.net_gmv || 0).toLocaleString()}</p>
            <p className="text-[10px] text-text-muted uppercase">Ventas generadas</p>
          </div>
          <div className="text-center p-3 bg-stone-50 rounded-lg">
            <TrendingUp className="w-4 h-4 mx-auto text-text-muted mb-1" />
            <p className="text-lg font-bold text-text-primary">{((data.metrics?.repurchase_rate || 0) * 100).toFixed(0)}%</p>
            <p className="text-[10px] text-text-muted uppercase">Clientes que repiten</p>
          </div>
        </div>

        {/* Progress to next tier */}
        {data.progress?.next_tier && (
          <div>
            <p className="text-xs text-text-muted mb-3 uppercase tracking-wider">
              Progreso hacia {data.progress.next_tier}
            </p>
            <div className="space-y-3">
              <ProgressBar
                label="Clientes referidos"
                current={data.progress.customers.current}
                target={data.progress.customers.needed}
                color={color}
              />
              <ProgressBar
                label="Ventas generadas"
                current={data.progress.gmv.current}
                target={data.progress.gmv.needed}
                color={color}
              />
              <ProgressBar
                label="Clientes que repiten"
                current={data.progress.repurchase.current}
                target={data.progress.repurchase.needed}
                color={color}
              />
            </div>
          </div>
        )}

        {data.next_review_date && (
          <p className="text-xs text-text-muted mt-4">
            Proxima revision: {new Date(data.next_review_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        )}
      </div>

      {/* Earnings summary */}
      <div className="bg-white rounded-xl border border-stone-200 p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-text-muted uppercase tracking-wider">Ganancias totales</p>
          <p className="text-xl font-bold text-emerald-600">${(data.total_earnings || 0).toFixed(2)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-text-muted uppercase tracking-wider">Pendiente de pago</p>
          <p className="text-xl font-bold text-text-primary">${(data.pending_payout || 0).toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}
