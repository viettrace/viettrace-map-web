'use client';

import { useEffect, useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import MapLanguageSwitch from '@src/components/Map/MapLanguageSwitch';
import SegmentedControl from '@src/components/Map/SegmentedControl';
import CompareModeToggle from '@src/components/Map/CompareModeToggle';
import { CloseIcon, MenuIcon } from '@src/components/Map/MapChromeIcons';
import type { ColorMode, CompareMode } from '@src/features/map-state/mapViewTypes';

interface MapSettingsPanelProps {
  boundariesVisible: boolean;
  colorMode: ColorMode;
  compareMode: CompareMode;
  mode: 'pre' | 'post';
  onBoundariesChange: (visible: boolean) => void;
  onColorModeChange: (colorMode: ColorMode) => void;
  onCompareModeChange: (compareMode: CompareMode) => void;
  onToggle: (mode: 'pre' | 'post') => void;
}

export default function MapSettingsPanel({
  boundariesVisible,
  colorMode,
  compareMode,
  mode,
  onBoundariesChange,
  onColorModeChange,
  onCompareModeChange,
  onToggle,
}: MapSettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations('Map');
  const titleId = useId();
  const isSwipe = compareMode === 'swipe';
  // View (pre/post) and color mode are children of the boundary overlay — they only do something
  // while it's shown. When boundaries are hidden, grey the child group out (Compare stays usable).
  const overlayHidden = !boundariesVisible && !isSwipe;

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

        <div className="flex-1 overflow-y-auto px-4 py-2">
          {/* Boundary overlay group: the master row, with View + Colors as indented children that
              dim + disable together when the overlay is off. Hidden entirely in swipe compare. */}
          {!isSwipe && (
            <>
              <SettingRow label={t('settingsSectionBoundaries')}>
                <SegmentedControl
                  ariaLabel={t('settingsSectionBoundaries')}
                  value={boundariesVisible ? 'show' : 'hide'}
                  onChange={value => onBoundariesChange(value === 'show')}
                  options={[
                    { value: 'show', label: t('boundariesShow') },
                    { value: 'hide', label: t('boundariesHide') },
                  ]}
                />
              </SettingRow>

              <div
                className={`ml-1 border-l-2 border-slate-200 pl-3 ${
                  overlayHidden ? 'opacity-40' : ''
                }`}
              >
                <SettingRow label={t('settingsSectionView')}>
                  <SegmentedControl
                    ariaLabel={t('settingsSectionView')}
                    disabled={overlayHidden}
                    value={mode}
                    onChange={value => onToggle(value as 'pre' | 'post')}
                    options={[
                      { value: 'pre', label: t('togglePre'), activeClassName: 'bg-red-600' },
                      { value: 'post', label: t('togglePost'), activeClassName: 'bg-blue-600' },
                    ]}
                  />
                </SettingRow>
                <SettingRow label={t('settingsSectionColorMode')}>
                  <SegmentedControl
                    ariaLabel={t('settingsSectionColorMode')}
                    disabled={overlayHidden}
                    value={colorMode}
                    onChange={value => onColorModeChange(value as ColorMode)}
                    options={[
                      { value: 'default', label: t('colorModeDefault') },
                      { value: 'region', label: t('colorModeRegion') },
                    ]}
                  />
                </SettingRow>
              </div>
              {overlayHidden && (
                <p className="mt-1 pl-4 text-[11px] text-slate-400">
                  {t('controlsNeedBoundaries')}
                </p>
              )}

              <div className="my-2.5 border-t border-slate-100" />
            </>
          )}

          <SettingRow label={t('settingsSectionCompare')}>
            <CompareModeToggle
              compareMode={compareMode}
              onChange={onCompareModeChange}
              variant="panel"
            />
          </SettingRow>
        </div>

        {/* Language is an app setting, not a map control — pin it to a separated footer. */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-2.5">
          <span className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
            {t('settingsSectionLanguage')}
          </span>
          <MapLanguageSwitch variant="panel" />
        </div>
      </aside>
    </>
  );
}

// One settings row: label on the left, control on the right. The row label names the control, so
// the panel needs no separate uppercase section headers.
function SettingRow({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="text-sm font-medium text-slate-800">{label}</span>
      {children}
    </div>
  );
}
