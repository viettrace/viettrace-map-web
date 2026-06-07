import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  compareAdministrativeName,
  computeBbox,
  computeDisplayCenter,
  createSlug,
  formatEnglishProvinceName,
  readJson,
  roundBbox,
  writeJson,
} from './province-index-utils.mjs';

// Label files contain intentionally-placed label points (polylabel + manual overrides).
// They are the highest-quality center source and are used as the primary lookup.
// Run `pnpm data:generate-labels` before this script to ensure they are up to date.

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspaceRoot = path.resolve(repoRoot, '..');
const dataRoot = process.env.VIETTRACE_DATA_DIR
  ? path.resolve(process.env.VIETTRACE_DATA_DIR)
  : path.join(workspaceRoot, 'viettrace-data');
const publicDataRoot = path.join(repoRoot, 'public', 'data');

const sources = {
  mergerInfo: 'public/data/merger-info.json',
  post: 'processed/provinces/vn_post_2025_display.geojson',
  pre: 'processed/provinces/vn_pre_2025_display.geojson',
};

function resolveDataPath(relativePath) {
  return path.join(dataRoot, relativePath);
}

function resolvePublicDataPath(relativePath) {
  return path.join(repoRoot, relativePath);
}

function getFeatureName(feature, field) {
  const value = feature.properties?.[field];

  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Missing required feature property: ${field}`);
  }

  return value;
}

function buildMergerMaps(mergerInfo) {
  const byOldProvince = new Map();
  const byNewProvince = new Map();

  for (const entry of mergerInfo) {
    byOldProvince.set(entry.oldProvince, entry);

    const incoming = byNewProvince.get(entry.newProvince) || [];
    incoming.push(entry);
    byNewProvince.set(entry.newProvince, incoming);
  }

  for (const incoming of byNewProvince.values()) {
    incoming.sort((a, b) => compareAdministrativeName(a.oldProvince, b.oldProvince));
  }

  return { byNewProvince, byOldProvince };
}

function createProvinceEntry(feature, mode, mergerMaps) {
  const name = getFeatureName(feature, 'name');
  const nameEn = formatEnglishProvinceName(name, getFeatureName(feature, 'name_en'));
  const slug = createSlug(name);
  const bbox = roundBbox(computeBbox(feature.geometry));

  // Label files use polylabel + manual overrides — the highest-quality center source.
  // Fall back to computeDisplayCenter (admin_centre_node → bbox) only if absent.
  const labelCoords = labelLookup[mode]?.get(name);
  const center = labelCoords
    ? [Number(labelCoords[0].toFixed(6)), Number(labelCoords[1].toFixed(6))]
    : computeDisplayCenter(feature.properties, bbox);

  const entry = {
    bbox,
    center,
    id: `${mode}:${slug}`,
    mode,
    name,
    name_en: nameEn,
    slug,
  };

  if (mode === 'pre') {
    const merger = mergerMaps.byOldProvince.get(name);

    if (merger) {
      entry.merger = {
        mergeDate: merger.mergeDate,
        newProvince: merger.newProvince,
      };
    }
  } else {
    const incoming = mergerMaps.byNewProvince.get(name);

    if (incoming?.length) {
      entry.merger = {
        mergeDate: incoming[0].mergeDate,
        oldProvinces: incoming.map(item => item.oldProvince),
      };
    }
  }

  return entry;
}

function getProvinceEntries(mode, inputPath, mergerMaps) {
  const data = readJson(inputPath);

  if (!Array.isArray(data.features)) {
    throw new Error(`Expected FeatureCollection with features array: ${inputPath}`);
  }

  return data.features
    .filter(feature => feature.properties?.boundary === 'administrative')
    .map(feature => createProvinceEntry(feature, mode, mergerMaps))
    .sort((a, b) => compareAdministrativeName(a.name, b.name));
}

function assertUniqueSlugs(entries) {
  const seen = new Map();

  for (const entry of entries) {
    const key = `${entry.mode}:${entry.slug}`;
    const existing = seen.get(key);

    if (existing) {
      throw new Error(
        `Duplicate province slug "${key}" for "${existing.name}" and "${entry.name}".`,
      );
    }

    seen.set(key, entry);
  }
}

function buildLabelLookup(labelFilePath) {
  try {
    const data = readJson(labelFilePath);
    const map = new Map();
    for (const feature of data.features) {
      const name = feature.properties?.name;
      const coords = feature.geometry?.coordinates;
      if (name && Array.isArray(coords) && coords.length === 2) {
        map.set(name, coords);
      }
    }
    return map;
  } catch {
    return new Map();
  }
}

const labelLookup = {
  pre: buildLabelLookup(path.join(publicDataRoot, 'province-labels-pre.json')),
  post: buildLabelLookup(path.join(publicDataRoot, 'province-labels-post.json')),
};

const mergerInfo = readJson(resolvePublicDataPath(sources.mergerInfo));
const mergerMaps = buildMergerMaps(mergerInfo);
const provinces = [
  ...getProvinceEntries('pre', resolveDataPath(sources.pre), mergerMaps),
  ...getProvinceEntries('post', resolveDataPath(sources.post), mergerMaps),
];

assertUniqueSlugs(provinces);

const index = {
  schemaVersion: 1,
  sources,
  counts: {
    post: provinces.filter(entry => entry.mode === 'post').length,
    pre: provinces.filter(entry => entry.mode === 'pre').length,
    total: provinces.length,
  },
  provinces,
};

const outputPath = path.join(publicDataRoot, 'province-index.json');
writeJson(outputPath, index);

console.log(`Wrote ${index.counts.total} province index entries -> ${outputPath}`);
