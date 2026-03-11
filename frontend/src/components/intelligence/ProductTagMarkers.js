import { ShoppingBag } from 'lucide-react';

export default function ProductTagMarkers({ tags = [], onSelect, ariaLabel = 'Abrir producto' }) {
  if (!tags.length) return null;

  return (
    <div className="pointer-events-none absolute inset-0">
      {tags.map((tag, index) => (
        <button
          key={`${tag.product_id || tag.id || 'tag'}-${index}`}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onSelect?.(tag);
          }}
          className="pointer-events-auto absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-black/85 text-white shadow-md transition-transform duration-150 hover:scale-105"
          style={{ left: `${tag.position?.x ?? tag.x ?? 50}%`, top: `${tag.position?.y ?? tag.y ?? 50}%` }}
          aria-label={`${ariaLabel}: ${tag.name || 'Producto'}`}
        >
          <ShoppingBag className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}
