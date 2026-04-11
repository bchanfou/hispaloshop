// @ts-nocheck
// Section 3.6.2b — Settings → Roles & Features
// Importer-only settings page that exposes the "B2C seller mode" toggle.
// Toggling on calls PATCH /users/me with has_b2c_store=true; toggling off
// requires a confirmation modal because it hides the producer/store sidebar
// items but does NOT delete any product or store data server-side.

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Store, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api/client';

function ConfirmDisableModal({ open, onCancel, onConfirm, busy }) {
  const { t } = useTranslation();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-stone-950 mb-2">
          {t('settings.rolesFeatures.b2cMode.confirmTitle', 'Desactivar modo B2C')}
        </h2>
        <p className="text-sm text-stone-600 mb-5">
          {t(
            'settings.rolesFeatures.b2cMode.disableWarning',
            'Esto solo oculta los accesos del sidebar. No elimina productos ni datos de tienda.',
          )}
        </p>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 rounded-2xl text-sm font-medium text-stone-700 hover:bg-stone-100 transition-colors disabled:opacity-50"
          >
            {t('common.cancel', 'Cancelar')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="px-5 py-2 rounded-2xl text-sm font-semibold bg-stone-950 text-white hover:bg-stone-800 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {t('settings.rolesFeatures.b2cMode.confirmDisable', 'Desactivar')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RolesFeaturesPage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isImporter = user?.role === 'importer';
  const enabled = Boolean(user?.has_b2c_store);

  const updateFlag = async (next) => {
    setBusy(true);
    try {
      await apiClient.patch('/users/me', { has_b2c_store: next });
      // Optimistically update auth context so the sidebar reflects immediately.
      if (typeof setUser === 'function') {
        setUser((prev) => (prev ? { ...prev, has_b2c_store: next } : prev));
      }
      toast.success(
        next
          ? t('settings.rolesFeatures.b2cMode.enabledToast', 'Modo vendedor B2C activado')
          : t('settings.rolesFeatures.b2cMode.disabledToast', 'Modo vendedor B2C desactivado'),
      );
    } catch {
      toast.error(t('common.errorTryAgain', 'Hubo un error. Intenta de nuevo.'));
    } finally {
      setBusy(false);
      setConfirmOpen(false);
    }
  };

  const handleToggle = () => {
    if (busy) return;
    if (enabled) {
      setConfirmOpen(true);
    } else {
      updateFlag(true);
    }
  };

  if (!isImporter) {
    return (
      <div className="max-w-2xl mx-auto p-4 md:p-8">
        <div className="bg-white rounded-2xl border border-stone-200 p-6 text-center">
          <p className="text-sm text-stone-600">
            {t(
              'settings.rolesFeatures.importerOnly',
              'Esta configuración sólo está disponible para cuentas de importador.',
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      <button
        type="button"
        onClick={() => navigate('/settings')}
        className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-950 mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
        {t('common.back', 'Volver')}
      </button>

      <h1 className="text-2xl font-bold text-stone-950 mb-1">
        {t('settings.rolesFeatures.title', 'Roles y funcionalidades')}
      </h1>
      <p className="text-sm text-stone-500 mb-6">
        {t(
          'settings.rolesFeatures.subtitle',
          'Activa funcionalidades adicionales para tu cuenta de importador.',
        )}
      </p>

      {/* B2C Mode Card */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-2xl bg-stone-100 flex items-center justify-center shrink-0">
            <Store className="w-5 h-5 text-stone-700" strokeWidth={1.5} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-1">
              <h2 className="text-sm font-semibold text-stone-950">
                {t('settings.rolesFeatures.b2cMode.title', 'Modo vendedor B2C')}
              </h2>
              <button
                type="button"
                onClick={handleToggle}
                disabled={busy}
                role="switch"
                aria-checked={enabled}
                aria-label={t('settings.rolesFeatures.b2cMode.title', 'Modo vendedor B2C')}
                className={`relative shrink-0 inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  enabled ? 'bg-stone-950' : 'bg-stone-200'
                } ${busy ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    enabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <p className="text-xs text-stone-500 leading-relaxed">
              {t(
                'settings.rolesFeatures.b2cMode.description',
                'Activa esta opción si quieres vender productos directamente a consumidores finales además de tu actividad B2B.',
              )}
            </p>

            {enabled && (
              <Link
                to="/producer/store"
                className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-stone-950 hover:underline"
              >
                <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                {t('settings.rolesFeatures.b2cMode.configureStore', 'Configurar mi tienda')}
              </Link>
            )}
          </div>
        </div>
      </div>

      <ConfirmDisableModal
        open={confirmOpen}
        busy={busy}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => updateFlag(false)}
      />
    </div>
  );
}
