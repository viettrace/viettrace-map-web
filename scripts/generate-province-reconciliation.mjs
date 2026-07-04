import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  compareAdministrativeName,
  createSlug,
  readJson,
  writeJson,
} from './province-index-utils.mjs';

// Track B — province data layer, artifact C (reconciliation join key).
// Builds the official-code + old→new mapping between the 63 pre-2025 and 34 post-2025 provinces,
// keyed by the SAME slug as province-index.json (reusing createSlug) so any dataset can join on it.
// Source: vietnamadminunits (MIT), vendored under viettrace-data/raw/admin-codes/ — see its SOURCE.md.

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspaceRoot = path.resolve(repoRoot, '..');
const dataRoot = process.env.VIETTRACE_DATA_DIR
  ? path.resolve(process.env.VIETTRACE_DATA_DIR)
  : path.join(workspaceRoot, 'viettrace-data');
const publicDataRoot = path.join(repoRoot, 'public', 'data');

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
const EXPECTED = { post: 34, pre: 63 };

function pad2(code) {
  const value = String(code).trim();
  return value.length === 1 ? `0${value}` : value;
}

// This source has no quoted fields (validated: province/ward names carry no commas). Split on comma
// and assert the column count per row so any future quoting/format drift fails loudly here.
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

const index = readJson(path.join(publicDataRoot, 'province-index.json'));
const preBySlug = new Map();
const postBySlug = new Map();
for (const entry of index.provinces) {
  (entry.mode === 'pre' ? preBySlug : postBySlug).set(entry.slug, entry);
}

const { columnIndex, rows } = parseSimpleCsv(fs.readFileSync(SOURCE_CSV, 'utf8'));
for (const column of ['province', 'provinceCode', 'newProvince', 'newProvinceCode']) {
  if (!(column in columnIndex)) {
    throw new Error(`Source CSV is missing the required column: ${column}`);
  }
}

// Collapse the ward-level rows to a distinct legacy-province → new-province mapping.
const legacyBySlug = new Map();
for (const cells of rows) {
  const rawName = cells[columnIndex.province].trim();
  const slug = createSlug(rawName);
  const newRawName = cells[columnIndex.newProvince].trim();
  const record = {
    code: pad2(cells[columnIndex.provinceCode]),
    newCode: pad2(cells[columnIndex.newProvinceCode]),
    newRawName,
    rawName,
  };

  const existing = legacyBySlug.get(slug);
  if (existing) {
    if (createSlug(existing.newRawName) !== createSlug(newRawName)) {
      throw new Error(
        `Legacy province "${rawName}" maps to multiple new provinces ` +
          `("${existing.newRawName}" and "${newRawName}") — not a clean province-level merge.`,
      );
    }
  } else {
    legacyBySlug.set(slug, record);
  }
}

// Join to province-index by slug; collect any unmatched names for the review gate.
const unmatched = { post: [], pre: [] };
const preEntries = [];
const postGroups = new Map();

for (const [slug, record] of legacyBySlug) {
  const preEntry = preBySlug.get(slug);
  if (!preEntry) {
    unmatched.pre.push(`${record.rawName} (${slug})`);
  }

  const newSlug = createSlug(record.newRawName);
  const postEntry = postBySlug.get(newSlug);
  if (!postEntry) {
    unmatched.post.push(`${record.newRawName} (${newSlug})`);
  }

  preEntries.push({
    slug,
    name: preEntry?.name ?? record.rawName,
    code: record.code,
    newSlug,
    newCode: record.newCode,
    newName: postEntry?.name ?? record.newRawName,
  });

  const group = postGroups.get(newSlug) || {
    code: record.newCode,
    name: postEntry?.name ?? record.newRawName,
    componentSlugs: [],
  };
  group.componentSlugs.push(slug);
  postGroups.set(newSlug, group);
}

if (unmatched.pre.length || unmatched.post.length) {
  throw new Error(
    'Name/slug mismatches vs province-index.json — reconcile before shipping:\n' +
      `  PRE unmatched (${unmatched.pre.length}): ${unmatched.pre.join('; ') || 'none'}\n` +
      `  POST unmatched (${unmatched.post.length}): ${unmatched.post.join('; ') || 'none'}`,
  );
}

if (preEntries.length !== EXPECTED.pre || postGroups.size !== EXPECTED.post) {
  throw new Error(
    `Unexpected counts: ${preEntries.length} pre (expected ${EXPECTED.pre}), ` +
      `${postGroups.size} post (expected ${EXPECTED.post}). Source coverage changed — verify.`,
  );
}

preEntries.sort((a, b) => compareAdministrativeName(a.name, b.name));
const pre = {};
for (const entry of preEntries) {
  const { slug, ...rest } = entry;
  pre[slug] = rest;
}

const post = {};
const sortedGroups = [...postGroups.entries()].sort((a, b) =>
  compareAdministrativeName(a[1].name, b[1].name),
);
for (const [slug, group] of sortedGroups) {
  group.componentSlugs.sort((a, b) => compareAdministrativeName(pre[a].name, pre[b].name));
  post[slug] = group;
}

const output = {
  schemaVersion: 1,
  source: SOURCE_META,
  mergeDate: MERGE_DATE,
  counts: { post: Object.keys(post).length, pre: Object.keys(pre).length },
  pre,
  post,
};

const outputPath = path.join(publicDataRoot, 'province-reconciliation.json');
writeJson(outputPath, output);

console.log(
  `Wrote reconciliation: ${output.counts.pre} pre → ${output.counts.post} post -> ${outputPath}`,
);
