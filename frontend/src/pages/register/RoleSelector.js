import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Camera, Store, Globe, ArrowLeft, ArrowRight } from 'lucide-react';

const ROLES = [
  {
    id: 'consumer',
    title: 'Comprar con contexto',
    subtitle: 'Consumidor',
    description: 'Encuentra productos claros, guarda tus favoritos y compra con más información.',
    icon: User,
    path: '/register?role=customer',
  },
  {
    id: 'influencer',
    title: 'Crear con criterio',
    subtitle: 'Influencer',
    description: 'Monetiza tu audiencia sin recomendar productos en los que no crees.',
    icon: Camera,
    path: '/influencer/aplicar',
  },
  {
    id: 'producer',
    title: 'Vender sin perder margen',
    subtitle: 'Productor',
    description: 'Presenta tu catálogo con más contexto y conecta con clientes e importadores.',
    icon: Store,
    path: '/productor/registro',
  },
  {
    id: 'importer',
    title: 'Validar antes de arriesgar',
    subtitle: 'Importador',
    description: 'Conecta con productores españoles y abre conversaciones antes de comprar.',
    icon: Globe,
    path: '/register/importer',
  },
];

const RoleSelector = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-xl px-4 py-6 md:py-10">
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:border-stone-300 hover:text-stone-950"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </button>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-stone-500">
            Registro
          </p>
        </div>

        <div className="mb-8 text-center md:mb-10">
          <h1 className="text-3xl font-semibold tracking-tight text-stone-950 md:text-4xl">
            ¿Cómo quieres entrar en Hispaloshop?
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-stone-600 md:text-base">
            Elige el recorrido que mejor encaja contigo. Cada acceso lleva a un flujo real, sin pasos de relleno.
          </p>
        </div>

        <div className="space-y-4">
          {ROLES.map((role, index) => {
            const Icon = role.icon;

            return (
              <motion.button
                key={role.id}
                type="button"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                onClick={() => navigate(role.path)}
                className="flex w-full items-center gap-4 rounded-[28px] border border-stone-200 bg-white p-5 text-left transition-all hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-sm"
              >
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-stone-950 text-white">
                  <Icon className="h-6 w-6" />
                </div>

                <div className="min-w-0 flex-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-500">
                    {role.subtitle}
                  </span>
                  <h2 className="mt-1 text-lg font-semibold text-stone-950">{role.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-stone-600">{role.description}</p>
                </div>

                <div className="hidden rounded-full bg-stone-100 p-2 text-stone-700 sm:block">
                  <ArrowRight className="h-5 w-5" />
                </div>
              </motion.button>
            );
          })}
        </div>

        <p className="mt-8 text-center text-sm text-stone-600">
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
    </div>
  );
};

export default RoleSelector;
