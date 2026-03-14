import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hash } from 'lucide-react';
import { getCloudinarySrcSet } from '../../utils/cloudinary';

export default function AutocompleteDropdown({
  isOpen,
  trigger,
  suggestions,
  activeIndex,
  onSelect,
}) {
  const activeRef = useRef(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 420, damping: 30 }}
          className="absolute bottom-full left-0 right-0 z-[200] mb-1.5 max-h-[280px] overflow-hidden overflow-y-auto rounded-xl border border-stone-100 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.10),0_1px_4px_rgba(0,0,0,0.06)]"
        >
          {suggestions.map((item, i) => (
            <button
              key={trigger === '#' ? item.name : item.id}
              ref={i === activeIndex ? activeRef : null}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(item);
              }}
              className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-stone-50 ${
                i === activeIndex ? 'bg-stone-50' : ''
              } ${i < suggestions.length - 1 ? 'border-b border-stone-50' : ''}`}
            >
              {trigger === '#' ? (
                <>
                  <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-stone-100">
                    <Hash className="h-4 w-4 text-stone-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium text-stone-950">#{item.name}</p>
                    <p className="text-[12px] text-stone-400">
                      {(item.post_count || 0).toLocaleString('es-ES')} posts
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="relative shrink-0">
                    <div className="h-[34px] w-[34px] overflow-hidden rounded-full bg-stone-100">
                      {item.avatar_url ? (
                        <img
                          src={item.avatar_url}
                          srcSet={getCloudinarySrcSet(item.avatar_url, [34, 68, 102])}
                          sizes="34px"
                          alt={item.username}
                          loading="lazy"
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[12px] font-semibold text-stone-400">
                          {(item.username?.[0] || '?').toUpperCase()}
                        </div>
                      )}
                    </div>
                    {item.is_verified ? (
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-[12px] w-[12px] items-center justify-center rounded-full bg-stone-950 text-[6px] font-bold text-white ring-[1.5px] ring-white">
                        ✓
                      </span>
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-stone-950">
                      @{item.username}
                    </p>
                    {item.full_name ? (
                      <p className="truncate text-[12px] text-stone-400">{item.full_name}</p>
                    ) : null}
                  </div>
                </>
              )}
            </button>
          ))}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
