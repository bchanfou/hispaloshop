import React from 'react';
import { ArrowRight } from 'lucide-react';
import InputField from '../../../../components/forms/InputField';
import RadioGroup from '../../../../components/forms/RadioGroup';

const NICHE_OPTIONS = [
  { value: 'recipes', label: 'Recetas saludables' },
  { value: 'reviews', label: 'Restaurantes / reviews' },
  { value: 'gourmet', label: 'Productos gourmet' },
  { value: 'diet', label: 'Dieta específica (keto, etc.)' }
];

const Step3Audience = ({ onNext, data, onDataChange }) => {
  const [followers, setFollowers] = React.useState(data.followers || '');
  const [engagement, setEngagement] = React.useState(data.engagement || '');
  const [niche, setNiche] = React.useState(data.niche || '');
  const [links, setLinks] = React.useState(data.links || { instagram: '', tiktok: '', youtube: '' });

  const handleSubmit = () => {
    onDataChange({ followers, engagement, niche, links });
    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-[#1A1A1A] mb-1">
          Audiencia y métricas
        </h3>
        <p className="text-sm text-[#6B7280]">
          Información sobre tu audiencia
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <InputField
          label="Seguidores totales"
          type="number"
          value={followers}
          onChange={(e) => setFollowers(e.target.value)}
          placeholder="25,000"
        />
        <InputField
          label="Engagement %"
          type="number"
          value={engagement}
          onChange={(e) => setEngagement(e.target.value)}
          placeholder="4.5"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#1A1A1A] mb-3">
          ¿Cuál es tu nicho principal?
        </label>
        <RadioGroup
          options={NICHE_OPTIONS}
          value={niche}
          onChange={setNiche}
        />
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-[#1A1A1A]">
          Links a redes (opcional)
        </label>
        <InputField
          placeholder="instagram.com/maria"
          value={links.instagram}
          onChange={(e) => setLinks({ ...links, instagram: e.target.value })}
        />
        <InputField
          placeholder="tiktok.com/@maria"
          value={links.tiktok}
          onChange={(e) => setLinks({ ...links, tiktok: e.target.value })}
        />
        <InputField
          placeholder="youtube.com/@maria"
          value={links.youtube}
          onChange={(e) => setLinks({ ...links, youtube: e.target.value })}
        />
      </div>

      <button
        onClick={handleSubmit}
        className="w-full flex items-center justify-center gap-2 py-3 bg-[#2D5A3D] text-white rounded-xl font-medium hover:bg-[#234a31] transition-colors"
      >
        Continuar
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
};

export default Step3Audience;
