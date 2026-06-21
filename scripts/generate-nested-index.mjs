import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  compareAdministrativeName,
  computeBbox,
  computeVisualCenter,
  createSlug,
  latinizeVietnamese,
  readJson,
  roundBbox,
  writeJson,
} from './province-index-utils.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspaceRoot = path.resolve(repoRoot, '..');
const dataRoot = process.env.VIETTRACE_DATA_DIR
  ? path.resolve(process.env.VIETTRACE_DATA_DIR)
  : path.join(workspaceRoot, 'viettrace-data');
const publicDataRoot = path.join(repoRoot, 'public', 'data');

const sources = {
  preDistricts: '.data/processed/import/vn_pre_2025_districts_candidate.geojson',
  postWards: '.data/processed/import/vn_post_2025_wards_candidate.geojson',
};

// The Hoàng Sa / Trường Sa archipelago entries are administrative gap-fills whose polygon is excluded
// from the rendered nested layer (the OSM offshore-islands layer draws the territory). Source their
// search fly-to extent from that SAME OSM island geometry (ODbL) so the index carries no
// geoBoundaries-derived coordinates. Matched by the unique "Hoàng Sa" / "Trường Sa" in the name.
const OFFSHORE_ISLANDS_PATH = 'processed/islands/vn_offshore_islands.geojson';

function applyOffshoreIslandOverrides(features) {
  const islands = readJson(resolveDataPath(OFFSHORE_ISLANDS_PATH));
  const byName = new Map();
  for (const feature of islands.features ?? []) {
    const key = feature.properties?.name_vi;
    if (!key || !feature.geometry) continue;
    const bbox = roundBbox(computeBbox(feature.geometry));
    byName.set(key, { bbox, center: computeVisualCenter(feature.geometry, bbox) });
  }

  let overridden = 0;
  for (const entry of features) {
    const island = entry.name.includes('Hoàng Sa')
      ? byName.get('Hoàng Sa')
      : entry.name.includes('Trường Sa')
        ? byName.get('Trường Sa')
        : null;
    if (island) {
      entry.bbox = island.bbox;
      entry.center = island.center;
      overridden += 1;
    }
  }
  return overridden;
}

function resolveDataPath(relativePath) {
  return path.join(dataRoot, relativePath);
}

function getStringProperty(properties, field) {
  const value = properties?.[field];

  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }

  return value;
}

function buildNestedEntry(feature, mode, type) {
  const properties = feature.properties || {};
  const name = getStringProperty(properties, 'name');

  if (!name) {
    return null;
  }

  const nameEnRaw = getStringProperty(properties, 'name_en');
  const nameEn = nameEnRaw ? latinizeVietnamese(nameEnRaw).trim() : '';
  const parentProvinceName = getStringProperty(properties, 'parent_province_name');
  const parentProvinceSlug = parentProvinceName ? createSlug(parentProvinceName) : '';
  const featureSlug = createSlug(name);
  const slug = parentProvinceSlug ? `${parentProvinceSlug}--${featureSlug}` : featureSlug;
  const sourceId = getStringProperty(properties, 'source_id') ?? '';
  const id = `${mode}:${type}:${slug}${sourceId ? `:${sourceId}` : ''}`;
  const bbox = roundBbox(computeBbox(feature.geometry));
  // Use polylabel (pole of inaccessibility) so island/coastal districts get a center
  // that is inside the actual land polygon, not in the surrounding ocean.
  const center = computeVisualCenter(feature.geometry, bbox);

  return {
    bbox,
    center,
    id,
    mode,
    name,
    name_en: nameEn,
    parentProvinceName: parentProvinceName ?? '',
    parentProvinceSlug,
    slug,
    type,
  };
}

function getNestedEntries(mode, type, inputPath) {
  const data = readJson(inputPath);

  if (!Array.isArray(data.features)) {
    throw new Error(`Expected FeatureCollection with features array: ${inputPath}`);
  }

  const entries = [];

  for (const feature of data.features) {
    const entry = buildNestedEntry(feature, mode, type);

    if (entry) {
      entries.push(entry);
    }
  }

  entries.sort((a, b) => {
    const parentCompare = compareAdministrativeName(a.parentProvinceName, b.parentProvinceName);
    if (parentCompare !== 0) {
      return parentCompare;
    }

    return compareAdministrativeName(a.name, b.name);
  });

  return entries;
}

function assertUniqueIds(entries) {
  const seen = new Set();

  for (const entry of entries) {
    if (seen.has(entry.id)) {
      throw new Error(`Duplicate nested index id: ${entry.id}`);
    }

    seen.add(entry.id);
  }
}

const districts = getNestedEntries('pre', 'district', resolveDataPath(sources.preDistricts));
const wards = getNestedEntries('post', 'ward', resolveDataPath(sources.postWards));
const features = [...districts, ...wards];

const offshoreOverrides = applyOffshoreIslandOverrides(features);

assertUniqueIds(features);

const index = {
  schemaVersion: 1,
  sources,
  counts: {
    districts: districts.length,
    wards: wards.length,
    total: features.length,
  },
  features,
};

const outputPath = path.join(publicDataRoot, 'nested-index.json');
writeJson(outputPath, index);

console.log(
  `Wrote ${index.counts.total} nested index entries (${index.counts.districts} districts, ${index.counts.wards} wards; ${offshoreOverrides} archipelago entries re-sourced from OSM islands) -> ${outputPath}`,
);
