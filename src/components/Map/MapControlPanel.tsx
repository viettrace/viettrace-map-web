'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import MapLanguageSwitch from '@src/components/Map/MapLanguageSwitch';
import MapToggle from '@src/components/Map/MapToggle';
import { SlidersIcon } from '@src/components/Map/MapChromeIcons';

interface MapControlPanelProps {
  canToggleIslands?: boolean;
  mode: 'pre' | 'post';
  onToggle: (mode: 'pre' | 'post') => void;
  showIslands: boolean;
  onToggleIslands: (show: boolean) => void;
}

export default function MapControlPanel({
  canToggleIslands,
  mode,
  onToggle,
  showIslands,
  onToggleIslands,
}: MapControlPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations('Map');

  return (
    <div className="absolute top-3 left-3 z-40 flex w-11 flex-col items-stretch gap-1.5 lg:top-4 lg:left-4 lg:w-auto">
      <button
        type="button"
        onClick={() => setIsOpen(open => !open)}
        aria-expanded={isOpen}
        aria-label={isOpen ? t('controlsClose') : t('controlsOpen')}
        title={isOpen ? t('controlsClose') : t('controlsOpen')}
        className={`flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/95 shadow-lg backdrop-blur-sm transition-colors hover:bg-white focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:outline-none lg:hidden ${
          mode === 'pre' ? 'text-red-600' : 'text-blue-600'
        }`}
      >
        <SlidersIcon className="h-5 w-5" />
      </button>

      <div
        className={`w-11 flex-col items-stretch gap-1 rounded-full border border-slate-200 bg-white/95 p-1 text-[10px] font-bold shadow-lg backdrop-blur-sm lg:hidden ${
          isOpen ? 'flex' : 'hidden'
        }`}
      >
        <button
          type="button"
          onClick={() => onToggle('pre')}
          aria-label={t('togglePre')}
          aria-pressed={mode === 'pre'}
          className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors focus:ring-2 focus:ring-red-400 focus:ring-offset-1 focus:outline-none ${
            mode === 'pre' ? 'bg-red-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {t('togglePreShort')}
        </button>
        <button
          type="button"
          onClick={() => onToggle('post')}
          aria-label={t('togglePost')}
          aria-pressed={mode === 'post'}
          className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 focus:outline-none ${
            mode === 'post' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {t('togglePostShort')}
        </button>
        {canToggleIslands && (
          <button
            type="button"
            onClick={() => onToggleIslands(!showIslands)}
            aria-label={showIslands ? t('toggleIslandsHide') : t('toggleIslandsShow')}
            aria-pressed={showIslands}
            className={`flex h-9 w-9 items-center justify-center rounded-full text-[9px] transition-colors focus:ring-2 focus:ring-teal-400 focus:ring-offset-1 focus:outline-none ${
              showIslands ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t('toggleIslandsShort')}
          </button>
        )}
        <div className="mx-1 my-0.5 h-px bg-slate-200" />
        <MapLanguageSwitch variant="toolbar" />
      </div>

      <div className="hidden flex-col items-start gap-2 lg:flex">
        <MapToggle
          canToggleIslands={canToggleIslands}
          mode={mode}
          onToggle={onToggle}
          showIslands={showIslands}
          onToggleIslands={onToggleIslands}
        />
        <MapLanguageSwitch />
      </div>
    </div>
  );
}
