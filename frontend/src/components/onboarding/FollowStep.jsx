import React, { useState, useEffect } from 'react';
import { onboardingApi } from '../../lib/onboardingApi';

export default function FollowStep({ onNext, onBack, onError, onSkip }) {
  const [suggestions, setSuggestions] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSuggestions();
  }, []);

  const loadSuggestions = async () => {
    try {
      const data = await onboardingApi.getSuggestions(8);
      setSuggestions(data.suggestions || []);
    } catch (err) {
      onError?.('Error al cargar sugerencias');
    } finally {
      setLoading(false);
    }
  };

  const toggleUser = (userId) => {
    setSelected(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      }
      return [...prev, userId];
    });
  };

  const handleContinue = async () => {
    setSaving(true);
    try {
      await onboardingApi.followUsers(selected);
      onNext();
    } catch (err) {
      onError?.(err.response?.data?.detail || 'Error al seguir usuarios');
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'producer':
        return { text: 'Productor', class: 'bg-green-100 text-green-700' };
      case 'influencer':
        return { text: 'Influencer', class: 'bg-purple-100 text-purple-700' };
      default:
        return { text: 'Usuario', class: 'bg-stone-100 text-stone-700' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-stone-900 mb-2">
          Descubre creadores
        </h1>
        <p className="text-stone-600">
          Sigue a productores e influencers para personalizar tu feed
        </p>
      </div>

      {suggestions.length === 0 ? (
        <div className="text-center py-8 text-stone-500">
          <p>No hay sugerencias disponibles en este momento.</p>
          <p className="text-sm mt-2">Puedes omitir este paso y descubrir usuarios más tarde.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {suggestions.map(user => {
            const badge = getRoleBadge(user.role);
            const isSelected = selected.includes(user.user_id);
            
            return (
              <div
                key={user.user_id}
                onClick={() => toggleUser(user.user_id)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all flex items-center space-x-4 ${
                  isSelected
                    ? 'border-stone-900 bg-stone-50'
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                <img
                  src={user.picture || '/default-avatar.png'}
                  alt={user.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-medium text-stone-900 truncate">
                      {user.name}
                    </h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${badge.class}`}>
                      {badge.text}
                    </span>
                  </div>
                  <p className="text-sm text-stone-500 truncate">
                    @{user.username}
                  </p>
                  {user.bio && (
                    <p className="text-sm text-stone-600 mt-1 truncate">
                      {user.bio}
                    </p>
                  )}
                  {user.followers_count > 0 && (
                    <p className="text-xs text-stone-400 mt-1">
                      {user.followers_count.toLocaleString()} seguidores
                    </p>
                  )}
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  isSelected
                    ? 'border-stone-900 bg-stone-900'
                    : 'border-stone-300'
                }`}>
                  {isSelected && (
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between pt-4">
        <button
          onClick={onBack}
          className="px-6 py-2 text-stone-600 hover:text-stone-900 transition-colors"
        >
          Atrás
        </button>
        <div className="flex items-center space-x-3">
          <button
            onClick={onSkip}
            className="px-6 py-2 text-stone-600 hover:text-stone-900 transition-colors"
          >
            Omitir
          </button>
          <button
            onClick={handleContinue}
            disabled={saving}
            className="px-6 py-2 bg-stone-900 text-white rounded-lg font-medium disabled:opacity-50 hover:bg-stone-800 transition-colors"
          >
            {saving ? 'Guardando...' : 'Continuar'}
          </button>
        </div>
      </div>
    </div>
  );
}
