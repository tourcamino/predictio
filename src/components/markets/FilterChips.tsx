import { X } from 'lucide-react';

interface FilterChip {
  id: string;
  label: string;
  onRemove: () => void;
}

interface FilterChipsProps {
  chips: FilterChip[];
  onClearAll: () => void;
}

export function FilterChips({ chips, onClearAll }: FilterChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap py-3">
      <span className="text-sm text-gray-400 font-medium">Active filters:</span>
      {chips.map((chip) => (
        <button
          key={chip.id}
          onClick={chip.onRemove}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-green/20 border border-brand-green/30 text-brand-green rounded-full text-sm font-medium hover:bg-brand-green/30 hover:scale-105 transition-all group"
        >
          <span>{chip.label}</span>
          <X className="w-3 h-3 group-hover:scale-110 transition-transform" />
        </button>
      ))}
      {chips.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-sm font-semibold text-gray-400 hover:text-white hover:underline transition-colors ml-2"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
