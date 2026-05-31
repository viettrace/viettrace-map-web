'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { SearchIcon } from '@src/components/Map/MapChromeIcons';
import { searchProvinceIndex } from '@src/features/province-index/provinceIndexSearch';
import type { ProvinceIndexEntry } from '@src/features/province-index/provinceIndexTypes';
import { searchNestedIndex } from '@src/features/nested-index/nestedIndexSearch';
import type { NestedIndexEntry } from '@src/features/nested-index/nestedIndexTypes';

interface ProvinceSearchProps {
  entries: ProvinceIndexEntry[];
  hasError: boolean;
  isLoading: boolean;
  onSelect: (entry: ProvinceIndexEntry) => void;
  nestedEntries?: NestedIndexEntry[];
  onSelectNested?: (entry: NestedIndexEntry) => void;
}

type SearchResult =
  | { kind: 'province'; entry: ProvinceIndexEntry }
  | { kind: 'nested'; entry: NestedIndexEntry };

export default function ProvinceSearch({
  entries,
  hasError,
  isLoading,
  onSelect,
  nestedEntries = [],
  onSelectNested,
}: ProvinceSearchProps) {
  const t = useTranslations('Map');
  const locale = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const provinceResults = searchProvinceIndex(entries, query, { locale });
  const nestedResults =
    onSelectNested && nestedEntries.length > 0
      ? searchNestedIndex(nestedEntries, query, { locale })
      : [];
  const results: SearchResult[] = [
    ...provinceResults.map(entry => ({ kind: 'province' as const, entry })),
    ...nestedResults.map(entry => ({ kind: 'nested' as const, entry })),
  ];
  const showResults = isOpen && query.trim().length > 0;

  useEffect(() => {
    if (isExpanded) {
      inputRef.current?.focus();
    }
  }, [isExpanded]);

  function selectResult(result: SearchResult) {
    setQuery(
      result.kind === 'province'
        ? getProvinceResultName(result.entry, locale)
        : getNestedResultName(result.entry, locale),
    );
    setIsExpanded(false);
    setIsOpen(false);
    setActiveIndex(0);

    if (result.kind === 'province') {
      onSelect(result.entry);
    } else if (onSelectNested) {
      onSelectNested(result.entry);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      setIsOpen(false);

      if (!query.trim()) {
        setIsExpanded(false);
      }

      return;
    }

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
      const result = results[activeIndex];

      if (result) {
        selectResult(result);
      }

      return;
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={isLoading || hasError}
        onClick={() => setIsExpanded(true)}
        aria-label={t('searchLabel')}
        title={t('searchLabel')}
        className={`absolute top-3 right-3 z-40 h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-700 shadow-lg backdrop-blur-sm transition-colors hover:bg-white focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 lg:hidden ${
          isExpanded ? 'hidden' : 'flex'
        }`}
      >
        <SearchIcon className="h-5 w-5" />
      </button>

      <div
        className={`top-3 right-3 left-16 z-40 sm:absolute sm:right-3 sm:left-16 sm:w-auto md:left-auto md:w-[22rem] lg:top-4 lg:right-4 lg:left-auto lg:z-20 lg:block lg:w-[21rem] ${
          isExpanded ? 'absolute' : 'hidden'
        }`}
      >
        <div className="relative">
          <label className="sr-only" htmlFor="province-search">
            {t('searchLabel')}
          </label>
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 z-10 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            ref={inputRef}
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
            className="h-11 w-full rounded-lg border border-slate-200 bg-white/95 px-10 text-sm text-slate-950 shadow-lg backdrop-blur-sm transition-colors outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-300 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 sm:h-11 [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
          />

          {(query || isExpanded) && (
            <button
              type="button"
              onClick={() => {
                if (!query) {
                  setIsExpanded(false);
                  setIsOpen(false);
                  setActiveIndex(0);
                  return;
                }

                setQuery('');
                setIsOpen(false);
                setActiveIndex(0);
              }}
              aria-label={query ? t('searchClear') : t('searchClose')}
              title={query ? t('searchClear') : t('searchClose')}
              className={`absolute top-1/2 right-2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-base leading-none text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:ring-2 focus:ring-slate-300 focus:outline-none ${
                query ? '' : 'lg:hidden'
              }`}
            >
              ×
            </button>
          )}

          {showResults && (
            <div
              id={listboxId}
              role="listbox"
              className="absolute mt-2 max-h-[45dvh] w-full overflow-y-auto rounded-lg border border-slate-200 bg-white/95 py-1 text-sm shadow-xl backdrop-blur sm:max-h-80"
            >
              {results.length > 0 ? (
                results.map((result, index) => (
                  <button
                    key={result.entry.id}
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    onMouseDown={event => event.preventDefault()}
                    onClick={() => selectResult(result)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors ${
                      index === activeIndex ? 'bg-slate-100' : 'hover:bg-slate-50'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-slate-950">
                        {result.kind === 'province'
                          ? getProvinceResultName(result.entry, locale)
                          : getNestedResultName(result.entry, locale)}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {result.kind === 'province'
                          ? getProvinceSecondaryName(result.entry, locale)
                          : getNestedSecondaryName(result.entry, t)}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                        result.entry.mode === 'pre'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-blue-50 text-blue-700'
                      }`}
                    >
                      {getResultBadge(result, t)}
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
    </>
  );
}

function getProvinceResultName(entry: ProvinceIndexEntry, locale: string) {
  return locale === 'en' ? entry.name_en : entry.name;
}

function getProvinceSecondaryName(entry: ProvinceIndexEntry, locale: string) {
  return locale === 'en' ? entry.name : entry.name_en;
}

function getNestedResultName(entry: NestedIndexEntry, locale: string) {
  return locale === 'en' && entry.name_en ? entry.name_en : entry.name;
}

function getNestedSecondaryName(
  entry: NestedIndexEntry,
  t: ReturnType<typeof useTranslations<'Map'>>,
) {
  const typeLabel = entry.type === 'district' ? t('nestedTypeDistrict') : t('nestedTypeWard');

  if (entry.parentProvinceName) {
    return `${typeLabel} · ${entry.parentProvinceName}`;
  }

  return typeLabel;
}

function getResultBadge(
  result: SearchResult,
  t: ReturnType<typeof useTranslations<'Map'>>,
) {
  if (result.kind === 'nested') {
    return result.entry.type === 'district' ? t('nestedTypeDistrict') : t('nestedTypeWard');
  }

  return result.entry.mode === 'pre' ? t('searchResultPre') : t('searchResultPost');
}
