/**
 * Generate the Viettrace Protomaps MapLibre style using two PMTiles sources:
 *   - protomaps-world: world-z5.pmtiles — global context at zoom 0-5
 *   - protomaps:       vietnam.pmtiles  — full OSM detail for Vietnam at zoom 0-15
 *
 * Two-source strategy fixes the gray-box issue caused by the Vietnam bbox extract
 * only having tiles for the Vietnam area at zoom 3+.
 *
 * Glyphs and sprites are SELF-HOSTED (no Protomaps CDN dependency): they are
 * served from the same asset base as the tiles. In production these live on
 * Cloudflare R2 (the default below); for fully-local dev, point the asset base
 * at a local `npx serve` of viettrace-data/.data/poc-basemap/.
 *
 * Output: public/basemap-style.json (the file NEXT_PUBLIC_MAP_STYLE points at).
 *
 * Usage (production — default; reproduces the committed style):
 *   node scripts/generate-basemap-style.mjs
 *
 * Usage (fully-local dev, assets served from localhost:8766):
 *   BASEMAP_ASSET_BASE_URL=http://localhost:8766 \
 *   BASEMAP_STYLE_OUTPUT=poc-basemap-style.json \
 *     node scripts/generate-basemap-style.mjs
 *   # requires `npx serve --cors -l 8766 .` run inside viettrace-data/.data/poc-basemap/
 *
 * Per-asset overrides: BASEMAP_TILES_BASE_URL / BASEMAP_GLYPHS_BASE_URL / BASEMAP_SPRITES_BASE_URL
 */

import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { layers, namedFlavor } from '@protomaps/basemaps';

// Asset base URLs. Default to the Cloudflare R2 public domain that hosts the
// tiles, glyphs, and sprites (the canonical production source). Override via
// BASEMAP_ASSET_BASE_URL (or the per-asset vars) for local serving — no code
// change needed. See 03-runbooks/basemap-rebuild.md.
const ASSET_BASE =
  process.env.BASEMAP_ASSET_BASE_URL ?? 'https://nested-tiles.viettrace.org/basemap';
const TILES_BASE = process.env.BASEMAP_TILES_BASE_URL ?? ASSET_BASE;
const GLYPHS_BASE = process.env.BASEMAP_GLYPHS_BASE_URL ?? ASSET_BASE;
const SPRITES_BASE = process.env.BASEMAP_SPRITES_BASE_URL ?? ASSET_BASE;

const WORLD_TILES_URL = `pmtiles://${TILES_BASE}/world-z5.pmtiles`;
const VN_TILES_URL = `pmtiles://${TILES_BASE}/vietnam.pmtiles`;
const GLYPHS_URL = `${GLYPHS_BASE}/fonts/{fontstack}/{range}.pbf`;
const SPRITES_URL = `${SPRITES_BASE}/sprites/v4/light`;
const ATTRIBUTION =
  '<a href="https://protomaps.com" target="_blank">Protomaps</a> | ' +
  '<a href="https://www.openstreetmap.org/copyright" target="_blank">© OpenStreetMap contributors</a> | ' +
  '<a href="https://www.naturalearthdata.com" target="_blank">Natural Earth</a>';

// --- Viettrace "Heritage paper" flavor ---------------------------------------
// Start from Protomaps' LIGHT flavor and override the palette toward a warm,
// low-saturation paper look. Goals:
//   - Neutral warm base so the red (#d44, pre-2025) and blue (#3388ff, post-2025)
//     boundary overlays read strongly on top.
//   - background == earth (no #cccccc gray) so the fast-zoom gray-flash
//     (implementation Issue 3) blends into the land instead of flashing gray.
//   - Muted water/green so the basemap recedes behind Viettrace's own layers.
// NOTE: do NOT set `regular`/`bold` here — leaving them undefined keeps the
// fonts at "Noto Sans Regular"/"Noto Sans Medium", the only weights in the
// self-hosted R2 glyph set (no Bold). Setting Bold would make labels vanish.
const HERITAGE_OVERRIDES = {
  // Base surfaces (warm paper)
  background: '#f4f1ea',
  earth: '#f4f1ea',
  buildings: '#ddd6c8', // a touch darker than earth so blocks read at street zoom

  // Water (muted blue-gray with a bit more presence so lakes/rivers stand out)
  water: '#bcd2da',

  // Green / natural landuse (low saturation)
  park_a: '#e0e7d8',
  park_b: '#cdddc1',
  wood_a: '#dde5d6',
  wood_b: '#c8dcc0',
  scrub_a: '#dde3d4',
  scrub_b: '#cdddc1',
  zoo: '#dde3d6',
  // Other landuse tinted toward paper so they don't blotch the base
  hospital: '#ece4e0',
  industrial: '#e6e7e0',
  school: '#ece6da',
  pedestrian: '#ece9df',
  sand: '#efebdd',
  beach: '#f0ead6',
  military: '#e6e2d8',
  aerodrome: '#e6e4dd',

  // Roads — white major/highway, warm-light minor; casings a touch darker than paper
  highway: '#ffffff',
  major: '#ffffff',
  minor_b: '#ffffff',
  link: '#ffffff',
  minor_a: '#f3efe7',
  minor_service: '#f3efe7',
  other: '#f3efe7',
  // Casings a touch darker than before so roads keep an edge over the paper base
  highway_casing_early: '#d6cdba',
  highway_casing_late: '#d6cdba',
  major_casing_early: '#dcd4c4',
  major_casing_late: '#dcd4c4',
  minor_casing: '#ded7c8',
  minor_service_casing: '#ded7c8',
  link_casing: '#dcd4c4',
  railway: '#c2b8a6',

  // Labels — warm gray ink on a paper halo for legibility over land/water
  city_label: '#4f4a43',
  city_label_halo: '#f4f1ea',
  state_label: '#8a8075',
  state_label_halo: '#f4f1ea',
  country_label: '#9a8e80',
  subplace_label: '#857d70',
  subplace_label_halo: '#f4f1ea',
  roads_label_major: '#8a8278',
  roads_label_major_halo: '#f7f4ee',
  roads_label_minor: '#9a9288',
  roads_label_minor_halo: '#f7f4ee',
  ocean_label: '#8aa1ab',
  address_label: '#9a9288',
  address_label_halo: '#f7f4ee',

  // Landcover (low-zoom natural cover) — keep in step with the green landuse above
  landcover: {
    grassland: 'rgba(222, 232, 213, 1)',
    barren: 'rgba(238, 233, 220, 1)',
    urban_area: 'rgba(234, 230, 222, 1)',
    farmland: 'rgba(226, 234, 215, 1)',
    glacier: 'rgba(248, 248, 245, 1)',
    scrub: 'rgba(228, 233, 213, 1)',
    forest: 'rgba(205, 224, 200, 1)',
  },
};

