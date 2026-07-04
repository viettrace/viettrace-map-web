import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  compareAdministrativeName,
  createSlug,
  readJson,
  writeJson,
} from './province-index-utils.mjs';

// Track B — province data layer, artifact A (statistics).
// Population: HDX COD-PS 2024 ADM1 (the 63 pre-2025 provinces; `T_TL` total), source GSO/UNFPA,
//   CC BY-IGO — vendored at viettrace-data/raw/hdx-cod-ps/. Post-2025 population is DERIVED by
//   summing the pre-2025 components via province-reconciliation.json (same 2024 base).
// Area: computed geodesically from our own display province polygons (per mode). Density = pop / area.
// Deterministic output (hardcoded lastUpdated) so re-runs don't dirty the tree.

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspaceRoot = path.resolve(repoRoot, '..');
const dataRoot = process.env.VIETTRACE_DATA_DIR
  ? path.resolve(process.env.VIETTRACE_DATA_DIR)
  : path.join(workspaceRoot, 'viettrace-data');
const publicDataRoot = path.join(repoRoot, 'public', 'data');

const POP_CSV = path.join(dataRoot, 'raw', 'hdx-cod-ps', 'vnm_admpop_adm1_2024.csv');
// Official GSO province area (63 pre-2025), keyed by our slug — see raw/gso-province-area/README.md.
const AREA_CSV = path.join(dataRoot, 'raw', 'gso-province-area', 'pre-2025-province-area.csv');
// Area is computed from the LAND-CLIPPED display polygons (the production-tile geometry). The plain
// `_display` versions still include territorial sea (see Track E), which inflates coastal-province
// area (~1.5x nationally). The land-clipped files live under `.data/` (git-ignored local artifacts of
// the clip pipeline), so REGENERATING statistics requires them present locally — like the nested
// pipeline. The committed `public/data/province-statistics.json` is the shipped output; CI does not
// regenerate it. Rebuild the inputs with the viettrace-data land-clip pipeline if absent.
const GEO = {
  post: path.join(dataRoot, '.data', 'processed', 'land-clip', 'vn_post_2025_display_land.geojson'),
  pre: path.join(dataRoot, '.data', 'processed', 'land-clip', 'vn_pre_2025_display_land.geojson'),
};
const POP_YEAR = 2024;
const LAST_UPDATED = '2026-07-04';
const EXPECTED = { post: 34, pre: 63 };

const SOURCES = {
  'hdx-cod-ps-2024': {
    indicator: 'population',
    license: 'CC BY-IGO',
    name: 'UNFPA & General Statistics Office of Viet Nam',
    url: 'https://data.humdata.org/dataset/cod-ps-vnm',
    via: 'HDX / OCHA COD-PS',
    year: 2024,
  },
  'gso-official-area': {
    indicator: 'area_km2',
    license: 'Official GSO cadastral figures (số liệu nhà nước — facts)',
    name: 'General Statistics Office of Viet Nam — official province area (diện tích tự nhiên)',
    note: '63 pre-2025 provinces; values tabulated via en.wikipedia Provinces-of-Vietnam (rev 2025-04-21), spot-checked vs official. Post-2025 area = sum of pre-2025 components.',
  },
  'viettrace-geometry': {
    indicator: 'area_km2_computed',
    license: 'ODbL (© OpenStreetMap contributors)',
    name: 'Viettrace — geodesic area from OSM-derived land-clipped polygons (cross-check only)',
  },
};

// Population-source names (ADM1_VI) that do not slugify to the province-index slug.
// - "Thừa Thiên Huế": HDX 2024 uses the old province name; our boundary data uses "Thành phố Huế"
//   (upgraded to a centrally-governed city on 2025-01-01) → slug `hue`.
const POP_NAME_ALIASES = {
  'Thừa Thiên Huế': 'hue',
};

// ---- geodesic area (m²), same algorithm as @turf/area (no dependency) ----
const EARTH_RADIUS = 6378137;
const toRad = deg => (deg * Math.PI) / 180;

function ringAreaM2(coords) {
  const n = coords.length;
  if (n <= 2) return 0;
  let total = 0;
  for (let i = 0; i < n; i += 1) {
    let lower;
    let middle;
    let upper;
    if (i === n - 2) {
      lower = n - 2;
      middle = n - 1;
      upper = 0;
    } else if (i === n - 1) {
      lower = n - 1;
      middle = 0;
      upper = 1;
    } else {
      lower = i;
      middle = i + 1;
      upper = i + 2;
    }
    total +=
      (toRad(coords[upper][0]) - toRad(coords[lower][0])) * Math.sin(toRad(coords[middle][1]));
  }
  return (total * EARTH_RADIUS * EARTH_RADIUS) / 2;
}

