import type { MapMode, SelectedMapFeature } from '@src/features/map-state/mapViewTypes';
import { normalizeAdministrativeName, normalizeSearchText } from '@src/libs/geo/normalize';
import type { NestedFeatureType, NestedIndexEntry } from './nestedIndexTypes';

const DEFAULT_NESTED_SEARCH_LIMIT = 6;

type NestedSearchLocale = 'en' | 'vi';

interface NestedSearchOptions {
  limit?: number;
  locale?: NestedSearchLocale | string;
  mode?: MapMode;
}

interface ScoredNested {
  entry: NestedIndexEntry;
  score: number;
}

interface NestedFeatureProperties {
  name?: unknown;
  name_en?: unknown;
  parent_province_name?: unknown;
}

export function searchNestedIndex(
  entries: NestedIndexEntry[],
  query: string,
  options: NestedSearchOptions = {},
) {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return [];
  }

  const limit = options.limit ?? DEFAULT_NESTED_SEARCH_LIMIT;
  const locale = normalizeSearchLocale(options.locale);
  const modeFilter = options.mode;
  const normalizedAdministrativeQuery = normalizeAdministrativeName(query);
  const queryVariants = uniqueValues([normalizedQuery, normalizedAdministrativeQuery]).filter(
    Boolean,
  );

  return entries
    .filter(entry => (modeFilter ? entry.mode === modeFilter : true))
    .map(entry => ({ entry, score: getNestedSearchScore(entry, queryVariants, locale) }))
    .filter((result): result is ScoredNested => result.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      if (a.entry.mode !== b.entry.mode) {
        return a.entry.mode === 'pre' ? -1 : 1;
      }

      return normalizeAdministrativeName(a.entry.name).localeCompare(
        normalizeAdministrativeName(b.entry.name),
      );
    })
    .slice(0, limit)
    .map(result => result.entry);
}

export function findNestedBySlug(
  entries: NestedIndexEntry[],
  mode: MapMode,
  type: NestedFeatureType,
  slug: string,
) {
  return (
    entries.find(entry => entry.mode === mode && entry.type === type && entry.slug === slug) || null
  );
}

export function findNestedBySelection(
  entries: NestedIndexEntry[],
  selectedFeature: SelectedMapFeature | null,
) {
  if (!selectedFeature || selectedFeature.type !== 'nested') {
    return null;
  }

  return findNestedBySlug(
    entries,
    selectedFeature.mode,
    selectedFeature.featureType,
    selectedFeature.slug,
  );
}

export function findNestedByMapFeature(
  entries: NestedIndexEntry[],
  mode: MapMode,
  type: NestedFeatureType,
  properties: NestedFeatureProperties,
) {
  const name = typeof properties.name === 'string' ? properties.name : null;
  const nameEn = typeof properties.name_en === 'string' ? properties.name_en : null;
  const parent =
    typeof properties.parent_province_name === 'string' ? properties.parent_province_name : null;

  if (!name && !nameEn) {
    return null;
  }

  const normalizedNames = uniqueValues([
    name ? normalizeSearchText(name) : '',
    name ? normalizeAdministrativeName(name) : '',
    nameEn ? normalizeSearchText(nameEn) : '',
    nameEn ? normalizeAdministrativeName(nameEn) : '',
  ]).filter(Boolean);

  const normalizedParent = parent ? normalizeAdministrativeName(parent) : null;

  let fallback: NestedIndexEntry | null = null;

  for (const entry of entries) {
    if (entry.mode !== mode || entry.type !== type) {
      continue;
    }

    const aliases = getNestedSearchAliases(entry, 'vi').map(alias => alias.value);

    if (!normalizedNames.some(value => aliases.includes(value))) {
      continue;
    }

    if (!fallback) {
      fallback = entry;
    }

    if (
      normalizedParent &&
      normalizeAdministrativeName(entry.parentProvinceName) === normalizedParent
    ) {
      return entry;
    }
  }

  return fallback;
}

function getNestedSearchScore(
  entry: NestedIndexEntry,
  queryVariants: string[],
  locale: NestedSearchLocale,
) {
  const aliases = getNestedSearchAliases(entry, locale);
  const haystack = aliases.map(alias => alias.value).join(' ');
  let bestScore = 0;

  for (const query of queryVariants) {
    const exactMatch = aliases.find(alias => alias.value === query);

    if (exactMatch) {
      bestScore = Math.max(bestScore, 100 + exactMatch.priority);
      continue;
    }

    const prefixMatch = aliases.find(alias => alias.value.startsWith(query));

    if (prefixMatch) {
      bestScore = Math.max(bestScore, 80 + prefixMatch.priority);
      continue;
    }

    if (haystack.includes(query)) {
      bestScore = Math.max(bestScore, 60);
      continue;
    }

    const queryTokens = query.split(' ').filter(Boolean);

    if (queryTokens.length > 1 && queryTokens.every(token => haystack.includes(token))) {
      bestScore = Math.max(bestScore, 40);
    }
  }

  return bestScore;
}

function getNestedSearchAliases(entry: NestedIndexEntry, locale: NestedSearchLocale) {
  const preferredName = locale === 'en' && entry.name_en ? entry.name_en : entry.name;
  const fallbackName = locale === 'en' ? entry.name : entry.name_en;

  return uniqueAliases([
    { priority: 8, value: normalizeSearchText(preferredName) },
    { priority: 8, value: normalizeAdministrativeName(preferredName) },
    { priority: 2, value: fallbackName ? normalizeSearchText(fallbackName) : '' },
    { priority: 2, value: fallbackName ? normalizeAdministrativeName(fallbackName) : '' },
    { priority: 0, value: normalizeSearchText(entry.slug.replaceAll('-', ' ')) },
  ]);
}

function uniqueValues(values: string[]) {
  return [...new Set(values)];
}

function uniqueAliases(aliases: Array<{ priority: number; value: string }>) {
  const byValue = new Map<string, { priority: number; value: string }>();

  for (const alias of aliases) {
    if (!alias.value) {
      continue;
    }

    const existingAlias = byValue.get(alias.value);

    if (!existingAlias || alias.priority > existingAlias.priority) {
      byValue.set(alias.value, alias);
    }
  }

  return [...byValue.values()];
}

function normalizeSearchLocale(locale: NestedSearchOptions['locale']): NestedSearchLocale {
  return locale === 'en' ? 'en' : 'vi';
}