const flavor = { ...namedFlavor('light'), ...HERITAGE_OVERRIDES };

// --- Label-density tuning -----------------------------------------------------
// The flavor controls colour only; zoom/size live on the generated layers.
// Conservative first pass: hold minor-road labels until z13 so the mid-zoom
// view (where province/district boundaries matter most) stays uncluttered.
// Applied to the Vietnam-detail source only (world labels stop at z8 anyway).
function tuneLabelDensity(layer) {
  if (layer.id === 'roads_labels_minor') {
    return { ...layer, minzoom: Math.max(layer.minzoom ?? 0, 13) };
  }
  return layer;
}

// Suppress the basemap's own admin lines so only Viettrace's red/blue boundary
// layer is visible. NOTE: the Protomaps v4 ids are `boundaries` /
// `boundaries_country` — `'boundaries'.includes('boundary')` is FALSE (i vs y),
// so match the stem `boundar` (covers boundary + boundaries) plus `admin`.
const isAdminBoundaryLayer = id => /boundar|admin/.test(id ?? '');

// Build the full layer list + style object for one label language. Everything
// except the label text-fields is identical across languages, so we just pass
// `lang` through to `layers()` (which feeds get_multiline_name / get_country_name).
function buildStyle(lang) {
  // --- World context layers (zoom 0–5 global coverage) ---
  // Provides background, water, land fill, and labels for all continents.
  // maxzoom: 8 on each layer stops rendering before tiles become overscaled.
  const worldLayers = layers('protomaps-world', flavor, { lang })
    .filter(l => !isAdminBoundaryLayer(l.id))
    .map(l => {
      // background has no source — it paints the full canvas; keep as-is (renders globally).
      if (l.type === 'background') return l;
      return { ...l, id: `world-${l.id}`, maxzoom: 8 };
    });

  // --- Vietnam detail layers (full zoom 0–15 OSM data) ---
  // Renders on top of world layers; provides crisp detail inside Vietnam's bbox.
  // Background omitted — already included from worldLayers.
  const vnLayers = layers('protomaps', flavor, { lang })
    .filter(l => !isAdminBoundaryLayer(l.id))
    .filter(l => l.type !== 'background')
    .map(tuneLabelDensity);

  const allLayers = [...worldLayers, ...vnLayers];

  const style = {
    version: 8,
    name: `Viettrace Basemap (Protomaps, Heritage palette, name:${lang}, dual-source)`,
    glyphs: GLYPHS_URL,
    sprite: SPRITES_URL,
    sources: {
      'protomaps-world': {
        type: 'vector',
        url: WORLD_TILES_URL,
        attribution: ATTRIBUTION,
      },
      protomaps: {
        type: 'vector',
        url: VN_TILES_URL,
        attribution: ATTRIBUTION,
      },
    },
    layers: allLayers,
  };

  return {
    style,
    worldCount: worldLayers.length,
    vnCount: vnLayers.length,
    total: allLayers.length,
  };
}

const __dirname = dirname(fileURLToPath(import.meta.url));
// Output filename is configurable: default is the production basemap-style.json;
// fully-local dev uses BASEMAP_STYLE_OUTPUT=poc-basemap-style.json with a
// localhost asset base. The Vietnamese style keeps the base name; the English
// style gets a `-en` suffix (e.g. basemap-style.json → basemap-style-en.json),
// matched at runtime by localizeBasemapStyle() in the frontend.
const baseOutName = process.env.BASEMAP_STYLE_OUTPUT ?? 'basemap-style.json';
const enOutName = baseOutName.replace(/\.json$/, '-en.json');

// 'vi' is the base/default file; 'en' follows the app language toggle.
const targets = [
  { lang: 'vi', outName: baseOutName },
  { lang: 'en', outName: enOutName },
];

console.log(`Asset base: ${ASSET_BASE}`);
for (const { lang, outName } of targets) {
  const { style, worldCount, vnCount, total } = buildStyle(lang);
  const outPath = resolve(__dirname, '..', 'public', outName);
  writeFileSync(outPath, JSON.stringify(style, null, 2), 'utf-8');
  console.log(
    `Written: ${outPath}  (name:${lang}, world ${worldCount} + vn ${vnCount} = ${total} layers)`,
  );
}
