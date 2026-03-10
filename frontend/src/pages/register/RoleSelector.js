import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Camera, Store, Globe, ArrowRight } from 'lucide-react';

const ROLES = [
  {
    id: 'consumer',
    title: 'Comprar productos',
    subtitle: 'Consumidor',
    description: 'Descubre y compra productos artesanales directamente de productores',
    icon: User,
    color: '#2D5A3D',
    path: '/register/consumer'
  },
  {
    id: 'influencer',
    title: 'Crear contenido',
    subtitle: 'Influencer',
    description: 'Monetiza tu audiencia recomendando productos que te gustan',
    icon: Camera,
    color: '#E6A532',
    path: '/register/influencer'
  },
  {
    id: 'producer',
    title: 'Vender productos',
    subtitle: 'Productor',
    description: 'Vende directo a consumidores y expande tu negocio',
    icon: Store,
    color: '#16A34A',
    path: '/productor/registro'
  },
  {
    id: 'importer',
    title: 'Importar productos',
    subtitle: 'Importador',
    description: 'Conecta con productores españoles para tu mercado',
    icon: Globe,
    color: '#3B82F6',
    path: '/register/importer'
  }
];

const RoleSelector = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#1A1A1A] mb-2">
            ¿Cómo quieres usar Hispaloshop?
          </h1>
          <p className="text-[#6B7280]">
            Selecciona el perfil que mejor se adapte a ti
          </p>
        </div>

        <div className="space-y-4">
          {ROLES.map((role, index) => {
            const Icon = role.icon;
            return (
              <motion.button
                key={role.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => navigate(role.path)}
                className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow text-left"
              >
                <div 
                  className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${role.color}15` }}
                >
                  <Icon className="w-7 h-7" style={{ color: role.color }} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <span 
                    className="text-xs font-semibold uppercase tracking-wide"
                    style={{ color: role.color }}
                  >
                    {role.subtitle}
                  </span>
                  <h3 className="font-semibold text-[#1A1A1A]">{role.title}</h3>
                  <p className="text-sm text-[#6B7280] truncate">{role.description}</p>
                </div>

                <ArrowRight className="w-5 h-5 text-[#6B7280] flex-shrink-0" />
              </motion.button>
            );
          })}
        </div>

        <p className="text-center text-sm text-[#6B7280] mt-8">
          ¿Ya tienes cuenta?{' '}
          <button 
            onClick={() => navigate('/login')}
            className="text-[#2D5A3D] font-medium hover:underline"
          >
            Inicia sesión
          </button>
        </p>
      </div>
    </div>
  );
};

export default RoleSelector;
