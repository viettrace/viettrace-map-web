'use client';

import { useId, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { searchProvinceIndex } from '@src/features/province-index/provinceIndexSearch';
import type { ProvinceIndexEntry } from '@src/features/province-index/provinceIndexTypes';

interface ProvinceSearchProps {
  entries: ProvinceIndexEntry[];
  hasError: boolean;
  isLoading: boolean;
  onSelect: (entry: ProvinceIndexEntry) => void;
}

export default function ProvinceSearch({
  entries,
  hasError,
  isLoading,
  onSelect,
}: ProvinceSearchProps) {
  const t = useTranslations('Map');
  const locale = useLocale();
  const listboxId = useId();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const results = searchProvinceIndex(entries, query);
  const showResults = isOpen && query.trim().length > 0;

  function selectEntry(entry: ProvinceIndexEntry) {
    setQuery(getProvinceResultName(entry, locale));
    setIsOpen(false);
    setActiveIndex(0);
    onSelect(entry);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!showResults) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex(index => Math.min(index + 1, Math.max(results.length - 1, 0)));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex(index => Math.max(index - 1, 0));
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const entry = results[activeIndex];

      if (entry) {
        selectEntry(entry);
      }

      return;
    }

    if (event.key === 'Escape') {
      setIsOpen(false);
    }
  }

  return (
    <div className="absolute top-24 left-3 right-3 z-20 sm:top-4 sm:left-auto sm:right-4 sm:w-[21rem]">
      <div className="relative">
        <label className="sr-only" htmlFor="province-search">
          {t('searchLabel')}
        </label>
        <input
          id="province-search"
          type="search"
          value={query}
          disabled={isLoading || hasError}
          placeholder={
            isLoading
              ? t('searchLoading')
              : hasError
                ? t('searchUnavailable')
                : t('searchPlaceholder')
          }
          onChange={event => {
            setQuery(event.target.value);
            setActiveIndex(0);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={showResults}
          className="h-11 w-full rounded-lg border border-slate-200 bg-white/95 px-4 pr-10 text-sm text-slate-950 shadow-lg outline-none backdrop-blur-sm transition-colors placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-300 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
        />

        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setIsOpen(false);
              setActiveIndex(0);
            }}
            aria-label={t('searchClear')}
            title={t('searchClear')}
            className="absolute top-1/2 right-2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-base leading-none text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            ×
          </button>
        )}

        {showResults && (
          <div
            id={listboxId}
            role="listbox"
            className="absolute mt-2 max-h-80 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white/95 py-1 text-sm shadow-xl backdrop-blur"
          >
            {results.length > 0 ? (
              results.map((entry, index) => (
                <button
                  key={entry.id}
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseDown={event => event.preventDefault()}
                  onClick={() => selectEntry(entry)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors ${
                    index === activeIndex ? 'bg-slate-100' : 'hover:bg-slate-50'
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-slate-950">
                      {getProvinceResultName(entry, locale)}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {getProvinceSecondaryName(entry, locale)}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      entry.mode === 'pre'
                        ? 'bg-red-50 text-red-700'
                        : 'bg-blue-50 text-blue-700'
                    }`}
                  >
                    {entry.mode === 'pre' ? t('searchResultPre') : t('searchResultPost')}
                  </span>
                </button>
              ))
            ) : (
              <div className="px-3 py-3 text-sm text-slate-500">{t('searchNoResults')}</div>
            )}
          </div>
        )}

        {hasError && (
          <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50/95 px-3 py-2 text-xs text-amber-900 shadow-lg">
            {t('provinceIndexError')}
          </div>
        )}
      </div>
    </div>
  );
}

function getProvinceResultName(entry: ProvinceIndexEntry, locale: string) {
  return locale === 'en' ? entry.name_en : entry.name;
}

function getProvinceSecondaryName(entry: ProvinceIndexEntry, locale: string) {
  return locale === 'en' ? entry.name : entry.name_en;
}
