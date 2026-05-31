import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  compareAdministrativeName,
  computeBbox,
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

function computeBboxCenter(bbox) {
  return [
    Number(((bbox[0] + bbox[2]) / 2).toFixed(6)),
    Number(((bbox[1] + bbox[3]) / 2).toFixed(6)),
  ];
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

  return {
    bbox,
    center: computeBboxCenter(bbox),
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
  `Wrote ${index.counts.total} nested index entries (${index.counts.districts} districts, ${index.counts.wards} wards) -> ${outputPath}`,
);
