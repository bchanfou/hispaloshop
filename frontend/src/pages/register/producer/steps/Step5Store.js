import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Image, HelpCircle, MessageCircle, CheckCircle } from 'lucide-react';

const Step5Store = ({ onComplete }) => {
  const navigate = useNavigate();

  return (
    <div className="text-center space-y-6 py-8">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="w-24 h-24 mx-auto bg-[#2D5A3D] rounded-full flex items-center justify-center"
      >
        <FileText className="w-12 h-12 text-white" />
      </motion.div>

      <div>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-bold text-[#1A1A1A] mb-2"
        >
          Verificación en curso
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-[#6B7280]"
        >
          Hemos recibido tu solicitud
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="bg-gray-50 rounded-xl p-4 text-left"
      >
        <h4 className="font-medium text-[#1A1A1A] mb-3">Nuestro equipo revisará:</h4>
        <ul className="space-y-2">
          <li className="flex items-center gap-2 text-sm text-[#6B7280]">
            <CheckCircle className="w-4 h-4 text-[#16A34A]" />
            Documentación legal
          </li>
          <li className="flex items-center gap-2 text-sm text-[#6B7280]">
            <CheckCircle className="w-4 h-4 text-[#16A34A]" />
            Certificaciones
          </li>
          <li className="flex items-center gap-2 text-sm text-[#6B7280]">
            <CheckCircle className="w-4 h-4 text-[#16A34A]" />
            Productos (muestra)
          </li>
        </ul>
        <p className="text-sm text-[#6B7280] mt-3 pt-3 border-t">
          Plazo: <span className="font-medium text-[#1A1A1A]">3-5 días hábiles</span>
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="space-y-2"
      >
        <button className="w-full flex items-center gap-3 p-3 bg-white border rounded-xl hover:shadow-sm transition-shadow">
          <Image className="w-5 h-5 text-[#2D5A3D]" />
          <span className="text-sm text-[#1A1A1A]">Subir fotos de productos</span>
          <span className="text-xs text-[#6B7280] ml-auto">(mientras tanto)</span>
        </button>
        <button className="w-full flex items-center gap-3 p-3 bg-white border rounded-xl hover:shadow-sm transition-shadow">
          <MessageCircle className="w-5 h-5 text-[#2D5A3D]" />
          <span className="text-sm text-[#1A1A1A]">Contactar soporte</span>
        </button>
      </motion.div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        onClick={() => { onComplete(); navigate('/'); }}
        className="w-full py-3 bg-[#2D5A3D] text-white rounded-xl font-medium hover:bg-[#234a31] transition-colors"
      >
        Volver al inicio
      </motion.button>
    </div>
  );
};

export default Step5Store;
