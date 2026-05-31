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
    return (
      <button
        type="button"
        onClick={() => onChange(next)}
        aria-pressed={isSwipe}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:ring-2 focus:ring-slate-400 focus:ring-offset-1 focus:outline-none focus:ring-inset"
      >
        <SwipeIcon className="h-4 w-4 shrink-0" />
        <span>{label}</span>
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
