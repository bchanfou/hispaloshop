import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Phone, ArrowLeft } from 'lucide-react';
import SocialButtons from '../../../../components/auth/SocialButtons';

const Step1Method = ({ onNext, onMethodSelect }) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[#1A1A1A]" />
        </button>
        <h2 className="text-xl font-bold text-[#1A1A1A]">Crear cuenta</h2>
      </div>

      <div className="text-center py-4">
        <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">
          ¿Cómo quieres empezar?
        </h3>
        <p className="text-sm text-[#6B7280]">
          Elige tu método de registro preferido
        </p>
      </div>

      {/* Method Buttons */}
      <div className="space-y-3">
        <button
          onClick={() => { onMethodSelect('email'); onNext(); }}
          className="w-full flex items-center gap-3 p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-[#2D5A3D] transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-[#2D5A3D]/10 flex items-center justify-center">
            <Mail className="w-5 h-5 text-[#2D5A3D]" />
          </div>
          <span className="flex-1 text-left font-medium text-[#1A1A1A]">
            Continuar con email
          </span>
        </button>

        <button
          onClick={() => { onMethodSelect('phone'); onNext(); }}
          className="w-full flex items-center gap-3 p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-[#2D5A3D] transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-[#E6A532]/10 flex items-center justify-center">
            <Phone className="w-5 h-5 text-[#E6A532]" />
          </div>
          <span className="flex-1 text-left font-medium text-[#1A1A1A]">
            Continuar con teléfono
          </span>
        </button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-sm text-[#6B7280]">o</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Social Login */}
      <SocialButtons 
        onGoogleClick={() => { onMethodSelect('google'); onNext(); }}
        onFacebookClick={() => { onMethodSelect('facebook'); onNext(); }}
        onAppleClick={() => { onMethodSelect('apple'); onNext(); }}
      />

      {/* Login Link */}
      <p className="text-center text-sm text-[#6B7280]">
        ¿Ya tienes cuenta?{' '}
        <button 
          onClick={() => navigate('/login')}
          className="text-[#2D5A3D] font-medium hover:underline"
        >
          Inicia sesión
        </button>
      </p>
    </div>
  );
};

export default Step1Method;
