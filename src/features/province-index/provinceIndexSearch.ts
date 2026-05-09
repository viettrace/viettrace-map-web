import type { MapMode, SelectedMapFeature } from '@src/features/map-state/mapViewTypes';
import { normalizeAdministrativeName, normalizeSearchText } from '@src/libs/geo/normalize';
import type { ProvinceIndexEntry } from './provinceIndexTypes';

const DEFAULT_SEARCH_LIMIT = 8;

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
  limit = DEFAULT_SEARCH_LIMIT,
) {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return [];
  }

  const normalizedAdministrativeQuery = normalizeAdministrativeName(query);
  const queryVariants = uniqueValues([normalizedQuery, normalizedAdministrativeQuery]).filter(
    Boolean,
  );

  return entries
    .map(entry => ({ entry, score: getProvinceSearchScore(entry, queryVariants) }))
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

      const aliases = getProvinceSearchAliases(entry);
      return normalizedNames.some(normalizedName => aliases.includes(normalizedName));
    }) || null
  );
}

function getProvinceSearchScore(entry: ProvinceIndexEntry, queryVariants: string[]) {
  const aliases = getProvinceSearchAliases(entry);
  const haystack = aliases.join(' ');
  let bestScore = 0;

  for (const query of queryVariants) {
    if (aliases.includes(query)) {
      bestScore = Math.max(bestScore, 100);
      continue;
    }

    if (aliases.some(alias => alias.startsWith(query))) {
      bestScore = Math.max(bestScore, 80);
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

function getProvinceSearchAliases(entry: ProvinceIndexEntry) {
  return uniqueValues([
    normalizeSearchText(entry.name),
    normalizeAdministrativeName(entry.name),
    normalizeSearchText(entry.name_en),
    normalizeAdministrativeName(entry.name_en),
    normalizeSearchText(entry.slug.replaceAll('-', ' ')),
  ]).filter(Boolean);
}

function uniqueValues(values: string[]) {
  return [...new Set(values)];
}
