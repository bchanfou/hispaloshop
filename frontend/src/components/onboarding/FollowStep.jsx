import React, { useEffect, useState } from 'react';
import { onboardingApi } from '../../lib/onboardingApi';

export default function FollowStep({ onBack, onComplete, onError }) {
  const [suggestions, setSuggestions] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadSuggestions = async () => {
      try {
        const data = await onboardingApi.getSuggestions(6);
        setSuggestions(data.suggestions || []);
      } catch (error) {
        onError?.('No hemos podido cargar sugerencias ahora mismo.');
      } finally {
        setLoading(false);
      }
    };

    loadSuggestions();
  }, [onError]);

  const toggleUser = (userId) => {
    setSelected((current) => (
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]
    ));
  };

  const handleFinish = async () => {
    if (suggestions.length > 0 && selected.length < 3) {
      onError?.('Sigue al menos 3 cuentas para completar el onboarding.');
      return;
    }

    setSaving(true);
    try {
      await onboardingApi.followUsers(selected);
      await onComplete?.();
    } catch (error) {
      onError?.(error?.response?.data?.detail || 'No hemos podido guardar las cuentas seguidas todavía.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-stone-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-stone-950">Sigue algunas cuentas</h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Elige al menos 3 productores o creadores para que tu feed inicial empiece con señales reales.
        </p>
      </div>

      {suggestions.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-6 text-center">
          <p className="text-stone-700">No hay sugerencias disponibles ahora mismo.</p>
          <p className="mt-2 text-sm text-stone-500">Puedes finalizar y empezar a descubrir cuentas más tarde.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {suggestions.map((user) => {
            const active = selected.includes(user.user_id);
            return (
              <button
                key={user.user_id}
                type="button"
                onClick={() => toggleUser(user.user_id)}
                className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-colors ${
                  active ? 'border-stone-950 bg-stone-100' : 'border-stone-200 bg-white hover:border-stone-300'
                }`}
              >
                <img src={user.picture || '/default-avatar.png'} alt={user.name} className="h-12 w-12 rounded-full object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-stone-950">{user.name}</p>
                  {user.username ? <p className="truncate text-sm text-stone-500">@{user.username}</p> : null}
                  {user.country ? <p className="mt-1 text-xs text-stone-500">Mercado: {user.country}</p> : null}
                  {user.followers_count > 0 ? <p className="mt-1 text-xs text-stone-500">{user.followers_count.toLocaleString()} seguidores</p> : null}
                </div>
                <div className={`h-6 w-6 rounded-full border-2 ${active ? 'border-stone-950 bg-stone-950' : 'border-stone-200 bg-white'}`} />
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <button type="button" onClick={onBack} className="px-2 py-2 text-sm font-medium text-stone-600 transition-colors hover:text-stone-950">
          Atrás
        </button>
        <button
          type="button"
          onClick={handleFinish}
          disabled={saving}
          className="rounded-full bg-stone-950 px-6 py-3 font-medium text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:bg-stone-300"
        >
          {saving ? 'Guardando...' : 'Finalizar'}
        </button>
      </div>
    </div>
  );
}