function polygonAreaM2(rings) {
  if (!rings.length) return 0;
  let area = Math.abs(ringAreaM2(rings[0]));
  for (let i = 1; i < rings.length; i += 1) area -= Math.abs(ringAreaM2(rings[i]));
  return Math.max(0, area);
}

function geometryAreaKm2(geometry) {
  if (!geometry) return 0;
  if (geometry.type === 'Polygon') return polygonAreaM2(geometry.coordinates) / 1e6;
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.reduce((sum, poly) => sum + polygonAreaM2(poly), 0) / 1e6;
  }
  if (geometry.type === 'GeometryCollection') {
    return geometry.geometries.reduce((sum, g) => sum + geometryAreaKm2(g), 0);
  }
  return 0;
}

// ---- CSV (fixed wide schema, no quoted fields — assert column count) ----
function parseCsv(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(Boolean);
  const header = lines[0].split(',');
  const idx = Object.fromEntries(header.map((h, i) => [h.trim(), i]));
  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cells = lines[i].split(',');
    if (cells.length !== header.length) {
      throw new Error(`Row ${i + 1}: ${cells.length} columns, expected ${header.length}.`);
    }
    rows.push(cells);
  }
  return { idx, rows };
}

function areaBySlug(geojsonPath, expected) {
  const data = readJson(geojsonPath);
  const map = new Map();
  for (const feature of data.features.filter(f => f.properties?.boundary === 'administrative')) {
    const name = feature.properties?.name;
    if (!name) continue;
    const slug = createSlug(name);
    map.set(slug, (map.get(slug) || 0) + geometryAreaKm2(feature.geometry));
  }
  if (map.size !== expected) {
    throw new Error(`${geojsonPath}: ${map.size} admin features, expected ${expected}.`);
  }
  return map;
}

const round2 = n => Math.round(n * 100) / 100;
const density = (pop, area) => (area > 0 ? Math.round((pop / area) * 10) / 10 : null);

// ---- load ----
const recon = readJson(path.join(publicDataRoot, 'province-reconciliation.json'));
const index = readJson(path.join(publicDataRoot, 'province-index.json'));
const nameBySlug = { post: new Map(), pre: new Map() };
for (const p of index.provinces) nameBySlug[p.mode].set(p.slug, p.name);

const preArea = areaBySlug(GEO.pre, EXPECTED.pre);
const postArea = areaBySlug(GEO.post, EXPECTED.post);

// ---- population (pre) ----
const { idx, rows } = parseCsv(fs.readFileSync(POP_CSV, 'utf8'));
for (const col of ['ADM1_VI', 'ADM1_PCODE', 'T_TL']) {
  if (!(col in idx)) throw new Error(`Population CSV missing column: ${col}`);
}
const prePop = new Map();
const popUnmatched = [];
for (const cells of rows) {
  const rawName = cells[idx.ADM1_VI].trim();
  const slug = POP_NAME_ALIASES[rawName] || createSlug(rawName);
  if (!nameBySlug.pre.has(slug)) popUnmatched.push(`${rawName} -> ${slug}`);
  prePop.set(slug, {
    pcode: cells[idx.ADM1_PCODE].trim(),
    value: Number.parseInt(cells[idx.T_TL], 10),
  });
}
if (popUnmatched.length) {
  throw new Error(
    'Population rows not matching a pre-province slug (add to POP_NAME_ALIASES):\n  ' +
      popUnmatched.join('\n  '),
  );
}

// ---- official area (pre), keyed by slug (join done at extraction time) ----
const officialPre = new Map();
{
  const lines = fs.readFileSync(AREA_CSV, 'utf8').replace(/\r/g, '').split('\n').filter(Boolean);
  for (let i = 1; i < lines.length; i += 1) {
    const m = lines[i].match(/^([^,]+),".*",([\d.]+)$/);
    if (!m) throw new Error(`Bad official-area row: ${lines[i]}`);
    officialPre.set(m[1], Number.parseFloat(m[2]));
  }
  if (officialPre.size !== EXPECTED.pre) {
    throw new Error(`Official area: ${officialPre.size} rows, expected ${EXPECTED.pre}.`);
  }
}

