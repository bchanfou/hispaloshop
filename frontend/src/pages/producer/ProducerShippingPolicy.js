import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { API } from '../../utils/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

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
  });

  const preview = useMemo(() => {
    const itemCount = 3;
    if (!policy.enabled) return 0;
    if (policy.free_threshold_cents && policy.free_threshold_cents <= 6000) return 0;
    return (policy.base_cost_cents || 0) + (policy.per_item_cents || 0) * itemCount;
  }, [policy]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`${API}/producer/shipping/policy`, { withCredentials: true });
        setPolicy({
          enabled: !!res.data.enabled,
          base_cost_cents: res.data.base_cost_cents || 0,
          free_threshold_cents: res.data.free_threshold_cents ?? null,
          per_item_cents: res.data.per_item_cents || 0,
        });
      } catch (error) {
        toast.error(error.response?.data?.detail || 'No se pudo cargar la política de envío');
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
        free_threshold_cents: policy.free_threshold_cents === null ? null : Math.max(0, policy.free_threshold_cents),
        per_item_cents: Math.max(0, policy.per_item_cents || 0),
      };
      await axios.put(`${API}/producer/shipping/policy`, payload, { withCredentials: true });
      toast.success('Política de envío guardada');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-10 text-center text-text-muted">Cargando...</div>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-text-primary">Política de Envío</h1>
        <p className="text-sm text-text-muted mt-1">Configura costes de envío por pedido para tus productos.</p>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-5">
        <label className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium text-text-primary">Habilitar gastos de envío</span>
          <input
            type="checkbox"
            checked={policy.enabled}
            onChange={(e) => setPolicy((prev) => ({ ...prev, enabled: e.target.checked }))}
            className="h-4 w-4"
          />
        </label>

        {policy.enabled && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Coste base (€)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={toEuros(policy.base_cost_cents)}
                  onChange={(e) => setPolicy((prev) => ({ ...prev, base_cost_cents: toCents(e.target.value) }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Coste por ítem (€)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={toEuros(policy.per_item_cents)}
                  onChange={(e) => setPolicy((prev) => ({ ...prev, per_item_cents: toCents(e.target.value) }))}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Umbral de envío gratis (€)</label>
              <Input
                type="number"
                step="0.01"
                placeholder="Vacío = sin envío gratis"
                value={policy.free_threshold_cents === null ? '' : toEuros(policy.free_threshold_cents)}
                onChange={(e) =>
                  setPolicy((prev) => ({
                    ...prev,
                    free_threshold_cents: e.target.value ? toCents(e.target.value) : null,
                  }))
                }
              />
            </div>

            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-900">
              Ejemplo 3 ítems: €{toEuros(preview)} de envío.
            </div>
          </>
        )}

        <Button onClick={savePolicy} disabled={saving} className="w-full md:w-auto">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    </div>
  );
}

