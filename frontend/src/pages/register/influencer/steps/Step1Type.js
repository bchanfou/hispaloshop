import React from 'react';
import { ArrowRight } from 'lucide-react';
import RadioGroup from '../../../../components/forms/RadioGroup';
import CheckboxGroup from '../../../../components/forms/CheckboxGroup';
import InputField from '../../../../components/forms/InputField';
import { Utensils, Heart, Users, Dumbbell, Plane } from 'lucide-react';

const CONTENT_TYPES = [
  { value: 'foodie', label: 'Foodie / gastronomía', icon: Utensils },
  { value: 'lifestyle', label: 'Lifestyle / bienestar', icon: Heart },
  { value: 'family', label: 'Familia / niños', icon: Users },
  { value: 'fitness', label: 'Fitness / salud', icon: Dumbbell },
  { value: 'travel', label: 'Viajes / turismo', icon: Plane }
];

const PLATFORM_OPTIONS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'blog', label: 'Blog' },
  { value: 'twitch', label: 'Twitch' },
  { value: 'other', label: 'Otro' }
];

const Step1Type = ({ onNext, data, onDataChange }) => {
  const [contentType, setContentType] = React.useState(data.contentType || '');
  const [platforms, setPlatforms] = React.useState(data.platforms || []);
  const [username, setUsername] = React.useState(data.username || '');

  const handleSubmit = () => {
    onDataChange({ contentType, platforms, username });
    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-[#1A1A1A] mb-1">
          Tipo de influencer
        </h3>
        <p className="text-sm text-[#6B7280]">
          ¿Cómo describes tu contenido?
        </p>
      </div>

      <RadioGroup
        options={CONTENT_TYPES}
        value={contentType}
        onChange={setContentType}
      />

      <div>
        <label className="block text-sm font-medium text-[#1A1A1A] mb-3">
          ¿En qué plataformas creas contenido?
        </label>
        <CheckboxGroup
          options={PLATFORM_OPTIONS}
          selected={platforms}
          onChange={setPlatforms}
          columns={2}
        />
      </div>

      <InputField
        label="@usuario principal"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="@maria_foodie"
        hint="Tu cuenta principal donde creas contenido"
      />

      <button
        onClick={handleSubmit}
        disabled={!contentType || platforms.length === 0}
        className="w-full flex items-center justify-center gap-2 py-3 bg-[#2D5A3D] text-white rounded-xl font-medium hover:bg-[#234a31] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        Continuar
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
};

export default Step1Type;