// ---- build pre (63) ----
const pre = {};
for (const [slug, name] of [...nameBySlug.pre].sort((a, b) =>
  compareAdministrativeName(a[1], b[1]),
)) {
  const pop = prePop.get(slug);
  const computedArea = preArea.get(slug);
  const officialArea = officialPre.get(slug);
  if (!pop) throw new Error(`Missing population for pre province: ${name} (${slug}).`);
  if (computedArea == null)
    throw new Error(`Missing computed area for pre province: ${name} (${slug}).`);
  if (officialArea == null)
    throw new Error(`Missing official area for pre province: ${name} (${slug}).`);
  pre[slug] = {
    name,
    code: recon.pre[slug]?.code ?? null,
    population: { value: pop.value, year: POP_YEAR, source: 'hdx-cod-ps-2024', derived: false },
    area_km2: { value: officialArea, source: 'gso-official-area', derived: false },
    area_km2_computed: {
      value: round2(computedArea),
      source: 'viettrace-geometry',
      note: 'geodesic cross-check',
    },
    density: { value: density(pop.value, officialArea), derived: true },
  };
}

// ---- build post (34): population DERIVED by summing pre components; area from post polygon ----
const post = {};
for (const [slug, group] of Object.entries(recon.post).sort((a, b) =>
  compareAdministrativeName(a[1].name, b[1].name),
)) {
  const name = nameBySlug.post.get(slug) ?? group.name;
  const computedArea = postArea.get(slug);
  if (computedArea == null)
    throw new Error(`Missing computed area for post province: ${name} (${slug}).`);
  let popSum = 0;
  let officialAreaSum = 0;
  const missing = [];
  for (const comp of group.componentSlugs) {
    if (!pre[comp]) missing.push(comp);
    else {
      popSum += pre[comp].population.value;
      officialAreaSum += pre[comp].area_km2.value;
    }
  }
  if (missing.length) {
    throw new Error(`Post ${name}: missing pre component(s): ${missing.join(', ')}.`);
  }
  post[slug] = {
    name,
    code: group.code,
    population: {
      value: popSum,
      year: POP_YEAR,
      source: 'hdx-cod-ps-2024',
      derived: true,
      method: 'sum of pre-2025 components',
    },
    area_km2: {
      value: round2(officialAreaSum),
      source: 'gso-official-area',
      derived: true,
      method: 'sum of pre-2025 components',
    },
    area_km2_computed: {
      value: round2(computedArea),
      source: 'viettrace-geometry',
      note: 'geodesic cross-check',
    },
    density: { value: density(popSum, officialAreaSum), derived: true },
    components: group.componentSlugs,
  };
}

// ---- sanity ----
const preTotal = Object.values(pre).reduce((s, p) => s + p.population.value, 0);
const postTotal = Object.values(post).reduce((s, p) => s + p.population.value, 0);
if (preTotal !== postTotal) {
  throw new Error(`Pre total ${preTotal} != post total ${postTotal} (summation mismatch).`);
}
if (Object.keys(pre).length !== EXPECTED.pre || Object.keys(post).length !== EXPECTED.post) {
  throw new Error(`Counts off: pre ${Object.keys(pre).length}, post ${Object.keys(post).length}.`);
}

const output = {
  schemaVersion: 1,
  lastUpdated: LAST_UPDATED,
  sources: SOURCES,
  indicators: {
    population: { label_vi: 'Dân số', label_en: 'Population', unit: 'người', additive: true },
    area_km2: {
      label_vi: 'Diện tích',
      label_en: 'Area',
      unit: 'km²',
      additive: true,
      derivation:
        'official (GSO); post-2025 = sum of pre components. `area_km2_computed` = geodesic cross-check.',
    },
    density: {
      label_vi: 'Mật độ dân số',
      label_en: 'Population density',
      unit: 'người/km²',
      additive: false,
      derivation: 'population / area',
    },
  },
  counts: { pre: Object.keys(pre).length, post: Object.keys(post).length },
  nationalTotalPopulation: preTotal,
  nationalTotalArea:
    Math.round(Object.values(pre).reduce((s, p) => s + p.area_km2.value, 0) * 100) / 100,
  pre,
  post,
};

const outputPath = path.join(publicDataRoot, 'province-statistics.json');
writeJson(outputPath, output);
console.log(
  `Wrote statistics: ${output.counts.pre} pre + ${output.counts.post} post, ` +
    `national pop ${preTotal.toLocaleString('en-US')} (${POP_YEAR}) -> ${outputPath}`,
);
