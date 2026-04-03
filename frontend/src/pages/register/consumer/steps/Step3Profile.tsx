// @ts-nocheck
import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import i18n from "../../../../locales/i18n";
const DIETARY_OPTIONS = [{
  value: 'vegetarian',
  label: 'Vegetariano'
}, {
  value: 'vegan',
  label: 'Vegano'
}, {
  value: 'gluten_free',
  label: 'Sin gluten'
}, {
  value: 'lactose_free',
  label: 'Sin lactosa'
}, {
  value: 'nut_free',
  label: 'Sin frutos secos'
}, {
  value: 'other',
  label: 'Otras'
}];
const CATEGORY_OPTIONS = ['Aceites', 'Miel', 'Conservas', "Panadería", 'Quesos', 'Embutidos', 'Salsas', 'Pasta', 'Legumbres', 'Especias', 'Frutos secos', 'Infusiones'];
const COUNTRY_OPTIONS = [{
  value: 'ES',
  label: "España"
}, {
  value: 'PT',
  label: 'Portugal'
}, {
  value: 'FR',
  label: 'Francia'
}, {
  value: 'DE',
  label: 'Alemania'
}, {
  value: 'IT',
  label: 'Italia'
}, {
  value: 'GB',
  label: 'Reino Unido'
}, {
  value: 'NL',
  label: "Países Bajos"
}, {
  value: 'BE',
  label: "Bélgica"
}, {
  value: 'CH',
  label: 'Suiza'
}, {
  value: 'AT',
  label: 'Austria'
}, {
  value: 'MX',
  label: "México"
}, {
  value: 'AR',
  label: 'Argentina'
}, {
  value: 'CO',
  label: 'Colombia'
}];
const Step3Profile = ({
  onNext,
  data,
  onDataChange
}) => {
  const [dietaryRestrictions, setDietaryRestrictions] = useState(data.dietaryRestrictions || []);
  const [categories, setCategories] = useState(data.categories || []);
  const [postalCode, setPostalCode] = useState(data.postalCode || '');
  const [country, setCountry] = useState(data.country || '');
  const [countryError, setCountryError] = useState('');
  const toggleItem = (value, state, setter) => {
    setter(state.includes(value) ? state.filter(item => item !== value) : [...state, value]);
  };
  const handleSubmit = () => {
    if (!country) {
      setCountryError(i18n.t('register.selectCountry', 'Selecciona tu país'));
      return;
    }
    setCountryError('');
    onDataChange({
      dietaryRestrictions,
      categories,
      postalCode,
      country
    });
    onNext();
  };
  return <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-stone-950">Perfil alimentario</h3>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Ajusta tus intereses para que el catálogo y las recomendaciones empiecen con más criterio.
        </p>
      </div>

      <div>
        <label className="mb-3 block text-sm font-medium text-stone-800">
          ¿Tienes alguna restricción alimentaria?
        </label>
        <div className="grid grid-cols-2 gap-3">
          {DIETARY_OPTIONS.map(option => {
          const selected = dietaryRestrictions.includes(option.value);
          return <button key={option.value} type="button" onClick={() => toggleItem(option.value, dietaryRestrictions, setDietaryRestrictions)} className={`rounded-2xl border p-3 text-left text-sm font-medium transition-colors ${selected ? 'border-stone-950 bg-stone-950 text-white' : 'border-stone-200 bg-white text-stone-700 hover:border-stone-200'}`}>
                {option.label}
              </button>;
        })}
        </div>
      </div>

      <div>
        <label className="mb-3 block text-sm font-medium text-stone-800">
          ¿Qué categorías te interesan más?
        </label>
        <div className="grid grid-cols-2 gap-3">
          {CATEGORY_OPTIONS.map(category => {
          const selected = categories.includes(category);
          return <button key={category} type="button" onClick={() => toggleItem(category, categories, setCategories)} className={`rounded-2xl border p-3 text-left text-sm font-medium transition-colors ${selected ? 'border-stone-950 bg-stone-950 text-white' : 'border-stone-200 bg-white text-stone-700 hover:border-stone-200'}`}>
                {category}
              </button>;
        })}
        </div>
      </div>

      <div>
        <label htmlFor="consumer-country" className="text-sm font-medium text-stone-800">
          País *
        </label>
        <select id="consumer-country" value={country} onChange={e => {
        setCountry(e.target.value);
        setCountryError('');
      }} className={`mt-2 h-12 w-full rounded-xl border bg-white px-3 text-base md:h-11 md:text-sm ${countryError ? 'border-stone-950' : 'border-stone-200'}`}>
          <option value="">{i18n.t('register.selectCountry', 'Selecciona tu país')}</option>
          {COUNTRY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        {countryError ? <p className="mt-1 text-xs text-stone-700">{countryError}</p> : null}
      </div>

      <div>
        <label htmlFor="consumer-postal-code" className="text-sm font-medium text-stone-800">
          Código postal
        </label>
        <input id="consumer-postal-code" type="text" value={postalCode} onChange={e => setPostalCode(e.target.value)} placeholder="41001" className="mt-2 h-12 w-full rounded-xl border border-stone-200 bg-white px-3 text-base md:h-11 md:text-sm" />
        <p className="mt-1 text-xs text-stone-500">{i18n.t('step3_profile.nosAyudaAMostrarProductoresYEnvios', 'Nos ayuda a mostrar productores y envíos más relevantes.')}</p>
      </div>

      <button type="button" onClick={handleSubmit} className="flex w-full items-center justify-center gap-2 rounded-full bg-stone-950 py-3 font-medium text-white transition-colors hover:bg-black">
        Continuar
        <ArrowRight className="h-5 w-5" />
      </button>
    </div>;
};
export default Step3Profile;