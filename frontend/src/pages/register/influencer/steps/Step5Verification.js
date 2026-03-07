import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, BookOpen, GraduationCap, Lightbulb } from 'lucide-react';

const Step5Verification = ({ onComplete }) => {
  const navigate = useNavigate();

  return (
    <div className="text-center space-y-6 py-8">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="w-24 h-24 mx-auto bg-[#E6A532] rounded-full flex items-center justify-center"
      >
        <Clock className="w-12 h-12 text-white" />
      </motion.div>

      <div>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-bold text-[#1A1A1A] mb-2"
        >
          En revisión
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-[#6B7280]"
        >
          Revisaremos tu perfil en 24-48h
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="bg-gray-50 rounded-xl p-4 text-left"
      >
        <h4 className="font-medium text-[#1A1A1A] mb-3">Mientras tanto:</h4>
        <div className="space-y-2">
          <button className="w-full flex items-center gap-3 p-3 bg-white rounded-lg hover:shadow-sm transition-shadow">
            <BookOpen className="w-5 h-5 text-[#2D5A3D]" />
            <span className="text-sm text-[#1A1A1A]">Guía del influencer</span>
          </button>
          <button className="w-full flex items-center gap-3 p-3 bg-white rounded-lg hover:shadow-sm transition-shadow">
            <GraduationCap className="w-5 h-5 text-[#2D5A3D]" />
            <span className="text-sm text-[#1A1A1A]">Mejores prácticas</span>
          </button>
          <button className="w-full flex items-center gap-3 p-3 bg-white rounded-lg hover:shadow-sm transition-shadow">
            <Lightbulb className="w-5 h-5 text-[#2D5A3D]" />
            <span className="text-sm text-[#1A1A1A]">Ideas de contenido</span>
          </button>
        </div>
      </motion.div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        onClick={() => { onComplete(); navigate('/'); }}
        className="w-full py-3 bg-[#2D5A3D] text-white rounded-xl font-medium hover:bg-[#234a31] transition-colors"
      >
        Volver al inicio
      </motion.button>
    </div>
  );
};

export default Step5Verification;
