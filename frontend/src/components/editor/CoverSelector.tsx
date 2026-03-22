// @ts-nocheck
import React, { useRef, useCallback } from 'react';
import { Camera } from 'lucide-react';

/* ─── Types ─── */
interface CoverSelectorProps {
  frames: string[];
  selectedIndex: number;
  customCover: string | null;
  onSelect: (index: number) => void;
  onUpload: (file: File) => void;
}

/* ─── Component ─── */
const CoverSelector: React.FC<CoverSelectorProps> = ({
  frames,
  selectedIndex,
  customCover,
  onSelect,
  onUpload,
}) => {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = useCallback(() => {
    fileRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onUpload(file);
        // Reset input so same file can be re-selected
        e.target.value = '';
      }
    },
    [onUpload]
  );

  // -1 means custom cover is selected
  const isCustomSelected = selectedIndex === -1 && customCover;

  return (
    <div className="grid grid-cols-3 gap-2">
      {/* Frame thumbnails (up to 5) */}
      {frames.slice(0, 5).map((src, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelect(i)}
          className={`
            aspect-[9/16] rounded-xl overflow-hidden relative
            transition-all duration-150
            ${selectedIndex === i && !isCustomSelected ? 'ring-2 ring-stone-950' : 'ring-1 ring-stone-200'}
          `}
          aria-label={`Portada fotograma ${i + 1}`}
          aria-pressed={selectedIndex === i && !isCustomSelected}
        >
          <img
            src={src}
            alt=""
            className="w-full h-full object-cover"
            draggable={false}
          />
        </button>
      ))}

      {/* Upload button */}
      <button
        type="button"
        onClick={handleUploadClick}
        className={`
          aspect-[9/16] rounded-xl overflow-hidden relative
          flex flex-col items-center justify-center gap-1
          border-2 border-dashed transition-all duration-150
          ${
            isCustomSelected
              ? 'border-stone-950 ring-2 ring-stone-950'
              : 'border-stone-200 hover:border-stone-400'
          }
          bg-stone-50
        `}
        aria-label="Subir portada personalizada"
      >
        {customCover ? (
          <img
            src={customCover}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <>
            <Camera className="w-5 h-5 text-stone-400" />
            <span className="text-[10px] text-stone-400 font-medium">Subir</span>
          </>
        )}
      </button>

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
};

export default CoverSelector;
