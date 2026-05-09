import { readFileSync } from 'node:fs';

const prePath = '../viettrace-data/processed/provinces/vn_pre_2025.geojson';
const postPath = '../viettrace-data/processed/provinces/vn_post_2025.geojson';
const mergerPath = 'public/data/merger-info.json';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function getProvinceNames(path) {
  return new Set(readJson(path).features.map((feature) => feature.properties.name));
}

function assertNoMissing(label, missing) {
  if (missing.length > 0) {
    throw new Error(`${label} missing from tile data:\n${missing.map((name) => `- ${name}`).join('\n')}`);
  }
}

const preNames = getProvinceNames(prePath);
const postNames = getProvinceNames(postPath);
const mergerInfo = readJson(mergerPath);

const missingOld = mergerInfo
  .map((entry) => entry.oldProvince)
  .filter((name) => !preNames.has(name));

const missingNew = [...new Set(mergerInfo.map((entry) => entry.newProvince))].filter(
  (name) => !postNames.has(name),
);

assertNoMissing('oldProvince', missingOld);
assertNoMissing('newProvince', missingNew);

console.log(`Verified ${mergerInfo.length} merger metadata entries against tile province names.`);
