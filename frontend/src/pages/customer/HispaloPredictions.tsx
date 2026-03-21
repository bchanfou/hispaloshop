// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  TrendingUp, ShoppingCart, Clock, AlertCircle,
  CheckCircle, ChevronRight, RefreshCw, Zap
} from 'lucide-react';
import apiClient from '../../services/api/client';

const STATUS_CONFIG = {
  overdue: { color: 'bg-stone-100 border-stone-200', text: 'text-stone-700', icon: AlertCircle, label: 'Vencido' },
  due:     { color: 'bg-stone-100 border-stone-200', text: 'text-stone-700', icon: Clock, label: 'Toca hoy' },
  soon:    { color: 'bg-stone-50 border-stone-200', text: 'text-stone-600', icon: TrendingUp, label: 'Pronto' },
  upcoming:{ color: 'bg-stone-50 border-stone-200', text: 'text-stone-500', icon: CheckCircle, label: 'Planificado' },
};

const CONFIDENCE_LABELS = { high: 'Alta', medium: 'Media', low: 'Baja' };

function PredictionCard({ prediction, onReorder, t }) {
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
      className={`rounded-2xl border p-4 ${config.color} transition-all hover:shadow-sm`}
      data-testid={`prediction-card-${prediction.product_id}`}
    >
      <div className="flex gap-3">
        {prediction.image ? (
          <img
            src={prediction.image}
            alt={prediction.product_name}
            className="w-14 h-14 rounded-2xl object-cover flex-shrink-0"
            onError={e => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div className="w-14 h-14 rounded-2xl bg-stone-200 flex items-center justify-center flex-shrink-0">
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
              className="h-full rounded-full transition-all duration-500 bg-stone-400"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-3 text-xs text-stone-500">
              <span>{t('predictions.purchased', { count: prediction.purchase_count })}</span>
              <span>~cada {prediction.avg_interval_days}d</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-stone-100 text-stone-700">
                {CONFIDENCE_LABELS[prediction.confidence]}
              </span>
            </div>
            <button
              className="h-7 px-2 text-xs flex items-center text-stone-600 hover:text-stone-950 hover:bg-stone-100 rounded transition-colors"
              onClick={() => onReorder(prediction.product_id)}
              data-testid={`reorder-predict-${prediction.product_id}`}
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Recomprar
            </button>
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
      const data = await apiClient.get('/customer/predictions');
      setPredictions(data.predictions || []);
      setSummary(data.summary || {});
    } catch (err) {
      // Sentry captures this automatically
    } finally {
      setLoading(false);
    }
  };

  const handleReorder = async (productId) => {
    setReordering(productId);
    try {
      await apiClient.post('/cart/add', {
        product_id: productId,
        quantity: 1,
      });
    } catch (err) {
      // Sentry captures this automatically
    } finally {
      setReordering(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-6 bg-stone-200 rounded w-48" />
        <div className="h-20 bg-stone-100 rounded-2xl" />
        <div className="h-20 bg-stone-100 rounded-2xl" />
      </div>
    );
  }

  if (predictions.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-6 text-center" data-testid="predictions-empty">
        <Zap className="w-10 h-10 text-stone-300 mx-auto mb-3" />
        <h3 className="font-semibold text-stone-700 mb-1">Hispalo Predict</h3>
        <p className="text-sm text-stone-500">
          {t('predict.empty', 'Compra algunos productos y te predeciremos cuándo necesitarás recomprarlos.')}
        </p>
      </div>
    );
  }

  const actionable = predictions.filter(p => ['overdue', 'due', 'soon'].includes(p.status));
  const overdueCount = predictions.filter(p => p.status === 'overdue').length;
  const totalCount = predictions.length;
  const avgConfidence = totalCount > 0
    ? Math.round(
        predictions.reduce((sum, p) => {
          const val = p.confidence === 'high' ? 90 : p.confidence === 'medium' ? 60 : 30;
          return sum + val;
        }, 0) / totalCount
      )
    : 0;

  return (
    <div className="space-y-4" data-testid="hispalo-predictions">
      {/* KPI row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-stone-200 p-3 text-center">
          <p className="text-xl font-bold text-stone-950">{overdueCount}</p>
          <p className="text-xs text-stone-500">Pendientes</p>
        </div>
        <div className="rounded-2xl border border-stone-200 p-3 text-center">
          <p className="text-xl font-bold text-stone-950">{totalCount}</p>
          <p className="text-xs text-stone-500">Total predicciones</p>
        </div>
        <div className="rounded-2xl border border-stone-200 p-3 text-center">
          <p className="text-xl font-bold text-stone-950">{avgConfidence}%</p>
          <p className="text-xs text-stone-500">Confianza media</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-2xl bg-stone-950 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-base text-stone-900">Hispalo Predict</h2>
            <p className="text-xs text-stone-500">{predictions.length} productos analizados</p>
          </div>
        </div>
        {actionable.length > 0 && (
          <span className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-700 text-xs font-semibold" data-testid="predictions-action-badge">
            {actionable.length} requieren accion
          </span>
        )}
      </div>

      {/* Summary pills */}
      <div className="flex gap-2 flex-wrap">
        {summary.overdue > 0 && (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-100 text-stone-700 text-xs font-medium">
            <AlertCircle className="w-3 h-3" /> {summary.overdue} vencidos
          </span>
        )}
        {summary.due > 0 && (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-100 text-stone-700 text-xs font-medium">
            <Clock className="w-3 h-3" /> {summary.due} para hoy
          </span>
        )}
        {summary.soon > 0 && (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-100 text-stone-700 text-xs font-medium">
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
            t={t}
          />
        ))}
      </div>
    </div>
  );
}
