import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson } from './province-index-utils.mjs';

// Verify the generated address-conversion artifacts against the official structure + internal
// consistency. Run after `pnpm data:generate-address-conversion`. Exits non-zero on any failure.

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDataRoot = path.join(repoRoot, 'public', 'data');
const preDir = path.join(publicDataRoot, 'address', 'pre');

const EXPECTED = {
  oldProvinces: 63,
  newProvinces: 34,
  newWards: 3321,
  islandDistricts: 5,
  dividedOldWards: 471,
};

const failures = [];
const fail = message => failures.push(message);

const index = readJson(path.join(publicDataRoot, 'address-index.json'));

if (index.provinces.length !== EXPECTED.oldProvinces) {
  fail(`index.provinces=${index.provinces.length}, expected ${EXPECTED.oldProvinces}`);
}
for (const [key, expected] of Object.entries(EXPECTED)) {
  if (index.counts[key] !== expected)
    fail(`counts.${key}=${index.counts[key]}, expected ${expected}`);
}

// Re-derive the tallies from the per-province files (defends against a stale index).
const newWardCodes = new Set();
const newProvinceCodes = new Set();
let oldWards = 0;
let islandDistricts = 0;
let dividedOldWards = 0;
let resultCoordMissing = 0;

for (const entry of index.provinces) {
  const filePath = path.join(preDir, `${entry.code}.json`);
  if (!fs.existsSync(filePath)) {
    fail(`Missing per-province file for ${entry.name} (${entry.code})`);
    continue;
  }
  const province = readJson(filePath);
  for (const district of province.districts) {
    const districtResults = district.isIsland
      ? district.results
      : district.wards.flatMap(w => w.results);
    if (district.isIsland) {
      islandDistricts += 1;
      if (district.results.length === 0) fail(`Island district ${district.name} has no result`);
    }
    for (const ward of district.wards) {
      oldWards += 1;
      if (ward.results.length === 0) fail(`Ward ${ward.name} (${province.name}) has no result`);
      if (ward.results.length > 1) dividedOldWards += 1;
    }
    for (const r of districtResults) {
      newWardCodes.add(r.newWardCode);
      newProvinceCodes.add(r.newProvinceCode);
      if (r.lat === null || r.lon === null) resultCoordMissing += 1;
    }
  }
}

if (newWardCodes.size !== EXPECTED.newWards)
  fail(`Derived newWards=${newWardCodes.size}, expected ${EXPECTED.newWards}`);
if (newProvinceCodes.size !== EXPECTED.newProvinces)
  fail(`Derived newProvinces=${newProvinceCodes.size}, expected ${EXPECTED.newProvinces}`);
if (islandDistricts !== EXPECTED.islandDistricts)
  fail(`Derived islandDistricts=${islandDistricts}, expected ${EXPECTED.islandDistricts}`);
if (dividedOldWards !== EXPECTED.dividedOldWards)
  fail(`Derived dividedOldWards=${dividedOldWards}, expected ${EXPECTED.dividedOldWards}`);
if (resultCoordMissing > 0) fail(`${resultCoordMissing} results missing lat/lon`);

if (failures.length) {
  console.error('✖  Address-conversion verification FAILED:');
  for (const f of failures) console.error(`   - ${f}`);
  process.exit(1);
}

console.log(
  `✔  Address-conversion verified: ${index.provinces.length} provinces, ${newWardCodes.size} new wards, ` +
    `${oldWards} old wards + ${islandDistricts} island districts, ${dividedOldWards} divided old wards.`,
);
