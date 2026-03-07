import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, FileText, Phone, CheckCircle } from 'lucide-react';
import FileUpload from '../../../../components/forms/FileUpload';

const Step5Verification = ({ onComplete }) => {
  const navigate = useNavigate();
  const [files, setFiles] = React.useState([]);

  return (
    <div className="text-center space-y-6 py-4">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="w-24 h-24 mx-auto bg-[#2D5A3D] rounded-full flex items-center justify-center"
      >
        <Lock className="w-12 h-12 text-white" />
      </motion.div>

      <div>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-bold text-[#1A1A1A] mb-2"
        >
          Verificación empresarial
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-[#6B7280]"
        >
          Gracias por tu interés
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-left"
      >
        <h4 className="font-medium text-[#1A1A1A] mb-3">Requerimos:</h4>
        <ul className="space-y-2 mb-4">
          <li className="flex items-center gap-2 text-sm text-[#6B7280]">
            <CheckCircle className="w-4 h-4 text-[#16A34A]" />
            Escritura de constitución
          </li>
          <li className="flex items-center gap-2 text-sm text-[#6B7280]">
            <CheckCircle className="w-4 h-4 text-[#16A34A]" />
            Última cuenta anual
          </li>
          <li className="flex items-center gap-2 text-sm text-[#6B7280]">
            <CheckCircle className="w-4 h-4 text-[#16A34A]" />
            Referencias comerciales (2)
          </li>
        </ul>

        <FileUpload
          files={files}
          onChange={setFiles}
          hint="Sube los documentos requeridos"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="bg-[#2D5A3D]/5 rounded-xl p-4"
      >
        <p className="text-sm text-[#1A1A1A]">
          Nuestro equipo B2B contactará en <span className="font-medium">48-72h</span> para activación.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="space-y-2"
      >
        <button className="w-full flex items-center justify-center gap-2 p-3 bg-white border rounded-xl hover:shadow-sm transition-shadow">
          <Phone className="w-5 h-5 text-[#2D5A3D]" />
          <span className="text-sm text-[#1A1A1A]">Solicitar llamada previa</span>
        </button>
      </motion.div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        onClick={() => { onComplete(); navigate('/'); }}
        className="w-full py-3 bg-[#2D5A3D] text-white rounded-xl font-medium hover:bg-[#234a31] transition-colors"
      >
        Finalizar registro
      </motion.button>
    </div>
  );
};

export default Step5Verification;
