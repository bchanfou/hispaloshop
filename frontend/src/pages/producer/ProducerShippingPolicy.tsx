// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../../services/api/client';

function toEuros(cents) {
  return (Number(cents || 0) / 100).toFixed(2);
}

function toCents(eurosText) {
  const value = parseFloat(String(eurosText || '0').replace(',', '.'));
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.round(value * 100));
}

export default function ProducerShippingPolicy() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [policy, setPolicy] = useState({
    enabled: false,
    base_cost_cents: 0,
    free_threshold_cents: null,
    per_item_cents: 0,
    local_pickup_enabled: false,
  });

  const preview = useMemo(() => {
    if (!policy.enabled) return 0;
    return (policy.base_cost_cents || 0) + (policy.per_item_cents || 0) * 3;
  }, [policy]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiClient.get('/producer/shipping/policy');
        setPolicy({
          enabled: !!res.enabled,
          base_cost_cents: res.base_cost_cents || 0,
          free_threshold_cents: res.free_threshold_cents ?? null,
          per_item_cents: res.per_item_cents || 0,
          local_pickup_enabled: !!res.local_pickup_enabled,
        });
      } catch (error) {
        toast.error(error.message || 'No se pudo cargar la política de envío');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const savePolicy = async () => {
    setSaving(true);
    try {
      const payload = {
        enabled: !!policy.enabled,
        base_cost_cents: Math.max(0, policy.base_cost_cents || 0),
        free_threshold_cents: policy.free_threshold_cents == null ? null : Math.max(0, Number(policy.free_threshold_cents) || 0),
        per_item_cents: Math.max(0, policy.per_item_cents || 0),
        local_pickup_enabled: !!policy.local_pickup_enabled,
      };
      await apiClient.put('/producer/shipping/policy', payload);
      toast.success('Política de envío guardada');
    } catch (error) {
      toast.error(error.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-10 text-center text-stone-500">Cargando...</div>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-950">Política de Envío</h1>
        <p className="text-sm text-stone-500 mt-1">Configura costes de envío por pedido para tus productos.</p>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-5">
        <label className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium text-stone-950">Habilitar gastos de envío</span>
          <input
            type="checkbox"
            checked={policy.enabled}
            onChange={(e) => setPolicy((prev) => ({ ...prev, enabled: e.target.checked }))}
            className="h-4 w-4 accent-stone-950"
          />
        </label>

        {policy.enabled && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-950 mb-1">Coste base (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={toEuros(policy.base_cost_cents)}
                  onChange={(e) => setPolicy((prev) => ({ ...prev, base_cost_cents: toCents(e.target.value) }))}
                  className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 focus:outline-none focus:border-stone-950"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-950 mb-1">Coste por ítem (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={toEuros(policy.per_item_cents)}
                  onChange={(e) => setPolicy((prev) => ({ ...prev, per_item_cents: toCents(e.target.value) }))}
                  className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 focus:outline-none focus:border-stone-950"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-950 mb-1">Pedido mínimo para envío gratis (€)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0 = sin envío gratis"
                value={policy.free_threshold_cents === null ? '' : toEuros(policy.free_threshold_cents)}
                onChange={(e) =>
                  setPolicy((prev) => ({
                    ...prev,
                    free_threshold_cents: e.target.value ? toCents(e.target.value) : null,
                  }))
                }
                className="w-full h-12 px-3 border border-stone-200 rounded-xl text-stone-950 focus:outline-none focus:border-stone-950"
              />
              <p className="text-xs text-stone-500 mt-1">Pedidos que superen este importe tendrán envío gratuito. Déjalo vacío o en 0 para desactivar.</p>
            </div>

            <div className="rounded-2xl bg-stone-50 border border-stone-200 p-3 text-sm text-stone-700">
              Ejemplo 3 ítems: €{toEuros(preview)} de envío (sin contar umbral de envío gratis).
            </div>
          </>
        )}

        {/* Local pickup */}
        <label className="flex items-center justify-between gap-4 pt-2 border-t border-stone-200">
          <div>
            <span className="text-sm font-medium text-stone-950">Recogida local disponible</span>
            <p className="text-xs text-stone-500 mt-0.5">Los clientes pueden recoger en tu obrador (sin coste de envío)</p>
          </div>
          <input
            type="checkbox"
            checked={policy.local_pickup_enabled}
            onChange={(e) => setPolicy((prev) => ({ ...prev, local_pickup_enabled: e.target.checked }))}
            className="h-4 w-4 accent-stone-950"
          />
        </label>

        <button onClick={savePolicy} disabled={saving} className="px-4 py-2 bg-stone-950 hover:bg-stone-800 disabled:opacity-50 text-white rounded-2xl transition-colors w-full md:w-auto">
          <Save className="w-4 h-4 mr-2 inline" />
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      {/* Plan shipping defaults info */}
      <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 text-xs text-stone-500 leading-relaxed">
        <strong className="text-stone-600">Referencia por plan:</strong> Free: base €5.90, sin envío gratis · Pro: base €3.90, gratis desde €30 · Elite: base €2.90, gratis desde €20. Tu configuración personalizada prevalece sobre estos valores.
      </div>
    </div>
  );
}
