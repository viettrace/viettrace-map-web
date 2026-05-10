import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSlug, normalizeAdministrativeName, readJson } from './province-index-utils.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspaceRoot = path.resolve(repoRoot, '..');
const dataRoot = process.env.VIETTRACE_DATA_DIR
  ? path.resolve(process.env.VIETTRACE_DATA_DIR)
  : path.join(workspaceRoot, 'viettrace-data');

const provinceIndexPath = path.join(repoRoot, 'public', 'data', 'province-index.json');
const mergerInfoPath = path.join(repoRoot, 'public', 'data', 'merger-info.json');
const preDisplayPath = path.join(dataRoot, 'processed', 'provinces', 'vn_pre_2025_display.geojson');
const postDisplayPath = path.join(
  dataRoot,
  'processed',
  'provinces',
  'vn_post_2025_display.geojson',
);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readProvinceNames(path) {
  return readJson(path)
    .features.filter(feature => feature.properties?.boundary === 'administrative')
    .map(feature => feature.properties.name);
}

function assertCoordinatePair(value, label) {
  assert(Array.isArray(value) && value.length === 2, `${label} must be a [lng, lat] pair.`);
  assert(
    value.every(number => Number.isFinite(number)),
    `${label} must contain finite numbers.`,
  );
}

function assertBbox(value, label) {
  assert(Array.isArray(value) && value.length === 4, `${label} must be a 4-number bbox.`);
  assert(
    value.every(number => Number.isFinite(number)),
    `${label} must contain finite numbers.`,
  );
  assert(value[0] <= value[2] && value[1] <= value[3], `${label} has invalid min/max values.`);
}

function assertAsciiText(value, label) {
  assert(/^[\x00-\x7F]+$/.test(value), `${label} must be ASCII-only English text.`);
}

function assertEnglishCitySuffix(entry) {
  if (entry.name.startsWith('Thành phố')) {
    assert(/\bCity$/.test(entry.name_en), `${entry.id}.name_en must end with City.`);
  }
}

const index = readJson(provinceIndexPath);
const mergerInfo = readJson(mergerInfoPath);
const preNames = readProvinceNames(preDisplayPath);
const postNames = readProvinceNames(postDisplayPath);

assert(index.schemaVersion === 1, 'province-index schemaVersion must be 1.');
assert(Array.isArray(index.provinces), 'province-index provinces must be an array.');
assert(index.counts?.pre === 63, 'province-index must include 63 pre-2025 provinces.');
assert(index.counts?.post === 34, 'province-index must include 34 post-2025 provinces.');
assert(index.provinces.length === 97, 'province-index must include 97 total entries.');

const ids = new Set();
const modeSlugKeys = new Set();
const indexedNamesByMode = {
  post: new Set(),
  pre: new Set(),
};

for (const entry of index.provinces) {
  assert(entry.mode === 'pre' || entry.mode === 'post', `Invalid mode for ${entry.id}.`);
  assert(typeof entry.name === 'string' && entry.name.length > 0, `${entry.id} missing name.`);
  assert(
    typeof entry.name_en === 'string' && entry.name_en.length > 0,
    `${entry.id} missing name_en.`,
  );
  assertAsciiText(entry.name_en, `${entry.id}.name_en`);
  assertEnglishCitySuffix(entry);
  assert(entry.slug === createSlug(entry.name), `${entry.id} slug does not match normalized name.`);
  assert(entry.id === `${entry.mode}:${entry.slug}`, `${entry.id} does not match mode:slug.`);
  assert(!ids.has(entry.id), `Duplicate id: ${entry.id}.`);
  ids.add(entry.id);

  const modeSlugKey = `${entry.mode}:${entry.slug}`;
  assert(!modeSlugKeys.has(modeSlugKey), `Duplicate mode/slug key: ${modeSlugKey}.`);
  modeSlugKeys.add(modeSlugKey);

  assertBbox(entry.bbox, `${entry.id}.bbox`);
  assertCoordinatePair(entry.center, `${entry.id}.center`);
  indexedNamesByMode[entry.mode].add(entry.name);
}

for (const name of preNames) {
  assert(indexedNamesByMode.pre.has(name), `Missing pre province in index: ${name}.`);
}

for (const name of postNames) {
  assert(indexedNamesByMode.post.has(name), `Missing post province in index: ${name}.`);
}

const preByName = new Map(
  index.provinces.filter(entry => entry.mode === 'pre').map(entry => [entry.name, entry]),
);
const postByName = new Map(
  index.provinces.filter(entry => entry.mode === 'post').map(entry => [entry.name, entry]),
);

for (const merger of mergerInfo) {
  const oldEntry = preByName.get(merger.oldProvince);
  const newEntry = postByName.get(merger.newProvince);

  assert(oldEntry, `Merger oldProvince missing from pre index: ${merger.oldProvince}.`);
  assert(newEntry, `Merger newProvince missing from post index: ${merger.newProvince}.`);
  assert(
    oldEntry.merger?.newProvince === merger.newProvince,
    `Pre merger metadata mismatch for ${merger.oldProvince}.`,
  );
  assert(
    newEntry.merger?.oldProvinces?.includes(merger.oldProvince),
    `Post merger metadata missing ${merger.oldProvince} on ${merger.newProvince}.`,
  );
}

const searchableNames = new Set(
  index.provinces.flatMap(entry => [
    normalizeAdministrativeName(entry.name),
    normalizeAdministrativeName(entry.name_en),
  ]),
);

assert(searchableNames.has('ha giang'), 'Search normalization smoke check failed for Ha Giang.');
assert(
  searchableNames.has('ho chi minh'),
  'Search normalization smoke check failed for Ho Chi Minh.',
);

console.log(
  `Verified ${index.provinces.length} province index entries against display GeoJSON and merger metadata.`,
);
