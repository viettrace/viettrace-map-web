import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  compareAdministrativeName,
  createSlug,
  readJson,
  writeJson,
} from './province-index-utils.mjs';

// Address Converter (Ring 0) — forward old→new address mapping.
// Builds a static picker dataset from the vendored ward-level conversion table so a user can pick
// their pre-2025 province → district → ward and get the post-2025 official address (province + ward),
// with divided-ward candidates and the 5 island districts handled. No backend (static-first).
//
// Source: vietnamadminunits (MIT), vendored under viettrace-data/raw/vietnam-admin-units/ —
// underlying data from the official GSO registry (aligns with Quyết định 19/2025/QĐ-TTg).
//
// Outputs (public/data/):
//   address-index.json            — 63 old provinces (code, name, name_en, slug) + global counts
//   address/pre/{provinceCode}.json — one file per old province: districts → old wards → new unit(s)

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspaceRoot = path.resolve(repoRoot, '..');
const dataRoot = process.env.VIETTRACE_DATA_DIR
  ? path.resolve(process.env.VIETTRACE_DATA_DIR)
  : path.join(workspaceRoot, 'viettrace-data');
const publicDataRoot = path.join(repoRoot, 'public', 'data');
const outDir = path.join(publicDataRoot, 'address', 'pre');

const SOURCE_CSV = path.join(
  dataRoot,
  'raw',
  'vietnam-admin-units',
  'convert_legacy_2025_simple.csv',
);
const SOURCE_META = {
  dataset: 'tranngocminhhieu/vietnamadminunits',
  file: 'raw/vietnam-admin-units/convert_legacy_2025_simple.csv',
  commit: '7fac8c45805aad9916b17237c54baf4502303b93',
  license: 'MIT',
  url: 'https://github.com/tranngocminhhieu/vietnamadminunits',
  note: 'Official codes from danhmuchanhchinh.gso.gov.vn (aligns with Quyết định 19/2025/QĐ-TTg).',
};
const MERGE_DATE = '2025-07-01';

// Hard expectations — the generator fails loudly if the source drifts from the official structure.
const EXPECTED = {
  oldProvinces: 63,
  newProvinces: 34,
  newWards: 3321, // official post-2025 count (2621 xã + 687 phường + 13 đặc khu) — NOT the upstream "3221" filename
  islandDistricts: 5,
  dividedOldWards: 471,
};

function pad2(code) {
  const value = String(code).trim();
  return value.length === 1 ? `0${value}` : value;
}

// wardCode arrives as a float string ("1.0"); normalize to an integer string for a stable key.
function normalizeWardCode(value) {
  const v = String(value).trim();
  if (v === '') return '';
  const n = Number(v);
  return Number.isFinite(n) ? String(Math.trunc(n)) : v;
}

// This source has no quoted fields (validated: names carry no commas — same assumption as the
// reconciliation generator). Split on comma and assert the column count per row so any future
// quoting/format drift fails loudly here rather than corrupting the parse.
function parseSimpleCsv(text) {
  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter(line => line.length > 0);
  const header = lines[0].split(',').map(cell => cell.trim());
  const columnIndex = Object.fromEntries(header.map((name, i) => [name, i]));
  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cells = lines[i].split(',');
    if (cells.length !== header.length) {
      throw new Error(
        `Row ${i + 1}: expected ${header.length} columns, got ${cells.length}. ` +
          'The source may now contain quoted fields — reinspect before trusting the parse.',
      );
    }
    rows.push(cells);
  }
  return { columnIndex, rows };
}

const REQUIRED_COLUMNS = [
  'provinceCode',
  'districtCode',
  'districtType',
  'wardCode',
  'wardType',
  'isDividedWard',
  'province',
  'district',
  'ward',
  'newProvince',
  'newWard',
  'newWardShort',
  'newProvinceCode',
  'newWardCode',
  'newWardType',
  'newWardLat',
  'newWardLon',
  'newWardAreaKm2',
];

const { columnIndex, rows } = parseSimpleCsv(fs.readFileSync(SOURCE_CSV, 'utf8'));
for (const column of REQUIRED_COLUMNS) {
  if (!(column in columnIndex)) {
    throw new Error(`Source CSV is missing the required column: ${column}`);
  }
}

