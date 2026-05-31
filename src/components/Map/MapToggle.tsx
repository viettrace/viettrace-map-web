'use client';

import { useTranslations } from 'next-intl';

interface MapToggleProps {
  mode: 'pre' | 'post';
  onToggle: (mode: 'pre' | 'post') => void;
  // 'panel' drops the outer pill so the toggle can sit inside the unified
  // desktop control panel as one row among siblings.
  variant?: 'default' | 'panel';
}

export default function MapToggle({
  mode,
  onToggle,
  variant = 'default',
}: MapToggleProps) {
  const t = useTranslations('Map');
  const isPanel = variant === 'panel';
  const wrapperClass = isPanel
    ? 'flex items-center justify-between gap-3 px-3 py-2'
    : 'flex max-w-full flex-nowrap items-center gap-3 overflow-x-auto rounded-full bg-white/95 px-4 py-2 shadow-lg backdrop-blur-sm';

  return (
    <div className={wrapperClass}>
      <span
        className={`shrink-0 text-sm font-medium whitespace-nowrap transition-colors ${
          mode === 'pre' ? 'text-red-600' : 'text-gray-400'
        }`}
      >
        <span>{t('togglePre')}</span>
        {!isPanel && (
          <span className="ml-1 text-xs opacity-70">{t('togglePreLabel')}</span>
        )}
      </span>

      <button
        type="button"
        onClick={() => onToggle(mode === 'pre' ? 'post' : 'pre')}
        className="relative h-6 w-12 shrink-0 cursor-pointer rounded-full transition-colors focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:outline-none"
        style={{ backgroundColor: mode === 'pre' ? '#dc2626' : '#2563eb' }}
        aria-label={mode === 'pre' ? t('togglePost') : t('togglePre')}
      >
        <span
          className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
          style={{
            transform: mode === 'pre' ? 'translateX(0)' : 'translateX(24px)',
          }}
        />
      </button>

      <span
        className={`shrink-0 text-sm font-medium whitespace-nowrap transition-colors ${
          mode === 'post' ? 'text-blue-600' : 'text-gray-400'
        }`}
      >
        <span>{t('togglePost')}</span>
        {!isPanel && (
          <span className="ml-1 text-xs opacity-70">{t('togglePostLabel')}</span>
        )}
      </span>
    </div>
  );
}
