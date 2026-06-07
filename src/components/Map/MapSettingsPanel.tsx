'use client';

import { useEffect, useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import MapLanguageSwitch from '@src/components/Map/MapLanguageSwitch';
import MapToggle from '@src/components/Map/MapToggle';
import CompareModeToggle from '@src/components/Map/CompareModeToggle';
import { CloseIcon, MenuIcon } from '@src/components/Map/MapChromeIcons';
import type { ColorMode, CompareMode } from '@src/features/map-state/mapViewTypes';

interface MapSettingsPanelProps {
  colorMode: ColorMode;
  compareMode: CompareMode;
  mode: 'pre' | 'post';
  onColorModeChange: (colorMode: ColorMode) => void;
  onCompareModeChange: (compareMode: CompareMode) => void;
  onToggle: (mode: 'pre' | 'post') => void;
}

export default function MapSettingsPanel({
  colorMode,
  compareMode,
  mode,
  onColorModeChange,
  onCompareModeChange,
  onToggle,
}: MapSettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations('Map');
  const titleId = useId();
  const isSwipe = compareMode === 'swipe';

  // ESC closes the drawer. Mounted only while open to avoid a stray listener.
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-expanded={isOpen}
        aria-controls={titleId}
        aria-label={t('controlsOpen')}
        title={t('controlsOpen')}
        className="absolute top-3 left-3 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-700 shadow-lg backdrop-blur-sm transition-colors hover:bg-white focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:outline-none lg:top-4 lg:left-4"
      >
        <MenuIcon className="h-5 w-5" />
      </button>

      {/* Mobile-only backdrop: dims the map and closes the drawer on tap.
          Desktop keeps the map fully interactive while the drawer is open. */}
      <button
        type="button"
        aria-label={t('controlsClose')}
        tabIndex={-1}
        onClick={() => setIsOpen(false)}
        className={`fixed inset-0 z-40 cursor-default bg-slate-900/30 transition-opacity duration-200 lg:hidden ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        id={titleId}
        role="dialog"
        aria-modal={isOpen}
        aria-labelledby={`${titleId}-title`}
        aria-hidden={!isOpen}
        className={`fixed top-0 left-0 z-50 flex h-full w-80 max-w-[85vw] flex-col border-r border-slate-200 bg-white shadow-2xl transition-transform duration-200 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2
            id={`${titleId}-title`}
            className="text-base font-semibold text-slate-900"
          >
            {t('settingsTitle')}
          </h2>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label={t('controlsClose')}
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:ring-2 focus:ring-slate-400 focus:ring-offset-1 focus:outline-none"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {!isSwipe && (
            <Section title={t('settingsSectionView')}>
              <MapToggle mode={mode} onToggle={onToggle} variant="panel" />
            </Section>
          )}

          <Section title={t('settingsSectionCompare')}>
            <CompareModeToggle
              compareMode={compareMode}
              onChange={onCompareModeChange}
              variant="panel"
            />
          </Section>

          <Section title={t('settingsSectionColorMode')}>
            <div className="flex">
              <button
                type="button"
                onClick={() => onColorModeChange('default')}
                className={`flex-1 px-3 py-2.5 text-sm font-medium transition-colors first:rounded-l-xl last:rounded-r-xl ${
                  colorMode === 'default'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {t('colorModeDefault')}
              </button>
              <button
                type="button"
                onClick={() => onColorModeChange('region')}
                className={`flex-1 border-l border-slate-200 px-3 py-2.5 text-sm font-medium transition-colors first:rounded-l-xl last:rounded-r-xl ${
                  colorMode === 'region'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {t('colorModeRegion')}
              </button>
            </div>
          </Section>

          <Section title={t('settingsSectionLanguage')}>
            <MapLanguageSwitch variant="panel" />
          </Section>
        </div>
      </aside>
    </>
  );
}

function Section({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="mb-4 last:mb-0">
      <h3 className="mb-1.5 px-1 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
        {title}
      </h3>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {children}
      </div>
    </section>
  );
}
