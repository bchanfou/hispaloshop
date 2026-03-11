import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Clock3 } from 'lucide-react';

const Step1Method = ({ onNext, onMethodSelect }) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/register/new')}
          aria-label="Volver a selección de rol"
          className="rounded-full p-2 transition-colors hover:bg-stone-100"
        >
          <ArrowLeft className="h-5 w-5 text-stone-900" />
        </button>
        <h2 className="text-xl font-semibold text-stone-950">Crear cuenta</h2>
      </div>

      <div className="text-center">
        <h3 className="text-lg font-semibold text-stone-950">
          Empieza con email
        </h3>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Este flujo ya está conectado de principio a fin. Los accesos con teléfono y social llegarán más adelante.
        </p>
      </div>

      <button
        type="button"
        onClick={() => {
          onMethodSelect('email');
          onNext();
        }}
        className="flex w-full items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4 text-left transition-all hover:border-stone-300 hover:shadow-sm"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-950 text-white">
          <Mail className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <span className="block font-medium text-stone-950">Continuar con email</span>
          <span className="mt-1 block text-sm text-stone-500">Crearás tu cuenta y después completaremos tus preferencias.</span>
        </div>
      </button>

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-stone-700">
            <Clock3 className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium text-stone-950">Próximamente</p>
            <p className="mt-1 text-sm leading-6 text-stone-600">
              Google, Apple y teléfono volverán cuando estén conectados al mismo nivel de fiabilidad que este flujo.
            </p>
          </div>
        </div>
      </div>

      <p className="text-center text-sm text-stone-600">
        ¿Ya tienes cuenta?{' '}
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="font-medium text-stone-950 transition-colors hover:text-black"
        >
          Inicia sesión
        </button>
      </p>
    </div>
  );
};

export default Step1Method;
