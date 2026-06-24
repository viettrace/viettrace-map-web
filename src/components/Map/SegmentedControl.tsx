'use client';

interface SegmentedOption {
  value: string;
  label: string;
  // Override the active-segment background, e.g. 'bg-red-600' / 'bg-blue-600' for the pre/post
  // View control so it matches the boundary colours on the map. Defaults to 'bg-slate-900'.
  activeClassName?: string;
}

interface SegmentedControlProps {
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  ariaLabel?: string;
}

// The single control idiom across the map settings panel: a rounded pill split into segments,
// active segment filled (slate-900 by default), inactive segments quiet. Replaces the old mix of
// sliding switch + ad-hoc segmented buttons so every row reads the same way.
export default function SegmentedControl({
  options,
  value,
  onChange,
  disabled = false,
  ariaLabel,
}: SegmentedControlProps) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`inline-flex shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-50 ${
        disabled ? 'opacity-40' : ''
      }`}
    >
      {options.map(option => {
        const isActive = option.value === value;
        const activeBg = option.activeClassName ?? 'bg-slate-900';
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors focus:ring-2 focus:ring-slate-400 focus:outline-none disabled:cursor-not-allowed ${
              isActive
                ? `${activeBg} text-white`
                : 'text-slate-600' + (disabled ? '' : ' hover:bg-slate-100')
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