// province-index gives us English province names + the canonical slug set to cross-check against.
const provinceIndex = readJson(path.join(publicDataRoot, 'province-index.json'));
const preNameEnBySlug = new Map();
const postSlugs = new Set();
for (const entry of provinceIndex.provinces) {
  if (entry.mode === 'pre') preNameEnBySlug.set(entry.slug, entry.name_en);
  else postSlugs.add(entry.slug);
}

const cell = (cells, name) => cells[columnIndex[name]].trim();
const toNumber = value => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

// province code (padded) -> { code, name, slug, districts: Map<districtCode, {..., wards: Map}> }
const provinces = new Map();

for (const cells of rows) {
  const provinceCode = pad2(cell(cells, 'provinceCode'));
  const provinceName = cell(cells, 'province');
  const districtCode = cell(cells, 'districtCode');
  const districtName = cell(cells, 'district');
  const districtType = cell(cells, 'districtType');
  const wardCode = normalizeWardCode(cell(cells, 'wardCode'));
  const wardName = cell(cells, 'ward');
  const wardType = cell(cells, 'wardType');

  const result = {
    newProvince: cell(cells, 'newProvince'),
    newProvinceSlug: createSlug(cell(cells, 'newProvince')),
    newProvinceCode: pad2(cell(cells, 'newProvinceCode')),
    newWard: cell(cells, 'newWard'),
    newWardShort: cell(cells, 'newWardShort'),
    newWardCode: cell(cells, 'newWardCode'),
    newWardType: cell(cells, 'newWardType'),
    lat: toNumber(cell(cells, 'newWardLat')),
    lon: toNumber(cell(cells, 'newWardLon')),
    areaKm2: toNumber(cell(cells, 'newWardAreaKm2')),
  };

  let province = provinces.get(provinceCode);
  if (!province) {
    province = {
      code: provinceCode,
      name: provinceName,
      slug: createSlug(provinceName),
      districts: new Map(),
    };
    provinces.set(provinceCode, province);
  }

  let district = province.districts.get(districtCode);
  if (!district) {
    district = {
      code: districtCode,
      name: districtName,
      type: districtType,
      // An island district has no ward level (empty wardCode) → maps straight to a đặc khu.
      isIsland: wardCode === '',
      wards: new Map(), // wardCode -> { code, name, type, results: Map<newWardCode, result> }
      results: [], // district-level results (island districts only)
    };
    province.districts.set(districtCode, district);
  }

  if (wardCode === '') {
    // Island district: attach the result at the district level (dedup by new code).
    if (!district.results.some(r => r.newWardCode === result.newWardCode)) {
      district.results.push(result);
    }
    continue;
  }

  let ward = district.wards.get(wardCode);
  if (!ward) {
    ward = { code: wardCode, name: wardName, type: wardType, results: new Map() };
    district.wards.set(wardCode, ward);
  }
  // Dedup by new ward code; a divided old ward yields >1 distinct result.
  if (!ward.results.has(result.newWardCode)) {
    ward.results.set(result.newWardCode, result);
  }
}

// ---- Serialize + tally --------------------------------------------------------------------------

const newWardCodes = new Set();
const newProvinceCodes = new Set();
let oldWardCount = 0;
let islandDistrictCount = 0;
let dividedOldWardCount = 0;
const slugMismatches = [];

const indexProvinces = [];

fs.mkdirSync(outDir, { recursive: true });

const sortedProvinces = [...provinces.values()].sort((a, b) =>
  compareAdministrativeName(a.name, b.name),
);

