import type { MapMode, SelectedMapFeature } from '@src/features/map-state/mapViewTypes';
import { normalizeAdministrativeName, normalizeSearchText } from '@src/libs/geo/normalize';
import type { ProvinceIndexEntry } from './provinceIndexTypes';

const DEFAULT_SEARCH_LIMIT = 8;

type ProvinceSearchLocale = 'en' | 'vi';

interface ProvinceSearchOptions {
  limit?: number;
  locale?: ProvinceSearchLocale | string;
}

interface ScoredProvince {
  entry: ProvinceIndexEntry;
  score: number;
}

interface ProvinceFeatureProperties {
  name?: unknown;
  name_en?: unknown;
}

export function searchProvinceIndex(
  entries: ProvinceIndexEntry[],
  query: string,
  options: ProvinceSearchOptions | number = {},
) {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return [];
  }

  const limit = typeof options === 'number' ? options : (options.limit ?? DEFAULT_SEARCH_LIMIT);
  const locale = typeof options === 'number' ? 'vi' : normalizeSearchLocale(options.locale);
  const normalizedAdministrativeQuery = normalizeAdministrativeName(query);
  const queryVariants = uniqueValues([normalizedQuery, normalizedAdministrativeQuery]).filter(
    Boolean,
  );

  return entries
    .map(entry => ({ entry, score: getProvinceSearchScore(entry, queryVariants, locale) }))
    .filter((result): result is ScoredProvince => result.score > 0)
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

export function findProvinceBySelection(
  entries: ProvinceIndexEntry[],
  selectedFeature: SelectedMapFeature | null,
) {
  if (!selectedFeature) {
    return null;
  }

  return findProvinceBySlug(entries, selectedFeature.mode, selectedFeature.slug);
}

export function findProvinceBySlug(entries: ProvinceIndexEntry[], mode: MapMode, slug: string) {
  return entries.find(entry => entry.mode === mode && entry.slug === slug) || null;
}

export function findProvinceByMapFeature(
  entries: ProvinceIndexEntry[],
  mode: MapMode,
  properties: ProvinceFeatureProperties,
) {
  const name = typeof properties.name === 'string' ? properties.name : null;
  const nameEn = typeof properties.name_en === 'string' ? properties.name_en : null;

  if (!name && !nameEn) {
    return null;
  }

  const normalizedNames = uniqueValues([
    name ? normalizeSearchText(name) : '',
    name ? normalizeAdministrativeName(name) : '',
    nameEn ? normalizeSearchText(nameEn) : '',
    nameEn ? normalizeAdministrativeName(nameEn) : '',
  ]).filter(Boolean);

  return (
    entries.find(entry => {
      if (entry.mode !== mode) {
        return false;
      }

      const aliases = getProvinceSearchAliases(entry, 'vi');
      return normalizedNames.some(normalizedName =>
        aliases.some(alias => alias.value === normalizedName),
      );
    }) || null
  );
}

function getProvinceSearchScore(
  entry: ProvinceIndexEntry,
  queryVariants: string[],
  locale: ProvinceSearchLocale,
) {
  const aliases = getProvinceSearchAliases(entry, locale);
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

function getProvinceSearchAliases(entry: ProvinceIndexEntry, locale: ProvinceSearchLocale) {
  const preferredName = locale === 'en' ? entry.name_en : entry.name;
  const fallbackName = locale === 'en' ? entry.name : entry.name_en;

  return uniqueAliases([
    { priority: 8, value: normalizeSearchText(preferredName) },
    { priority: 8, value: normalizeAdministrativeName(preferredName) },
    { priority: 2, value: normalizeSearchText(fallbackName) },
    { priority: 2, value: normalizeAdministrativeName(fallbackName) },
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

function normalizeSearchLocale(locale: ProvinceSearchOptions['locale']): ProvinceSearchLocale {
  return locale === 'en' ? 'en' : 'vi';
}
