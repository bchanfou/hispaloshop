import React from 'react';
import FocusTrap from 'focus-trap-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Film, Image as ImageIcon, Clock3, X, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const contentTypes = [
  {
    id: 'post',
    icon: ImageIcon,
    title: 'social.post',
    defaultTitle: 'Post',
    shortLabel: 'Foto o carrusel',
  },
  {
    id: 'reel',
    icon: Film,
    title: 'social.reel',
    defaultTitle: 'Reel',
    shortLabel: 'Video vertical',
  },
  {
    id: 'story',
    icon: Clock3,
    title: 'social.story',
    defaultTitle: 'Historia',
    shortLabel: '24 h',
  },
];

function ContentTypeSelector({ isOpen, onClose, onSelect }) {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {isOpen ? (
        <FocusTrap focusTrapOptions={{ escapeDeactivates: false, allowOutsideClick: true, returnFocusOnDeactivate: true }}>
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
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-stone-500">Crear</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">Elige uno</h2>
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
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-stone-950">
                          {t(type.title, type.defaultTitle)}
                        </h3>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-stone-600 ring-1 ring-stone-200">
                        {type.shortLabel}
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-stone-400 transition-transform group-hover:translate-x-0.5 group-hover:text-stone-950" />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
        </FocusTrap>
      ) : null}
    </AnimatePresence>
  );
}

export default ContentTypeSelector;
