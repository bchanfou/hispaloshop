import React, { useMemo } from 'react';
import { EDITOR_FILTERS } from '../../utils/editor/constants';

/* ─── Types ─── */
interface FilterPanelProps {
  imageUrl: string;
  activeFilter: string;
  intensity: number;
  onFilterChange: (filterKey: string) => void;
  onIntensityChange: (value: number) => void;
}

/* ─── Main Component ─── */
export default function FilterPanel({
  imageUrl,
  activeFilter,
  intensity,
  onFilterChange,
  onIntensityChange,
}: FilterPanelProps) {
  const showIntensity = activeFilter !== 'natural';

  return (
    <div className="py-3 px-4">
      {/* Filter thumbnails */}
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
        {EDITOR_FILTERS.map((filter) => (
          <FilterThumb
            key={filter.key}
            imageUrl={imageUrl}
            filterKey={filter.key}
            filterName={filter.name}
            filterCSS={filter.css}
            isActive={activeFilter === filter.key}
            onSelect={onFilterChange}
          />
        ))}
      </div>

      {/* Intensity slider */}
      {showIntensity && (
        <div className="mt-3 flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={100}
            value={intensity}
            onChange={(e) => onIntensityChange(Number(e.target.value))}
            className="flex-1 accent-stone-950"
          />
          <span className="text-xs text-stone-400 w-8 text-right shrink-0">
            {intensity}%
          </span>
        </div>
      )}
    </div>
  );
}

/* ─── Filter Thumbnail ─── */
interface FilterThumbProps {
  imageUrl: string;
  filterKey: string;
  filterName: string;
  filterCSS: string;
  isActive: boolean;
  onSelect: (filterKey: string) => void;
}

const FilterThumb = React.memo(function FilterThumb({
  imageUrl,
  filterKey,
  filterName,
  filterCSS,
  isActive,
  onSelect,
}: FilterThumbProps) {
  const style = useMemo(
    () => ({
      filter: filterCSS === 'none' ? undefined : filterCSS,
    }),
    [filterCSS],
  );

  return (
    <button
      onClick={() => onSelect(filterKey)}
      className="flex flex-col items-center gap-1.5 shrink-0"
    >
      <div
        className={`w-16 h-16 rounded-xl overflow-hidden ${
          isActive ? 'ring-2 ring-stone-950' : 'ring-1 ring-stone-200'
        }`}
      >
        <img
          src={imageUrl}
          alt={filterName}
          className="w-full h-full object-cover"
          style={style}
          draggable={false}
        />
      </div>
      <span
        className={`text-[10px] leading-none ${
          isActive
            ? 'font-semibold text-stone-900'
            : 'text-stone-500'
        }`}
      >
        {filterName}
      </span>
    </button>
  );
});
