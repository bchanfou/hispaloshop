import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Rocket, User, Store, CheckCircle } from 'lucide-react';

const Step5Welcome = ({ data, onComplete }) => {
  const navigate = useNavigate();
  const firstName = data.firstName || 'Usuario';

  return (
    <div className="text-center space-y-6 py-8">
      {/* Animation */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="w-24 h-24 mx-auto bg-accent rounded-full flex items-center justify-center"
      >
        <CheckCircle className="w-12 h-12 text-white" />
      </motion.div>

      <div>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-bold text-gray-900 mb-2"
        >
          ¡Bienvenida, {firstName}!
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-text-muted"
        >
          Tu perfil está listo
        </motion.p>
      </div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-3 pt-4"
      >
        <button
          onClick={() => { onComplete(); navigate('/'); }}
          className="w-full flex items-center justify-center gap-2 py-3 bg-accent text-white rounded-xl font-medium hover:bg-accent/90 transition-colors"
        >
          <Rocket className="w-5 h-5" />
          Explorar productos
        </button>

        <button
          onClick={() => { onComplete(); navigate('/profile/edit'); }}
          className="w-full flex items-center justify-center gap-2 py-3 bg-white border-2 border-gray-200 text-gray-900 rounded-xl font-medium hover:border-accent transition-colors"
        >
          <User className="w-5 h-5" />
          Completar mi perfil
        </button>
      </motion.div>

      {/* Tip */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="bg-state-amber/10 rounded-xl p-4 mt-6"
      >
        <div className="flex items-start gap-3">
          <Store className="w-5 h-5 text-state-amber flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-900 text-left">
            <span className="font-medium">💡 Consejo:</span> Sigue a 3 productores 
            para personalizar tu feed con contenido relevante.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Step5Welcome;
