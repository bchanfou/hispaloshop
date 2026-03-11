import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Film, Image as ImageIcon, Clock3, X, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const contentTypes = [
  {
    id: 'post',
    icon: ImageIcon,
    title: 'social.post',
    defaultTitle: 'Publicación',
    description: 'social.postDesc',
    defaultDescription: 'Comparte una imagen o un carrusel con texto, productos y una composición más editorial.',
    note: 'Ideal para fotos, carruseles y portada cuidada.',
  },
  {
    id: 'reel',
    icon: Film,
    title: 'social.reel',
    defaultTitle: 'Reel',
    description: 'social.reelDesc',
    defaultDescription: 'Vídeo vertical corto con una portada limpia y overlays discretos.',
    note: 'Pensado para 9:16 y ritmo rápido.',
  },
  {
    id: 'story',
    icon: Clock3,
    title: 'social.story',
    defaultTitle: 'Historia',
    description: 'social.storyDesc',
    defaultDescription: 'Historia efímera con texto libre, movimiento natural y formato inmersivo.',
    note: 'Perfecta para actualidad, producto o contexto breve.',
  },
];

function ContentTypeSelector({ isOpen, onClose, onSelect }) {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-3 backdrop-blur-sm md:items-center md:p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="w-full max-w-md rounded-3xl bg-white p-5 shadow-xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-stone-500">
                  Crear contenido
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">
                  Elige el formato
                </h2>
                <p className="mt-2 text-sm leading-6 text-stone-700">
                  Todo el flujo mantiene la misma edición: limpia, táctil y pensada para móvil.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-stone-700 transition-colors hover:bg-stone-200"
                aria-label="Cerrar selector de formato"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 space-y-3">
              {contentTypes.map((type, index) => {
                const Icon = type.icon;
                return (
                  <motion.button
                    key={type.id}
                    type="button"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    onClick={() => onSelect(type)}
                    className="group flex w-full items-start gap-4 rounded-2xl border border-stone-100 bg-stone-50 p-4 text-left transition-all hover:border-stone-200 hover:bg-white active:scale-[0.99]"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-950 shadow-sm">
                      <Icon className="h-5 w-5" strokeWidth={1.9} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-base font-semibold text-stone-950">
                          {t(type.title, type.defaultTitle)}
                        </h3>
                        <ArrowRight className="h-4 w-4 text-stone-400 transition-transform group-hover:translate-x-0.5 group-hover:text-stone-950" />
                      </div>
                      <p className="mt-1 text-sm leading-6 text-stone-700">
                        {t(type.description, type.defaultDescription)}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-stone-500">
                        {type.note}
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            <p className="mt-5 text-center text-xs leading-5 text-stone-500">
              Puedes escribir texto, emojis, hashtags y menciones de forma natural dentro del editor.
            </p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default ContentTypeSelector;
