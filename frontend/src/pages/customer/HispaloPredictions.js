import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { 
  TrendingUp, ShoppingCart, Clock, AlertCircle, 
  CheckCircle, ChevronRight, RefreshCw, Zap
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { API } from '../../utils/api';

const STATUS_CONFIG = {
  overdue: { color: 'bg-red-50 border-red-200', text: 'text-red-700', icon: AlertCircle, label: 'Vencido' },
  due:     { color: 'bg-amber-50 border-amber-200', text: 'text-amber-700', icon: Clock, label: 'Toca hoy' },
  soon:    { color: 'bg-blue-50 border-blue-200', text: 'text-blue-700', icon: TrendingUp, label: 'Pronto' },
  upcoming:{ color: 'bg-stone-50 border-stone-200', text: 'text-stone-500', icon: CheckCircle, label: 'Planificado' },
};

const CONFIDENCE_LABELS = { high: 'Alta', medium: 'Media', low: 'Baja' };

function PredictionCard({ prediction, onReorder }) {
  const config = STATUS_CONFIG[prediction.status] || STATUS_CONFIG.upcoming;
  const StatusIcon = config.icon;
  const daysAbs = Math.abs(prediction.days_until_next);

  let timeLabel;
  if (prediction.status === 'overdue') {
    timeLabel = `Hace ${daysAbs} ${daysAbs === 1 ? 'dia' : 'dias'}`;
  } else if (prediction.status === 'due') {
    timeLabel = 'Hoy';
  } else {
    timeLabel = `En ${daysAbs} ${daysAbs === 1 ? 'dia' : 'dias'}`;
  }

  const progressMax = prediction.avg_interval_days;
  const elapsed = progressMax - prediction.days_until_next;
  const progressPct = Math.min(Math.max((elapsed / progressMax) * 100, 0), 100);

  return (
    <div 
      className={`rounded-xl border p-4 ${config.color} transition-all hover:shadow-sm`}
      data-testid={`prediction-card-${prediction.product_id}`}
    >
      <div className="flex gap-3">
        {prediction.image ? (
          <img 
            src={prediction.image} 
            alt={prediction.product_name}
            className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
            onError={e => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div className="w-14 h-14 rounded-lg bg-stone-200 flex items-center justify-center flex-shrink-0">
            <ShoppingCart className="w-6 h-6 text-stone-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-sm text-stone-900 truncate">{prediction.product_name}</h3>
            <span className={`flex items-center gap-1 text-xs font-semibold whitespace-nowrap ${config.text}`}>
              <StatusIcon className="w-3.5 h-3.5" />
              {timeLabel}
            </span>
          </div>
          
          {/* Progress bar */}
          <div className="mt-2 h-1.5 rounded-full bg-white/60 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                prediction.status === 'overdue' ? 'bg-red-400' :
                prediction.status === 'due' ? 'bg-amber-400' :
                prediction.status === 'soon' ? 'bg-blue-400' : 'bg-stone-300'
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-3 text-xs text-stone-500">
              <span>{t('predictions.purchased', { count: prediction.purchase_count })}</span>
              <span>~cada {prediction.avg_interval_days}d</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                prediction.confidence === 'high' ? 'bg-green-100 text-green-700' :
                prediction.confidence === 'medium' ? 'bg-amber-100 text-amber-700' :
                'bg-stone-100 text-stone-500'
              }`}>
                {CONFIDENCE_LABELS[prediction.confidence]}
              </span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={() => onReorder(prediction.product_id)}
              data-testid={`reorder-predict-${prediction.product_id}`}
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Recomprar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HispaloPredictions() {
  const { t } = useTranslation();
  const [predictions, setPredictions] = useState([]);
  const [summary, setSummary] = useState({ total: 0, overdue: 0, due: 0, soon: 0 });
  const [loading, setLoading] = useState(true);
  const [reordering, setReordering] = useState(null);

  useEffect(() => {
    fetchPredictions();
  }, []);

  const fetchPredictions = async () => {
    try {
      const res = await axios.get(`${API}/customer/predictions`, { withCredentials: true });
      setPredictions(res.data.predictions || []);
      setSummary(res.data.summary || {});
    } catch (err) {
      console.error('Error fetching predictions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReorder = async (productId) => {
    setReordering(productId);
    try {
      await axios.post(`${API}/cart/add`, {
        product_id: productId,
        quantity: 1,
      }, { withCredentials: true });
    } catch (err) {
      console.error('Reorder error:', err);
    } finally {
      setReordering(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-6 bg-stone-200 rounded w-48" />
        <div className="h-20 bg-stone-100 rounded-xl" />
        <div className="h-20 bg-stone-100 rounded-xl" />
      </div>
    );
  }

  if (predictions.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-6 text-center" data-testid="predictions-empty">
        <Zap className="w-10 h-10 text-stone-300 mx-auto mb-3" />
        <h3 className="font-heading font-semibold text-stone-700 mb-1">Hispalo Predict</h3>
        <p className="text-sm text-stone-500">
          {t('predict.empty', 'Compra algunos productos y te predeciremos cuando necesitaras recomprarlos.')}
        </p>
      </div>
    );
  }

  const actionable = predictions.filter(p => ['overdue', 'due', 'soon'].includes(p.status));

  return (
    <div className="space-y-4" data-testid="hispalo-predictions">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-stone-900 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-base text-stone-900">Hispalo Predict</h2>
            <p className="text-xs text-stone-500">{predictions.length} productos analizados</p>
          </div>
        </div>
        {actionable.length > 0 && (
          <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-semibold" data-testid="predictions-action-badge">
            {actionable.length} requieren accion
          </span>
        )}
      </div>

      {/* Summary pills */}
      <div className="flex gap-2 flex-wrap">
        {summary.overdue > 0 && (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-medium">
            <AlertCircle className="w-3 h-3" /> {summary.overdue} vencidos
          </span>
        )}
        {summary.due > 0 && (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">
            <Clock className="w-3 h-3" /> {summary.due} para hoy
          </span>
        )}
        {summary.soon > 0 && (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
            <TrendingUp className="w-3 h-3" /> {summary.soon} pronto
          </span>
        )}
      </div>

      {/* Prediction cards */}
      <div className="space-y-2">
        {predictions.map(p => (
          <PredictionCard 
            key={p.product_id} 
            prediction={p} 
            onReorder={handleReorder}
          />
        ))}
      </div>
    </div>
  );
}
