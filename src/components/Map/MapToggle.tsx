'use client';

import { useTranslations } from 'next-intl';

interface MapToggleProps {
  canToggleIslands?: boolean;
  mode: 'pre' | 'post';
  onToggle: (mode: 'pre' | 'post') => void;
  showIslands: boolean;
  onToggleIslands: (show: boolean) => void;
}

export default function MapToggle({
  canToggleIslands = true,
  mode,
  onToggle,
  showIslands,
  onToggleIslands,
}: MapToggleProps) {
  const t = useTranslations('Map');

  return (
    <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2 rounded-full bg-white/95 px-3 py-2 shadow-lg backdrop-blur-sm sm:gap-3 sm:px-4">
      <span
        className={`shrink-0 whitespace-nowrap text-xs font-medium transition-colors sm:text-sm ${
          mode === 'pre' ? 'text-red-600' : 'text-gray-400'
        }`}
      >
        <span>{t('togglePre')}</span>
        <span className="ml-1 hidden text-xs opacity-70 sm:inline">{t('togglePreLabel')}</span>
      </span>

      <button
        type="button"
        onClick={() => onToggle(mode === 'pre' ? 'post' : 'pre')}
        className="relative h-6 w-12 shrink-0 cursor-pointer rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
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

      {canToggleIslands && (
        <button
          type="button"
          onClick={() => onToggleIslands(!showIslands)}
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 sm:text-sm ${
            showIslands ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600'
          }`}
          aria-label={showIslands ? t('toggleIslandsHide') : t('toggleIslandsShow')}
        >
          {showIslands ? t('toggleIslandsOn') : t('toggleIslandsOff')}
        </button>
      )}

      <span
        className={`shrink-0 whitespace-nowrap text-xs font-medium transition-colors sm:text-sm ${
          mode === 'post' ? 'text-blue-600' : 'text-gray-400'
        }`}
      >
        <span>{t('togglePost')}</span>
        <span className="ml-1 hidden text-xs opacity-70 sm:inline">{t('togglePostLabel')}</span>
      </span>
    </div>
  );
}
