'use client';

import { useTranslations } from 'next-intl';
import type { CompareMode } from '@src/features/map-state/mapViewTypes';

interface CompareModeToggleProps {
  compareMode: CompareMode;
  onChange: (compareMode: CompareMode) => void;
  // 'toolbar' = mobile vertical strip; 'panel' = desktop unified panel row.
  variant?: 'default' | 'toolbar' | 'panel';
}

export default function CompareModeToggle({
  compareMode,
  onChange,
  variant = 'default',
}: CompareModeToggleProps) {
  const t = useTranslations('Map');
  const isSwipe = compareMode === 'swipe';
  const next: CompareMode = isSwipe ? 'toggle' : 'swipe';
  const label = isSwipe ? t('compareSwitchToToggle') : t('compareSwitchToSwipe');

  if (variant === 'toolbar') {
    return (
      <button
        type="button"
        onClick={() => onChange(next)}
        aria-label={label}
        aria-pressed={isSwipe}
        title={label}
        className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors focus:ring-2 focus:ring-slate-400 focus:ring-offset-1 focus:outline-none ${
          isSwipe ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
        }`}
      >
        <SwipeIcon className="h-4 w-4" />
      </button>
    );
  }

  if (variant === 'panel') {
    // Compact right-aligned pill that sits in a settings row (label on the left). The long
    // descriptive label stays as the accessible name; the pill shows a short on/off word.
    const shortLabel = isSwipe ? t('compareDisableShort') : t('compareEnableShort');
    return (
      <button
        type="button"
        onClick={() => onChange(next)}
        aria-pressed={isSwipe}
        aria-label={label}
        title={label}
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus:ring-2 focus:ring-slate-400 focus:outline-none ${
          isSwipe
            ? 'border-slate-300 text-slate-700 hover:bg-slate-100'
            : 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800'
        }`}
      >
        <SwipeIcon className="h-3.5 w-3.5 shrink-0" />
        <span>{shortLabel}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onChange(next)}
      aria-pressed={isSwipe}
      className="flex max-w-full items-center gap-2 rounded-full bg-white/95 px-3 py-2 text-sm font-medium text-slate-700 shadow-lg backdrop-blur-sm transition-colors hover:bg-white focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:outline-none"
    >
      <SwipeIcon className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );
}

function SwipeIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      focusable="false"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M12 5v14" />
      <path d="m8 9-2 3 2 3" />
      <path d="m16 9 2 3-2 3" />
    </svg>
  );
}
