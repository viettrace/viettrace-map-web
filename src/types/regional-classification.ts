/**
 * Regional Classification Types
 *
 * Type definitions for Vietnam's 6 economic regions classification
 * based on Resolution 60-NQ/TW (April 12, 2025)
 */

/**
 * Vietnam's 6 economic regions per Resolution 60-NQ/TW
 */
export type Region =
  | 'Northern_Midlands_Mountains'
  | 'Red_River_Delta'
  | 'North_Central_Coast'
  | 'South_Central_Coast_Highlands'
  | 'Southeast'
  | 'Mekong_River_Delta';

/**
 * Regional definition with multilingual names and province list
 */
export interface RegionalDefinition {
  name_vi: string;
  name_en: string;
  provinces: string[];
}

/**
 * Regional classification data structure
 */
export interface RegionalClassification {
  version: string;
  source: string;
  lastUpdated: string;
  description: string;
  regions: Record<Region, RegionalDefinition>;
  provinceToRegion: Record<string, Region>;
  stats: {
    total_provinces: number;
    regions: Record<Region, number>;
  };
  notes?: string[];
}

/**
 * Region metadata for display
 */
export interface RegionMetadata {
  key: Region;
  name_vi: string;
  name_en: string;
  provinceCount: number;
}

/**
 * Utility functions for regional classification
 */

let cachedClassification: RegionalClassification | null = null;

/**
 * Load and cache regional classification data
 */
export async function loadRegionalClassification(): Promise<RegionalClassification> {
  if (cachedClassification) {
    return cachedClassification;
  }

  const response = await fetch('/data/regional-classification.json');
  if (!response.ok) {
    throw new Error(`Failed to load regional classification: ${response.statusText}`);
  }

  cachedClassification = (await response.json()) as RegionalClassification;
  return cachedClassification;
}

/**
 * Get the region for a given province slug
 *
 * @param provinceSlug - Province slug (e.g., 'ha-noi', 'ho-chi-minh')
 * @returns Region key or null if not found
 *
 * @example
 * ```ts
 * const region = await getProvinceRegion('ha-noi');
 * console.log(region); // 'Red_River_Delta'
 * ```
 */
export async function getProvinceRegion(provinceSlug: string): Promise<Region | null> {
  const classification = await loadRegionalClassification();
  return classification.provinceToRegion[provinceSlug] || null;
}

/**
 * Get all provinces in a region
 *
 * @param region - Region key
 * @returns Array of province slugs
 *
 * @example
 * ```ts
 * const provinces = await getProvincesByRegion('Red_River_Delta');
 * console.log(provinces); // ['ha-noi', 'hai-phong', ...]
 * ```
 */
export async function getProvincesByRegion(region: Region): Promise<string[]> {
  const classification = await loadRegionalClassification();
  return classification.regions[region]?.provinces || [];
}

/**
 * Get region metadata for display (name, province count)
 *
 * @param region - Region key
 * @returns Region metadata object
 *
 * @example
 * ```ts
 * const metadata = await getRegionMetadata('Red_River_Delta');
 * console.log(metadata.name_en); // 'Red River Delta'
 * console.log(metadata.provinceCount); // 10
 * ```
 */
export async function getRegionMetadata(region: Region): Promise<RegionMetadata | null> {
  const classification = await loadRegionalClassification();
  const regionData = classification.regions[region];

  if (!regionData) {
    return null;
  }

  return {
    key: region,
    name_vi: regionData.name_vi,
    name_en: regionData.name_en,
    provinceCount: classification.stats.regions[region],
  };
}

/**
 * Get all region metadata (for dropdowns, filters, etc.)
 *
 * @returns Array of region metadata objects
 *
 * @example
 * ```ts
 * const allRegions = await getAllRegionMetadata();
 * allRegions.forEach(r => console.log(r.name_en, r.provinceCount));
 * ```
 */
export async function getAllRegionMetadata(): Promise<RegionMetadata[]> {
  const classification = await loadRegionalClassification();

  return Object.entries(classification.regions).map(([key, data]) => ({
    key: key as Region,
    name_vi: data.name_vi,
    name_en: data.name_en,
    provinceCount: classification.stats.regions[key as Region],
  }));
}

/**
 * Synchronous version - requires pre-loaded classification
 */

/**
 * Get province region (sync, requires pre-loaded data via loadRegionalClassification)
 *
 * @param provinceSlug - Province slug
 * @returns Region key or null if not found
 * @throws Error if classification data not loaded
 */
export function getProvinceRegionSync(provinceSlug: string): Region | null {
  if (!cachedClassification) {
    throw new Error('Regional classification not loaded. Call loadRegionalClassification() first.');
  }
  return cachedClassification.provinceToRegion[provinceSlug] || null;
}

/**
 * Get provinces by region (sync, requires pre-loaded data)
 *
 * @param region - Region key
 * @returns Array of province slugs
 * @throws Error if classification data not loaded
 */
export function getProvincesByRegionSync(region: Region): string[] {
  if (!cachedClassification) {
    throw new Error('Regional classification not loaded. Call loadRegionalClassification() first.');
  }
  return cachedClassification.regions[region]?.provinces || [];
}

/**
 * Check if classification data is loaded
 */
export function isRegionalClassificationLoaded(): boolean {
  return cachedClassification !== null;
}

/**
 * Clear cached classification (for testing/reloading)
 */
export function clearRegionalClassificationCache(): void {
  cachedClassification = null;
}
