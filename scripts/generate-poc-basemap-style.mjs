/**
 * Generate the Viettrace Protomaps MapLibre style using two PMTiles sources:
 *   - protomaps-world: world-z5.pmtiles — global context at zoom 0-5
 *   - protomaps:       vietnam.pmtiles  — full OSM detail for Vietnam at zoom 0-15
 *
 * Two-source strategy fixes the gray-box issue caused by the Vietnam bbox extract
 * only having tiles for the Vietnam area at zoom 3+.
 *
 * Glyphs and sprites are SELF-HOSTED (no Protomaps CDN dependency): they are served
 * from the same asset base as the tiles (locally: viettrace-data/.data/poc-basemap/
 * which holds fonts/ and sprites/ copied from protomaps/basemaps-assets).
 *
 * Output: public/poc-basemap-style.json
 *
 * Usage (local):
 *   node scripts/generate-poc-basemap-style.mjs
 *   # requires `npx serve --cors -p 8766 .` run inside viettrace-data/.data/poc-basemap/
 *
 * Usage (production — point everything at Cloudflare R2 and re-run):
 *   BASEMAP_ASSET_BASE_URL=https://basemap.viettrace.org node scripts/generate-poc-basemap-style.mjs
 *   # or override per-asset: BASEMAP_TILES_BASE_URL / BASEMAP_GLYPHS_BASE_URL / BASEMAP_SPRITES_BASE_URL
 */

import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { layers, namedFlavor } from '@protomaps/basemaps';

// Asset base URLs. Default to the local `npx serve` on port 8766 that serves
// viettrace-data/.data/poc-basemap/ (tiles + fonts/ + sprites/). For production,
// set BASEMAP_ASSET_BASE_URL (or the per-asset overrides) to the R2 public URL
// and re-run this script — no code change needed at cutover.
const ASSET_BASE = process.env.BASEMAP_ASSET_BASE_URL ?? 'http://localhost:8766';
const TILES_BASE = process.env.BASEMAP_TILES_BASE_URL ?? ASSET_BASE;
const GLYPHS_BASE = process.env.BASEMAP_GLYPHS_BASE_URL ?? ASSET_BASE;
const SPRITES_BASE = process.env.BASEMAP_SPRITES_BASE_URL ?? ASSET_BASE;

const WORLD_TILES_URL = `pmtiles://${TILES_BASE}/world-z5.pmtiles`;
const VN_TILES_URL = `pmtiles://${TILES_BASE}/vietnam.pmtiles`;
const GLYPHS_URL = `${GLYPHS_BASE}/fonts/{fontstack}/{range}.pbf`;
const SPRITES_URL = `${SPRITES_BASE}/sprites/v4/light`;
const ATTRIBUTION =
  '<a href="https://protomaps.com" target="_blank">Protomaps</a> | ' +
  '<a href="https://www.openstreetmap.org/copyright" target="_blank">© OpenStreetMap contributors</a>';

const flavor = namedFlavor('light');

// --- World context layers (zoom 0–5 global coverage) ---
// Provides background, water, land fill, and labels for all continents.
// maxzoom: 6 on each layer stops rendering before tiles become overscaled.
const worldLayers = layers('protomaps-world', flavor, { lang: 'vi' })
  .filter(l => {
    const id = l.id ?? '';
    return !id.includes('boundary') && !id.includes('admin');
  })
  .map(l => {
    // background has no source — it paints the full canvas; keep as-is (renders globally).
    if (l.type === 'background') return l;
    return { ...l, id: `world-${l.id}`, maxzoom: 8 };
  });

// --- Vietnam detail layers (full zoom 0–15 OSM data) ---
// Renders on top of world layers; provides crisp detail inside Vietnam's bbox.
// Background omitted — already included from worldLayers.
const vnLayers = layers('protomaps', flavor, { lang: 'vi' })
  .filter(l => {
    const id = l.id ?? '';
    return !id.includes('boundary') && !id.includes('admin');
  })
  .filter(l => l.type !== 'background');

const allLayers = [...worldLayers, ...vnLayers];

const style = {
  version: 8,
  name: 'Viettrace POC Basemap (Protomaps light, name:vi, dual-source)',
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

const __dirname = dirname(fileURLToPath(import.meta.url));
// Output filename is configurable so the same script produces the local POC style
// (default) and the production R2-backed style (BASEMAP_STYLE_OUTPUT=basemap-style.json).
const outName = process.env.BASEMAP_STYLE_OUTPUT ?? 'poc-basemap-style.json';
const outPath = resolve(__dirname, '..', 'public', outName);
writeFileSync(outPath, JSON.stringify(style, null, 2), 'utf-8');

const worldCount = worldLayers.length;
const vnCount = vnLayers.length;
console.log(`Written: ${outPath}`);
console.log(`World layers: ${worldCount} (maxzoom: 8, except background)`);
console.log(`Vietnam layers: ${vnCount} (zoom 0–15 detail)`);
console.log(`Total layers: ${allLayers.length}`);
