// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Save, RotateCcw, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import apiClient from '../../services/api/client';

function getDietOptions(t) {
  return [
    { value: 'vegan', label: t('aiPrefs.vegan', 'Vegano') },
    { value: 'vegetarian', label: t('aiPrefs.vegetarian', 'Vegetariano') },
    { value: 'gluten_free', label: t('aiPrefs.glutenFree', 'Sin Gluten') },
    { value: 'halal', label: 'Halal' },
    { value: 'kosher', label: 'Kosher' },
    { value: 'keto', label: 'Keto' },
    { value: 'paleo', label: 'Paleo' },
  ];
}

function getAllergyOptions(t) {
  return [
    { value: 'nuts', label: t('aiPrefs.nuts', 'Frutos secos') },
    { value: 'lactose', label: t('aiPrefs.lactose', 'Lactosa') },
    { value: 'shellfish', label: t('aiPrefs.shellfish', 'Mariscos') },
    { value: 'eggs', label: t('aiPrefs.eggs', 'Huevos') },
    { value: 'soy', label: t('aiPrefs.soy', 'Soja') },
    { value: 'wheat', label: t('aiPrefs.wheat', 'Trigo') },
    { value: 'fish', label: t('aiPrefs.fish', 'Pescado') },
  ];
}

function getGoalOptions(t) {
  return [
    { value: 'healthy_eating', label: t('aiPrefs.healthyEating', 'Alimentacion saludable') },
    { value: 'weight_loss', label: t('aiPrefs.weightLoss', 'Perdida de peso') },
    { value: 'muscle_gain', label: t('aiPrefs.muscleGain', 'Ganancia muscular') },
    { value: 'energy', label: t('aiPrefs.energy', 'Mas energia') },
    { value: 'digestion', label: t('aiPrefs.digestion', 'Mejor digestion') },
  ];
}

function getToneOptions(t) {
  return [
    { value: 'short_direct', label: t('aiPrefs.toneShort', 'Breve y directo'), description: t('aiPrefs.toneShortDesc', 'Respuestas cortas, al grano') },
    { value: 'friendly', label: t('aiPrefs.toneFriendly', 'Amigable'), description: t('aiPrefs.toneFriendlyDesc', 'Conversacional y cercano') },
    { value: 'explanatory', label: t('aiPrefs.toneDetailed', 'Detallado'), description: t('aiPrefs.toneDetailedDesc', 'Explicaciones completas') },
  ];
}

function getBudgetOptions(t) {
  return [
    { value: 'low', label: t('aiPrefs.budgetLow', 'Economico'), description: t('aiPrefs.budgetLowDesc', 'Priorizar opciones asequibles') },
    { value: 'medium', label: t('aiPrefs.budgetMedium', 'Equilibrado'), description: t('aiPrefs.budgetMediumDesc', 'Balance calidad-precio') },
    { value: 'high', label: t('aiPrefs.budgetHigh', 'Premium'), description: t('aiPrefs.budgetHighDesc', 'Calidad sin importar precio') },
  ];
}

