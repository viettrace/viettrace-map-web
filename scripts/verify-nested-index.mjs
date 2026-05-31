import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson } from './province-index-utils.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const nestedIndexPath = path.join(repoRoot, 'public', 'data', 'nested-index.json');
const provinceIndexPath = path.join(repoRoot, 'public', 'data', 'province-index.json');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertBbox(value, label) {
  assert(Array.isArray(value) && value.length === 4, `${label} must be a 4-number bbox.`);
  assert(
    value.every(number => Number.isFinite(number)),
    `${label} must contain finite numbers.`,
  );
  assert(value[0] <= value[2] && value[1] <= value[3], `${label} has invalid min/max values.`);
}

function assertCoordinatePair(value, label) {
  assert(Array.isArray(value) && value.length === 2, `${label} must be a [lng, lat] pair.`);
  assert(
    value.every(number => Number.isFinite(number)),
    `${label} must contain finite numbers.`,
  );
}

const index = readJson(nestedIndexPath);
const provinceIndex = readJson(provinceIndexPath);

assert(index.schemaVersion === 1, 'nested-index schemaVersion must be 1.');
assert(Array.isArray(index.features), 'nested-index features must be an array.');
assert(
  index.counts?.total === index.features.length,
  'nested-index counts.total must match features.length.',
);

const districtCount = index.features.filter(entry => entry.type === 'district').length;
const wardCount = index.features.filter(entry => entry.type === 'ward').length;

assert(
  index.counts.districts === districtCount,
  `counts.districts (${index.counts.districts}) does not match feature count (${districtCount}).`,
);
assert(
  index.counts.wards === wardCount,
  `counts.wards (${index.counts.wards}) does not match feature count (${wardCount}).`,
);

const ids = new Set();
const provincePreSlugs = new Set(
  provinceIndex.provinces.filter(entry => entry.mode === 'pre').map(entry => entry.slug),
);
const provincePostSlugs = new Set(
  provinceIndex.provinces.filter(entry => entry.mode === 'post').map(entry => entry.slug),
);

for (const entry of index.features) {
  assert(entry.mode === 'pre' || entry.mode === 'post', `Invalid mode for ${entry.id}.`);
  assert(entry.type === 'district' || entry.type === 'ward', `Invalid type for ${entry.id}.`);
  assert(typeof entry.name === 'string' && entry.name.length > 0, `${entry.id} missing name.`);
  assert(typeof entry.slug === 'string' && entry.slug.length > 0, `${entry.id} missing slug.`);
  assert(typeof entry.parentProvinceSlug === 'string', `${entry.id} missing parentProvinceSlug.`);
  assert(!ids.has(entry.id), `Duplicate id: ${entry.id}.`);
  ids.add(entry.id);

  assertBbox(entry.bbox, `${entry.id}.bbox`);
  assertCoordinatePair(entry.center, `${entry.id}.center`);

  if (entry.parentProvinceSlug) {
    const parentSlugs = entry.mode === 'pre' ? provincePreSlugs : provincePostSlugs;
    assert(
      parentSlugs.has(entry.parentProvinceSlug),
      `${entry.id} has unknown parentProvinceSlug "${entry.parentProvinceSlug}".`,
    );
  }
}

// 694 OSM-derived pre-2025 districts plus 1 research gap-fill (Huyện Hoàng Sa,
// geometry copied from the geoBoundaries Paracel reference).
assert(
  index.counts.districts === 695,
  `Expected 695 pre-2025 districts, got ${index.counts.districts}.`,
);
assert(index.counts.wards === 3321, `Expected 3,321 post-2025 wards, got ${index.counts.wards}.`);

console.log(
  `Verified ${index.counts.total} nested index entries (${index.counts.districts} districts, ${index.counts.wards} wards).`,
);
