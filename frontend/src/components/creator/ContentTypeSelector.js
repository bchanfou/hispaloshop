import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon, Film, Clock, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const contentTypes = [
  {
    id: 'post',
    icon: ImageIcon,
    title: 'social.post',
    defaultTitle: 'Publicación',
    description: 'social.postDesc',
    defaultDescription: 'Comparte fotos con tu comunidad. Ratio 1:1, 4:5 o 16:9.',
    color: 'bg-gradient-to-br from-blue-500 to-purple-600',
    maxFiles: 10,
  },
  {
    id: 'reel',
    icon: Film,
    title: 'social.reel',
    defaultTitle: 'Reel',
    description: 'social.reelDesc',
    defaultDescription: 'Video corto vertical. Mín 3s, máx 90s. Ratio 9:16 obligatorio.',
    color: 'bg-gradient-to-br from-pink-500 to-rose-600',
    maxFiles: 1,
    videoOnly: true,
  },
  {
    id: 'story',
    icon: Clock,
    title: 'social.story',
    defaultTitle: 'Historia',
    description: 'social.storyDesc',
    defaultDescription: 'Contenido temporal 24h. Máx 5 slides, 15s cada uno.',
    color: 'bg-gradient-to-br from-amber-400 to-orange-500',
    maxFiles: 5,
    maxDuration: 15,
  },
];

function ContentTypeSelector({ isOpen, onClose, onSelect }) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-md bg-white rounded-t-3xl md:rounded-3xl p-6 shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-heading font-semibold text-[#1A1A1A]">
              {t('social.createContent', 'Crear contenido')}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-stone-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-stone-500" />
            </button>
          </div>

          <div className="space-y-3">
            {contentTypes.map((type) => {
              const Icon = type.icon;
              return (
                <motion.button
                  key={type.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelect(type)}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl bg-stone-50 hover:bg-stone-100 transition-colors text-left group"
                >
                  <div className={`w-14 h-14 rounded-xl ${type.color} flex items-center justify-center shadow-lg`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-[#1A1A1A] group-hover:text-[#2D5A3D] transition-colors">
                      {t(type.title, type.defaultTitle)}
                    </h3>
                    <p className="text-sm text-stone-500 mt-0.5">
                      {t(type.description, type.defaultDescription)}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>

          <p className="text-center text-xs text-stone-400 mt-6">
            {t('social.contentTypesInfo', 'Elige el formato que mejor se adapte a tu contenido')}
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default ContentTypeSelector;