function MultiSelect({ options, selected, onChange, label }) {
  const toggleOption = (value) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-stone-950 mb-3">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => toggleOption(option.value)}
            className={`px-4 py-2 rounded-full text-sm transition-all ${
              selected.includes(option.value)
                ? 'bg-stone-950 text-white border border-stone-950'
                : 'bg-white text-stone-600 border border-stone-200 hover:border-stone-950'
            }`}
          >
            {selected.includes(option.value) && <Check className="w-3 h-3 inline mr-1" />}
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SingleSelect({ options, selected, onChange, label }) {
  return (
    <div>
      <label className="block text-sm font-medium text-stone-950 mb-3">{label}</label>
      <div className="space-y-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`w-full text-left px-4 py-3 rounded-2xl border transition-all ${
              selected === option.value
                ? 'bg-stone-50 border-stone-950'
                : 'bg-white border-stone-200 hover:border-stone-950'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-stone-950">{option.label}</span>
                {option.description && (
                  <p className="text-xs text-stone-500 mt-0.5">{option.description}</p>
                )}
              </div>
              {selected === option.value && (
                <Check className="w-5 h-5 text-stone-950" />
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function CustomerAIPreferences() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const data = await apiClient.get('/ai/profile');
      setProfile(data);
    } catch (error) {
      toast.error(t('aiPrefs.loadError', 'Error al cargar preferencias'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.put('/ai/profile', {
        tone: profile.tone,
        diet: profile.diet,
        allergies: profile.allergies,
        goals: profile.goals,
        budget: profile.budget,
      });
      toast.success(t('aiPrefs.saved', 'Preferencias guardadas'));
    } catch (error) {
      toast.error(t('aiPrefs.saveError', 'Error al guardar preferencias'));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm(t('aiPrefs.resetConfirm', 'Estas seguro de que quieres reiniciar todas las preferencias de IA?'))) {
      return;
    }
    setSaving(true);
    try {
      const data = await apiClient.post('/ai/profile/reset', {});
      setProfile(data.profile);
      toast.success(t('aiPrefs.resetDone', 'Preferencias reiniciadas'));
    } catch (error) {
      toast.error(t('aiPrefs.resetError', 'Error al reiniciar preferencias'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-950 mx-auto mb-4"></div>
        <p className="text-sm text-stone-500">{t('common.loading', 'Cargando...')}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-stone-500">{t('aiPrefs.noProfile', 'No se pudieron cargar las preferencias')}</p>
      </div>
    );
  }

  return (
    <div data-testid="ai-preferences-page">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-stone-950 uppercase tracking-[0.02em]" data-testid="ai-preferences-title">
          {t('aiPrefs.title', 'Preferencias de David AI')}
        </h1>
        <p className="text-sm text-stone-500 mt-2">
          {t('aiPrefs.subtitle', 'David AI usa estas preferencias para personalizar tu experiencia de compra.')}
        </p>
      </div>

      <div className="space-y-8">
        <div className="bg-white border border-stone-200 rounded-2xl p-6">
          <h2 className="text-lg font-medium text-stone-950 mb-4 tracking-[0.02em]">
            {t('aiPrefs.communicationStyle', 'Estilo de comunicacion')}
          </h2>
          <SingleSelect
            options={getToneOptions(t)}
            selected={profile.tone}
            onChange={(value) => setProfile({ ...profile, tone: value })}
            label={t('aiPrefs.toneLabel', 'Como prefieres que te responda?')}
          />
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-6">
          <h2 className="text-lg font-medium text-stone-950 mb-4 tracking-[0.02em]">
            {t('aiPrefs.dietaryPreferences', 'Preferencias dieteticas')}
          </h2>
          <MultiSelect
            options={getDietOptions(t)}
            selected={profile.diet || []}
            onChange={(value) => setProfile({ ...profile, diet: value })}
            label={t('aiPrefs.selectDiets', 'Selecciona tus dietas')}
          />
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-6">
          <h2 className="text-lg font-medium text-stone-950 mb-4 tracking-[0.02em]">
            {t('aiPrefs.allergies', 'Alergias e intolerancias')}
          </h2>
          <MultiSelect
            options={getAllergyOptions(t)}
            selected={profile.allergies || []}
            onChange={(value) => setProfile({ ...profile, allergies: value })}
            label={t('aiPrefs.selectAllergies', 'Selecciona tus alergias')}
          />
          <p className="text-xs text-stone-500 mt-3">
            {t('aiPrefs.allergyNote', 'David AI nunca te recomendara productos con estos alergenos.')}
          </p>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-6">
          <h2 className="text-lg font-medium text-stone-950 mb-4 tracking-[0.02em]">
            {t('aiPrefs.goals', 'Objetivos')}
          </h2>
          <MultiSelect
            options={getGoalOptions(t)}
            selected={profile.goals || []}
            onChange={(value) => setProfile({ ...profile, goals: value })}
            label={t('aiPrefs.selectGoals', 'Cuales son tus objetivos?')}
          />
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-6">
          <h2 className="text-lg font-medium text-stone-950 mb-4 tracking-[0.02em]">
            {t('aiPrefs.budget', 'Presupuesto')}
          </h2>
          <SingleSelect
            options={getBudgetOptions(t)}
            selected={profile.budget}
            onChange={(value) => setProfile({ ...profile, budget: value })}
            label={t('aiPrefs.budgetLabel', 'Cual es tu preferencia de precio?')}
          />
        </div>

        <div className="flex items-center justify-between pt-4">
          <button
            onClick={handleReset}
            disabled={saving}
            className="flex items-center text-stone-600 hover:text-stone-950 transition-colors disabled:opacity-50"
            data-testid="reset-ai-button"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            {t('aiPrefs.resetAll', 'Reiniciar todo')}
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-stone-950 hover:bg-stone-800 disabled:opacity-50 text-white rounded-2xl transition-colors flex items-center"
            data-testid="save-ai-button"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                {t('common.saving', 'Guardando...')}
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {t('aiPrefs.savePreferences', 'Guardar preferencias')}
              </>
            )}
          </button>
        </div>

        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 text-center">
          <p className="text-xs text-stone-500">
            {t('aiPrefs.privacyNote', 'Tus preferencias se guardan de forma segura y solo se usan para personalizar tus recomendaciones.')}
            <br />
            {t('aiPrefs.privacyNote2', 'No almacenamos conversaciones completas ni datos medicos sensibles.')}
          </p>
        </div>
      </div>
    </div>
  );
}
