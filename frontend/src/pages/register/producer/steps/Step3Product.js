import React from 'react';
import { ArrowRight } from 'lucide-react';
import CheckboxGroup from '../../../../components/forms/CheckboxGroup';
import FileUpload from '../../../../components/forms/FileUpload';
import InputField from '../../../../components/forms/InputField';
import { Wine, Milk, Beef, Fish, Cookie, Leaf, Droplets } from 'lucide-react';

const CATEGORY_OPTIONS = [
  { value: 'aceites', label: 'Aceites de oliva', icon: Droplets },
  { value: 'vinos', label: 'Vinos', icon: Wine },
  { value: 'quesos', label: 'Quesos', icon: Milk },
  { value: 'embutidos', label: 'Embutidos', icon: Beef },
  { value: 'conservas', label: 'Conservas', icon: Fish },
  { value: 'panaderia', label: 'Panadería', icon: Cookie },
  { value: 'miel', label: 'Miel', icon: Leaf },
  { value: 'otros', label: 'Otros' }
];

const CERTIFICATION_OPTIONS = [
  { value: 'dop', label: 'DOP (Denominación Origen)' },
  { value: 'ecologico', label: 'Ecológico / BIO' },
  { value: 'artesano', label: 'Artesano (registro)' },
  { value: 'ifs', label: 'IFS / BRC' },
  { value: 'ninguna', label: 'Ninguna todavía' }
];

const Step3Product = ({ onNext, data, onDataChange }) => {
  const [categories, setCategories] = React.useState(data.categories || []);
  const [certifications, setCertifications] = React.useState(data.certifications || []);
  const [volumes, setVolumes] = React.useState(data.volumes || {});
  const [files, setFiles] = React.useState(data.files || []);

  const handleSubmit = () => {
    onDataChange({ categories, certifications, volumes, files });
    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-[#1A1A1A] mb-1">Producto y producción</h3>
        <p className="text-sm text-[#6B7280]">Cuéntanos qué produces</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#1A1A1A] mb-3">
          ¿Qué categorías produces?
        </label>
        <CheckboxGroup
          options={CATEGORY_OPTIONS}
          selected={categories}
          onChange={setCategories}
          columns={2}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#1A1A1A] mb-3">
          Volumen anual estimado
        </label>
        <div className="space-y-3">
          {categories.includes('aceites') && (
            <InputField
              label="Aceites"
              type="number"
              value={volumes.aceites || ''}
              onChange={(e) => setVolumes({ ...volumes, aceites: e.target.value })}
              placeholder="5,000"
              rightElement={<span className="text-sm text-[#6B7280]">litros/año</span>}
            />
          )}
          {categories.includes('miel') && (
            <InputField
              label="Miel"
              type="number"
              value={volumes.miel || ''}
              onChange={(e) => setVolumes({ ...volumes, miel: e.target.value })}
              placeholder="500"
              rightElement={<span className="text-sm text-[#6B7280]">kg/año</span>}
            />
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#1A1A1A] mb-3">
          ¿Tienes certificaciones?
        </label>
        <CheckboxGroup
          options={CERTIFICATION_OPTIONS}
          selected={certifications}
          onChange={setCertifications}
        />
      </div>

      <FileUpload
        label="Certificados"
        files={files}
        onChange={setFiles}
        hint="Sube tus certificados (PDF, JPG, PNG, máx 5MB)"
      />

      <button
        onClick={handleSubmit}
        disabled={categories.length === 0}
        className="w-full flex items-center justify-center gap-2 py-3 bg-[#2D5A3D] text-white rounded-xl font-medium hover:bg-[#234a31] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        Continuar
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
};

export default Step3Product;
