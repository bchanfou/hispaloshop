import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/api/client';
import { AlertTriangle } from 'lucide-react';

let _cache = { state: null, fetchedAt: 0 };
const CACHE_TTL = 5 * 60 * 1000;

export default function RestrictionBanner() {
  const { t } = useTranslation();
  const { user, initialized } = useAuth();
  const [state, setState] = useState(_cache.state);

  useEffect(() => {
    if (!initialized || !user) { setState(null); return; }
    const now = Date.now();
    if (_cache.state && (now - _cache.fetchedAt) < CACHE_TTL) {
      setState(_cache.state);
      return;
    }
    apiClient.get('/moderation/me/state')
      .then((data) => {
        _cache = { state: data, fetchedAt: Date.now() };
        setState(data);
      })
      .catch(() => setState(null));
  }, [user]);

  if (!state) return null;
  if (!state.restrictions_active && !state.suspended && !state.is_banned) return null;

  if (state.is_banned || state.suspended) {
    return (
      <div className="bg-red-500/15 border-b border-red-500/40 text-red-700 text-sm px-4 py-3 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {state.is_banned
            ? t('moderation.banned', 'Tu cuenta está baneada permanentemente.')
            : t('moderation.suspended', 'Tu cuenta está suspendida hasta {{date}}.', {
                date: state.suspended_until ? new Date(state.suspended_until).toLocaleDateString() : '—',
              })}
        </span>
        <Link to="/account/restrictions" className="text-xs underline whitespace-nowrap">
          {t('moderation.appeal', 'Apelar')}
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-amber-500/15 border-b border-amber-500/40 text-amber-700 text-sm px-4 py-3 flex items-center justify-between gap-3">
      <span className="inline-flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        {t('moderation.restricted', 'Tu cuenta tiene restricciones temporales hasta {{date}}.', {
          date: state.restrictions_expires_at ? new Date(state.restrictions_expires_at).toLocaleDateString() : '—',
        })}
      </span>
      <Link to="/account/restrictions" className="text-xs underline whitespace-nowrap">
        {t('moderation.viewDetails', 'Ver detalles')}
      </Link>
    </div>
  );
}
