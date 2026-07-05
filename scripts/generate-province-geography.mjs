import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSlug, readJson, writeJson } from './province-index-utils.mjs';

// Track B — province geography (neighbors + coastline), derived entirely from geometry already in the
// repo (no new external dataset):
//   - Neighbors: two provinces are adjacent iff their DISPLAY polygons share ≥1 boundary edge
//     (identical OSM vertices along shared borders). Direction = bearing from the province centroid
//     to the midpoint of the shared border, bucketed N/E/S/W.
//   - Coastline: DISPLAYED length uses OFFICIAL figures (coastline is resolution-dependent — the
//     coastline paradox — so a full-detail OSM sum runs far longer than published figures). Post-2025
//     = curated official value; pre-2025 = that post total split across its coastal components in
//     proportion to their geometry coastline (P1). The raw OSM-geometry length (mainland only, island
//     shorelines excluded) is kept as coastlineGeomKm for cross-check. hasCoastline is geometry-based.
// Deterministic output (hardcoded lastUpdated) so re-runs don't dirty the tree.

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspaceRoot = path.resolve(repoRoot, '..');
const dataRoot = process.env.VIETTRACE_DATA_DIR
  ? path.resolve(process.env.VIETTRACE_DATA_DIR)
  : path.join(workspaceRoot, 'viettrace-data');
const publicDataRoot = path.join(repoRoot, 'public', 'data');

const LAST_UPDATED = '2026-07-05';
const EXPECTED = { pre: 63, post: 34 };
const MIN_SHARED_EDGES = 1; // shared borders use identical vertices; 0 vertex-only false positives
const COAST_MIN_KM = 5; // guard against a stray tile-seam edge marking an inland province coastal

// Natural Earth admin-0 countries (public domain, "Made with Natural Earth") — used ONLY to label
// which foreign country a province's international land border faces. Git-ignored raw under .data
// (see manifests/natural-earth-admin0-countries-10m-2026-07-05.json); must be present to regenerate.
const NE_COUNTRIES = path.join(
  dataRoot,
  '.data',
  'raw',
  'natural-earth',
  'ne_10m_admin_0_countries.geojson',
);
const COUNTRY_ISO = { CHN: 'CN', LAO: 'LA', KHM: 'KH' }; // NE ISO_A3 → our short code
const BORDER_WINDOW = { minLng: 100, minLat: 7, maxLng: 112, maxLat: 24 }; // around VN land borders
const INTL_MAX_DEG = 0.3; // a border edge must sit within ~33 km of a country to count (filters coast artifacts)
const INTL_MIN_KM = 10; // drop sliver mis-classifications; real international borders are far longer

// Land-clipped polygons (sea extent removed) for BOTH adjacency and coastline: using them for
// adjacency avoids false "neighbors" whose only shared edge is a maritime boundary in the sea
// (e.g. HCMC↔Cà Mau); inland shared borders keep their identical OSM vertices, so land neighbors
// are unaffected.
const LAND = {
  pre: path.join(dataRoot, '.data', 'processed', 'land-clip', 'vn_pre_2025_display_land.geojson'),
  post: path.join(dataRoot, '.data', 'processed', 'land-clip', 'vn_post_2025_display_land.geojson'),
};
const MASK = path.join(dataRoot, '.data', 'processed', 'land-clip', 'vn_land_mask.geojson');

// Curated OFFICIAL mainland coastline (km) for the 21 coastal post-2025 provinces (Vietnamese
// Wikipedia; committed reference). Displayed coastline uses these — a full-detail geometry sum runs
// far longer (coastline paradox). Pre-2025 provinces get the official post total split across their
// coastal components in proportion to geometry (P1) — no consistent published pre-2025 table exists.
const COASTLINE_CSV = path.join(dataRoot, 'raw', 'coastline', 'vn_coastline_post_2025.csv');

// ---- geometry primitives (shared with build-nested-interior-boundaries.mjs) ----
const ptKey = c => `${c[0].toFixed(6)},${c[1].toFixed(6)}`;
const edgeKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

function* rings(geometry) {
  if (!geometry) return;
  switch (geometry.type) {
    case 'Polygon':
      for (const ring of geometry.coordinates) yield ring;
      break;
    case 'MultiPolygon':
      for (const polygon of geometry.coordinates) for (const ring of polygon) yield ring;
      break;
    case 'GeometryCollection':
      for (const sub of geometry.geometries) yield* rings(sub);
      break;
    default:
      break; // Point/LineString slivers from clipping — skip
  }
}