for (const province of sortedProvinces) {
  const districts = [...province.districts.values()].sort((a, b) =>
    compareAdministrativeName(a.name, b.name),
  );

  const outDistricts = districts.map(district => {
    for (const r of district.results) {
      newWardCodes.add(r.newWardCode);
      newProvinceCodes.add(r.newProvinceCode);
    }
    if (district.isIsland) islandDistrictCount += 1;

    const wards = [...district.wards.values()].sort((a, b) =>
      compareAdministrativeName(a.name, b.name),
    );
    const outWards = wards.map(ward => {
      oldWardCount += 1;
      const results = [...ward.results.values()];
      for (const r of results) {
        newWardCodes.add(r.newWardCode);
        newProvinceCodes.add(r.newProvinceCode);
      }
      const isDivided = results.length > 1;
      if (isDivided) dividedOldWardCount += 1;
      return { code: ward.code, name: ward.name, type: ward.type, isDivided, results };
    });

    return {
      code: district.code,
      name: district.name,
      type: district.type,
      isIsland: district.isIsland,
      wards: outWards,
      results: district.isIsland ? district.results : [],
    };
  });

  if (!preNameEnBySlug.has(province.slug)) {
    slugMismatches.push(`pre "${province.name}" (${province.slug})`);
  }

  const wardCount = outDistricts.reduce((sum, d) => sum + d.wards.length, 0);

  indexProvinces.push({
    code: province.code,
    name: province.name,
    name_en: preNameEnBySlug.get(province.slug) ?? province.name,
    slug: province.slug,
    districtCount: outDistricts.length,
    wardCount,
    hasIslandDistrict: outDistricts.some(d => d.isIsland),
  });

  const provinceFile = {
    schemaVersion: 1,
    mergeDate: MERGE_DATE,
    code: province.code,
    name: province.name,
    name_en: preNameEnBySlug.get(province.slug) ?? province.name,
    slug: province.slug,
    districts: outDistricts,
  };
  writeJson(path.join(outDir, `${province.code}.json`), provinceFile);
}

// Cross-check every new province slug resolves against province-index (map deep-link relies on it).
const unknownNewProvinceSlugs = new Set();
for (const province of sortedProvinces) {
  for (const district of province.districts.values()) {
    const all = district.isIsland
      ? district.results
      : [...district.wards.values()].flatMap(w => [...w.results.values()]);
    for (const r of all) {
      if (!postSlugs.has(r.newProvinceSlug)) unknownNewProvinceSlugs.add(r.newProvinceSlug);
    }
  }
}

const counts = {
  oldProvinces: indexProvinces.length,
  oldWards: oldWardCount,
  islandDistricts: islandDistrictCount,
  oldUnits: oldWardCount + islandDistrictCount,
  newProvinces: newProvinceCodes.size,
  newWards: newWardCodes.size,
  dividedOldWards: dividedOldWardCount,
};

const problems = [];
if (slugMismatches.length)
  problems.push(`Pre-province slugs not in province-index: ${slugMismatches.join('; ')}`);
if (unknownNewProvinceSlugs.size)
  problems.push(
    `New-province slugs not in province-index (post): ${[...unknownNewProvinceSlugs].join('; ')}`,
  );
if (counts.oldProvinces !== EXPECTED.oldProvinces)
  problems.push(`oldProvinces=${counts.oldProvinces}, expected ${EXPECTED.oldProvinces}`);
if (counts.newProvinces !== EXPECTED.newProvinces)
  problems.push(`newProvinces=${counts.newProvinces}, expected ${EXPECTED.newProvinces}`);
if (counts.newWards !== EXPECTED.newWards)
  problems.push(
    `newWards=${counts.newWards}, expected ${EXPECTED.newWards} (official) — do NOT trust the upstream "3221" filename`,
  );
if (counts.islandDistricts !== EXPECTED.islandDistricts)
  problems.push(`islandDistricts=${counts.islandDistricts}, expected ${EXPECTED.islandDistricts}`);
if (counts.dividedOldWards !== EXPECTED.dividedOldWards)
  problems.push(`dividedOldWards=${counts.dividedOldWards}, expected ${EXPECTED.dividedOldWards}`);

if (problems.length) {
  throw new Error(
    `Address-conversion generation failed sanity checks:\n  - ${problems.join('\n  - ')}`,
  );
}

const indexOut = {
  schemaVersion: 1,
  source: SOURCE_META,
  mergeDate: MERGE_DATE,
  counts,
  provinces: indexProvinces,
};
writeJson(path.join(publicDataRoot, 'address-index.json'), indexOut);

console.log(
  `Wrote address-index.json (${counts.oldProvinces} provinces) + ${sortedProvinces.length} per-province files → ${outDir}\n` +
    `  old units: ${counts.oldUnits} (${counts.oldWards} wards + ${counts.islandDistricts} island districts)\n` +
    `  new: ${counts.newProvinces} provinces, ${counts.newWards} wards; divided old wards: ${counts.dividedOldWards}`,
);