function collectEdgeKeys(featureCollection) {
  const edges = new Set();
  for (const feature of featureCollection.features) {
    for (const ring of rings(feature.geometry)) {
      for (let i = 0; i + 1 < ring.length; i += 1) {
        edges.add(edgeKey(ptKey(ring[i]), ptKey(ring[i + 1])));
      }
    }
  }
  return edges;
}

// Polygon parts (each = [outerRing, ...holes]) of a possibly-multi geometry.
function* polygonParts(geometry) {
  if (!geometry) return;
  switch (geometry.type) {
    case 'Polygon':
      yield geometry.coordinates;
      break;
    case 'MultiPolygon':
      for (const poly of geometry.coordinates) yield poly;
      break;
    case 'GeometryCollection':
      for (const sub of geometry.geometries) yield* polygonParts(sub);
      break;
    default:
      break;
  }
}

// Planar ring area magnitude (deg²) — used only to rank a province's land parts by size.
function ringArea(ring) {
  let a = 0;
  for (let i = 0; i + 1 < ring.length; i += 1) {
    a += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  return Math.abs(a) / 2;
}

// The mainland = the single largest land part. Coastline/borders are measured on it only, so the
// ~2,000 Hạ Long / Bái Tử Long islets (each a tiny separate part whose whole shore is coast) don't
// inflate Quảng Ninh's coastline; matches the official "mainland coastline" figure.
function largestPartRings(geometry) {
  let best = null;
  let bestArea = -1;
  for (const part of polygonParts(geometry)) {
    const area = part[0] ? ringArea(part[0]) : 0;
    if (area > bestArea) {
      bestArea = area;
      best = part;
    }
  }
  return best ?? [];
}

const R_KM = 6371;
const toRad = d => (d * Math.PI) / 180;
function haversineKm(a, b) {
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const la1 = toRad(a[1]);
  const la2 = toRad(b[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Bearing from `from` to `to`, 0°=N, 90°=E, bucketed to 8 compass directions (N, NE, E, SE, …).
const COMPASS_8 = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
function directionOf(from, to) {
  const dLng = (to[0] - from[0]) * Math.cos(toRad((from[1] + to[1]) / 2));
  const dLat = to[1] - from[1];
  const deg = (Math.atan2(dLng, dLat) * 180) / Math.PI;
  const b = (deg + 360) % 360;
  return COMPASS_8[Math.round(b / 45) % 8];
}

// point → segment distance in planar degrees (adequate for comparing the 3 well-separated neighbours)
function distPointToSeg(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  let t = l2 > 0 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

const inWindow = c =>
  c[0] >= BORDER_WINDOW.minLng &&
  c[0] <= BORDER_WINDOW.maxLng &&
  c[1] >= BORDER_WINDOW.minLat &&
  c[1] <= BORDER_WINDOW.maxLat;

// Load CN/LA/KH boundary segments within the VN border window (keeps nearest-country fast + local).
function loadNeighborCountries() {
  const fc = readJson(NE_COUNTRIES);
  const countries = [];
  for (const f of fc.features) {
    const iso = f.properties?.ISO_A3 ?? f.properties?.ADM0_A3;
    const code = COUNTRY_ISO[iso];
    if (!code) continue;
    const segs = [];
    for (const ring of rings(f.geometry)) {
      for (let i = 0; i + 1 < ring.length; i += 1) {
        if (inWindow(ring[i]) || inWindow(ring[i + 1])) segs.push([ring[i], ring[i + 1]]);
      }
    }
    if (segs.length) countries.push({ code, segs });
  }
  return countries;
}

// Nearest of the 3 neighbour countries to a point → { code, dist(deg) } (dist large ⇒ not a real border).
function nearestCountry(point, countries) {
  let best = null;
  let bestDist = Infinity;
  for (const c of countries) {
    for (const [a, b] of c.segs) {
      const d = distPointToSeg(point, a, b);
      if (d < bestDist) {
        bestDist = d;
        best = c.code;
      }
    }
  }
  return { code: best, dist: bestDist };
}

function adminFeatures(geojsonPath) {
  return readJson(geojsonPath).features.filter(f => f.properties?.boundary === 'administrative');
}

function buildMode(mode, centerBySlug, maskEdges, countries) {
  const features = adminFeatures(LAND[mode]);
  // per-province boundary edge sets, keyed by slug
  const edgesBySlug = new Map();
  const result = {};
  for (const f of features) {
    const slug = createSlug(f.properties.name);
    const edges = new Set();
    for (const ring of rings(f.geometry)) {
      for (let i = 0; i + 1 < ring.length; i += 1)
        edges.add(edgeKey(ptKey(ring[i]), ptKey(ring[i + 1])));
    }
    edgesBySlug.set(slug, edges);
    result[slug] = {
      neighbors: [],
      hasCoastline: false,
      coastlineKm: 0,
      coastlineGeomKm: 0,
      borders: [],
    };
  }

  const slugs = [...edgesBySlug.keys()];

  // neighbors: shared-edge intersection; direction from centroid → shared-border midpoint
  for (let i = 0; i < slugs.length; i += 1) {
    for (let j = i + 1; j < slugs.length; j += 1) {
      const a = edgesBySlug.get(slugs[i]);
      const b = edgesBySlug.get(slugs[j]);
      const shared = [];
      for (const e of a) if (b.has(e)) shared.push(e);
      if (shared.length < MIN_SHARED_EDGES) continue;
      let sx = 0;
      let sy = 0;
      let n = 0;
      for (const e of shared) {
        for (const pt of e.split('|')) {
          const [lng, lat] = pt.split(',').map(Number);
          sx += lng;
          sy += lat;
          n += 1;
        }
      }
      const mid = [sx / n, sy / n];
      const cA = centerBySlug.get(slugs[i]);
      const cB = centerBySlug.get(slugs[j]);
      if (cA) result[slugs[i]].neighbors.push({ slug: slugs[j], direction: directionOf(cA, mid) });
      if (cB) result[slugs[j]].neighbors.push({ slug: slugs[i], direction: directionOf(cB, mid) });
    }
  }

  // Per province, classify each land-clipped boundary edge: shared with another province → internal
  // (skip); on the land-mask boundary → coastline; otherwise → an international land border,
  // attributed to the nearest neighbour country (edges far from all 3 are coast/clip artifacts).
  const edgeCount = new Map();
  for (const edges of edgesBySlug.values()) {
    for (const e of edges) edgeCount.set(e, (edgeCount.get(e) ?? 0) + 1);
  }

  for (const f of features) {
    const slug = createSlug(f.properties.name);
    if (!result[slug]) continue;
    let coastKm = 0;
    const intl = new Map(); // country code → { sx, sy, n, km }
    // Mainland only: island shorelines are excluded so a bay province isn't over-counted.
    for (const ring of largestPartRings(f.geometry)) {
      for (let i = 0; i + 1 < ring.length; i += 1) {
        const a = ring[i];
        const b = ring[i + 1];
        const ek = edgeKey(ptKey(a), ptKey(b));
        if ((edgeCount.get(ek) ?? 0) > 1) continue; // shared internal border between two provinces
        const len = haversineKm(a, b);
        if (maskEdges.has(ek)) {
          coastKm += len; // land ↔ sea → coastline
          continue;
        }
        const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        const { code, dist } = nearestCountry(mid, countries);
        if (!code || dist > INTL_MAX_DEG) continue; // not close to any neighbour country ⇒ artifact
        const acc = intl.get(code) ?? { sx: 0, sy: 0, n: 0, km: 0 };
        acc.sx += mid[0];
        acc.sy += mid[1];
        acc.n += 1;
        acc.km += len;
        intl.set(code, acc);
      }
    }
    result[slug].hasCoastline = coastKm >= COAST_MIN_KM;
    // Raw geometry length (mainland) — cross-check only; the displayed coastlineKm is set from the
    // curated official figures + proportional pre split in the run step below (P1).
    result[slug].coastlineGeomKm = result[slug].hasCoastline ? Math.round(coastKm / 10) * 10 : 0;

    const center = centerBySlug.get(slug);
    const borders = [];
    for (const [code, acc] of intl) {
      if (acc.km < INTL_MIN_KM) continue;
      const mid = [acc.sx / acc.n, acc.sy / acc.n];
      borders.push({
        country: code,
        direction: center ? directionOf(center, mid) : 'N',
        km: Math.round(acc.km / 10) * 10,
      });
    }
    borders.sort(
      (x, y) => x.direction.localeCompare(y.direction) || x.country.localeCompare(y.country),
    );
    result[slug].borders = borders;
  }

  for (const s of slugs) {
    result[s].neighbors.sort(
      (x, y) => x.direction.localeCompare(y.direction) || x.slug.localeCompare(y.slug),
    );
  }
  if (Object.keys(result).length !== EXPECTED[mode]) {
    throw new Error(
      `${mode}: ${Object.keys(result).length} provinces, expected ${EXPECTED[mode]}.`,
    );
  }
  return result;
}

// Curated official post-2025 coastline (km), keyed by post slug.
function loadOfficialPostCoastline() {
  const text = readFileSync(COASTLINE_CSV, 'utf8');
  const map = {};
  for (const line of text.split(/\r?\n/).slice(1)) {
    if (!line.trim()) continue;
    const parts = line.split(',');
    const slug = parts[0].trim();
    const km = Number(parts[parts.length - 1]);
    if (slug && Number.isFinite(km)) map[slug] = km;
  }
  return map;
}

// Overwrite each province's displayed coastlineKm with the official figures (P1): post = the curated
// value; pre = the post total split across its coastal pre-components in proportion to their
// geometry coastline (so pre sums to the official post total and is anchored to real shape).
function applyOfficialCoastline(output) {
  const officialPost = loadOfficialPostCoastline();
  const recon = readJson(path.join(publicDataRoot, 'province-reconciliation.json'));
  const preComponentsByPost = {};
  for (const [preSlug, info] of Object.entries(recon.pre)) {
    (preComponentsByPost[info.newSlug] ??= []).push(preSlug);
  }
  for (const [slug, entry] of Object.entries(output.post)) {
    const km = officialPost[slug] ?? 0;
    entry.coastlineKm = km;
    entry.hasCoastline = km > 0;
  }
  for (const [preSlug, entry] of Object.entries(output.pre)) {
    const postSlug = recon.pre[preSlug]?.newSlug;
    const official = postSlug ? officialPost[postSlug] : undefined;
    if (!official || !entry.hasCoastline) {
      entry.coastlineKm = 0;
      continue;
    }
    const coastalComps = (preComponentsByPost[postSlug] ?? []).filter(
      s => output.pre[s]?.hasCoastline,
    );
    const sumGeom = coastalComps.reduce((s, cs) => s + (output.pre[cs]?.coastlineGeomKm ?? 0), 0);
    entry.coastlineKm = sumGeom > 0 ? Math.round((official * entry.coastlineGeomKm) / sumGeom) : 0;
  }
}

// ---- run ----
const index = readJson(path.join(publicDataRoot, 'province-index.json'));
const centerBy = { pre: new Map(), post: new Map() };
for (const p of index.provinces) centerBy[p.mode].set(p.slug, p.center);

const maskEdges = collectEdgeKeys(readJson(MASK));
const countries = loadNeighborCountries();

const output = {
  schemaVersion: 3,
  lastUpdated: LAST_UPDATED,
  sources: {
    neighbors: {
      method:
        'shared boundary edge between province display polygons; direction = centroid → shared-border midpoint bearing (8 compass directions)',
      input:
        'viettrace-data/processed/provinces/vn_{pre,post}_2025_display.geojson (© OpenStreetMap contributors, ODbL)',
    },
    coastline: {
      method:
        'official mainland coastline — post-2025 = curated figure; pre-2025 = post total split across coastal components in proportion to geometry coastline (P1). coastlineGeomKm = raw OSM-geometry length (mainland), cross-check only; it runs longer (coastline paradox)',
      input:
        'viettrace-data/raw/coastline/vn_coastline_post_2025.csv (official figures via Wikipedia) + province-reconciliation.json + land-clip geometry (© OpenStreetMap contributors, ODbL)',
    },
    borders: {
      method:
        'international land-border edges (province boundary edges neither shared with another VN province nor on the land-mask boundary) attributed to the nearest neighbour country; direction = centroid → mean border-edge bearing (8 compass directions)',
      input:
        'Natural Earth 1:10m admin-0 countries (public domain, "Made with Natural Earth") — CN/LA/KH within the VN border window',
    },
  },
  pre: buildMode('pre', centerBy.pre, maskEdges, countries),
  post: buildMode('post', centerBy.post, maskEdges, countries),
};

applyOfficialCoastline(output);

const outputPath = path.join(publicDataRoot, 'province-geography.json');
writeJson(outputPath, output);

const summarize = m => {
  const rows = Object.values(output[m]);
  const coast = rows.filter(r => r.hasCoastline).length;
  const intl = rows.filter(r => (r.borders?.length ?? 0) > 0).length;
  const km = rows.reduce((s, r) => s + (r.coastlineKm ?? 0), 0);
  const avgN = (rows.reduce((s, r) => s + r.neighbors.length, 0) / rows.length).toFixed(1);
  return `${m}: ${rows.length} provinces, ${coast} coastal (Σ ${km} km), ${intl} with intl borders, avg ${avgN} neighbors`;
};
console.log(`Wrote geography -> ${outputPath}`);
console.log('  ' + summarize('pre'));
console.log('  ' + summarize('post'));
