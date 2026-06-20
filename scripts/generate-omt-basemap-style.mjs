// Viettrace self-built basemap style generator (Track A-SB, see ADR-0015).
//
// Produces an "OSM-like, overlay-friendly" MapLibre style on our self-built
// OpenMapTiles (OMT) PMTiles, by recolouring the upstream OSM Bright (OMT) base to a
// "warm-shifted Voyager" palette: distinct landuse hues, road hierarchy + casings,
// POI icons and label halos for legibility, but red & blue VACATED from the basemap
// so the pre-2025 (#d44) / post-2025 (#3388ff) boundary overlays stay dominant.
//
// URLs are env-driven (no hardcoded environment URLs — see CLAUDE.md). Defaults target
// production R2; set OMT_LOCAL=1 (or the individual vars) for the local dev preview.
//
//   node scripts/generate-omt-basemap-style.mjs                 # production (R2)
//   OMT_LOCAL=1 node scripts/generate-omt-basemap-style.mjs     # local dev preview
//
// Emits public/omt-basemap-style.json (vi) + public/omt-basemap-style-en.json (en).
// Reads ./osmbright_src.json (vendored OSM Bright v8 style).
//
// Two same-schema sources: the regional detail tiles (Vietnam + neighbours, z0–14) and a
// world low-zoom layer (z0–5) for the far backdrop beyond the regional bbox.
import fs from 'node:fs';

const SRC = JSON.parse(fs.readFileSync(new URL('../osmbright_src.json', import.meta.url)));

// Vietnam national outline for the spatial label split (see the settlement-label block in
// buildStyle). Dissolved from the post-2025 provinces + 0.05° outward buffer + 0.02° simplify
// (~280 verts) — regenerate with:
//   ogr2ogr -f GeoJSON scripts/vn-outline.geojson <provinces>.geojson -dialect SQLITE \
//     -sql "SELECT ST_SimplifyPreserveTopology(ST_Buffer(ST_Union(geometry),0.05),0.02) AS geometry FROM <layer>"
const VN_OUTLINE = JSON.parse(fs.readFileSync(new URL('./vn-outline.geojson', import.meta.url)))
  .features[0].geometry;

const LOCAL = process.env.OMT_LOCAL === '1' || process.env.OMT_LOCAL === 'true';
const ASSET_BASE = process.env.OMT_ASSET_BASE || 'https://nested-tiles.viettrace.org/basemap';

// Regional-detail PMTiles (VN + neighbours + the surrounding sea, z0–14 — a bbox extract,
// like Protomaps' old vietnam.pmtiles). Covering the near-sea at full zoom is what keeps the
// ocean teal beyond z6 (no white) AND the islands correct, with the world only as the far backdrop.
const REGION_PMTILES =
  process.env.OMT_REGION_PMTILES ||
  (LOCAL
    ? 'pmtiles://http://localhost:8600/region-omt.pmtiles'
    : `pmtiles://${ASSET_BASE}/region-omt.pmtiles`);

// World low-zoom (z0–5) context, SAME OMT schema (Natural Earth via Planetiler) — fills
// the far surroundings beyond the regional bbox when zoomed out, under the region source.
const WORLD_PMTILES =
  process.env.OMT_WORLD_PMTILES ||
  (LOCAL
    ? 'pmtiles://http://localhost:8600/world-omt.pmtiles'
    : `pmtiles://${ASSET_BASE}/world-omt.pmtiles`);

const GLYPHS = process.env.OMT_GLYPHS_URL || `${ASSET_BASE}/fonts/{fontstack}/{range}.pbf`;

// Self-hosted sprite (built by spreet from CC0 OMT/Maki icons). The local preview can
// fall back to the hosted OMT CC0 sprite until the self-hosted one is published.
const SPRITE =
  process.env.OMT_SPRITE_URL ||
  (LOCAL
    ? 'https://openmaptiles.github.io/osm-bright-gl-style/sprite'
    : `${ASSET_BASE}/sprites/osm-bright`);

const ATTRIBUTION = '© OpenMapTiles © OpenStreetMap contributors © Viettrace';

// --- palette: warm neutrals + lively greens + DESATURATED TEAL water + BROWN/TAN roads.
const P = {
  background: '#f4f1ea',
  wood: '#bcd8a6',
  grass: '#d3e8b4',
  park: '#cfe7ad',
  sand: '#f3e7c4',
  ice: '#eef0ee',
  residential: '#eae6dd',
  commercial: '#ece1d4',
  industrial: '#e3ddd0',
  cemetery: '#dde4d0',
  hospital: '#efe3d6',
  school: '#ece6d4',
  railwayArea: '#e4ded1',
  water: '#a9cdd0',
  waterway: '#8fb9bd',
  building: '#e3dacb',
  buildingTop: '#e8e0d2',
  buildingOutline: '#cdbfa8',
  aerowayArea: '#e8e4da',
  aerowayLine: '#dad4c6',
  // Soft, Protomaps-like: white/cream fills + light-tan casings. Hierarchy comes from the
  // casing darkness + OSM Bright's per-class widths, not from saturated fills — so roads stay
  // a quiet backdrop and the red/blue boundary overlays dominate.
  roads: {
    motorway: { f: '#ffffff', c: '#cabd9c' },
    trunk: { f: '#ffffff', c: '#d2c4a9' },
    primary: { f: '#fdfbf6', c: '#dcd2bd' },
    secondary: { f: '#fdfbf6', c: '#e3dbc9' },
    minor: { f: '#fdfbf6', c: '#e6dfd1' },
    link: { f: '#ffffff', c: '#cabd9c' },
    service: { f: '#fdfbf6', c: '#e8e2d4' },
    path: { f: '#c9bca6', c: '#efe9dd' },
  },
  railway: '#c3b9a8',
  ferry: '#7fb0b6',
  label: { text: '#403a30', halo: '#f4f1ea' },
  waterLabel: { text: '#4f8489', halo: '#e7f0ef' },
  roadLabel: { text: '#5b5448', halo: '#ffffff' },
  poiLabel: { text: '#4a4438', halo: '#f4f1ea' },
};

function roadCat(id) {
  if (id.includes('link')) return P.roads.link;
  if (id.includes('motorway')) return P.roads.motorway;
  if (id.includes('trunk')) return P.roads.trunk;
  if (id.includes('primary')) return P.roads.primary;
  if (id.includes('secondary') || id.includes('tertiary')) return P.roads.secondary;
  if (id.includes('path') || id.includes('steps')) return P.roads.path;
  if (id.includes('service') || id.includes('track')) return P.roads.service;
  if (id.includes('minor')) return P.roads.minor;
  return P.roads.minor;
}

function remapFont(font) {
  // R2 fonts ship Noto Sans Regular/Medium/Italic but not Bold.
  if (!Array.isArray(font)) return font;
  return font.map(f => (f === 'Noto Sans Bold' ? 'Noto Sans Medium' : f));
}

function buildStyle(lang) {
  const s = JSON.parse(JSON.stringify(SRC));
  s.name = `Viettrace OMT basemap — ${lang}`;
  s.glyphs = GLYPHS;
  s.sprite = SPRITE;
  s.sources.openmaptiles = { type: 'vector', url: REGION_PMTILES, attribution: ATTRIBUTION };
  s.sources.world = { type: 'vector', url: WORLD_PMTILES, attribution: ATTRIBUTION };
  // The regional-detail bbox (must match sources/region.geojson outer ring). Used as a beige
  // "ocean base" so region island-holes read as land, while the uncapped world-water fills
  // teal everywhere ELSE (no white beyond the bbox). See the region-ocean-base layer below.
  s.sources['region-mask'] = {
    type: 'geojson',
    data: {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [99, 6],
            [121, 6],
            [121, 24],
            [99, 24],
            [99, 6],
          ],
        ],
      },
    },
  };

  const nameField =
    lang === 'en'
      ? ['coalesce', ['get', 'name:en'], ['get', 'name:latin'], ['get', 'name']]
      : ['coalesce', ['get', 'name:vi'], ['get', 'name:latin'], ['get', 'name']];

  // East Sea naming for the VN audience: in EN mode the South China Sea label reads "East Sea"
  // (VI already shows "Biển Đông" via name:vi). Only this one sea feature is remapped; all other
  // water names fall through to the normal nameField.
  const seaNameField =
    lang === 'en'
      ? [
          'case',
          [
            'any',
            ['==', ['get', 'name:en'], 'South China Sea'],
            ['==', ['get', 'name:vi'], 'Biển Đông'],
          ],
          'East Sea',
          nameField,
        ]
      : nameField;

  for (const l of s.layers) {
    const id = l.id;
    const sl = l['source-layer'] || '';
    l.paint = l.paint || {};
    l.layout = l.layout || {};
    if (l.layout['text-font']) l.layout['text-font'] = remapFont(l.layout['text-font']);

    // suppress basemap admin boundaries (Viettrace overlays own these)
    if (sl === 'boundary') {
      l.layout.visibility = 'none';
      continue;
    }

    // Keep icons for NAMELESS POIs (poi-level-1 normally requires a name). After the
    // sovereignty name-strip the island POIs are nameless; without this they lose icons.
    if (id === 'poi-level-1' && Array.isArray(l.filter)) {
      l.filter = l.filter.filter(c => !(Array.isArray(c) && c[0] === 'has' && c[1] === 'name'));
    }

    if (l.type === 'background') {
      l.paint['background-color'] = P.background;
      continue;
    }

    if (sl === 'water') {
      if (id === 'water-pattern') {
        l.layout.visibility = 'none';
        continue;
      }
      // NB: no fill-outline-color here — on the ocean polygon MapLibre also outlines the
      // tile-clip edges, painting a faint teal grid across open water.
      if (l.type === 'fill') l.paint['fill-color'] = P.water;
    }
    if (sl === 'waterway' && l.type === 'line') l.paint['line-color'] = P.waterway;

    if (id === 'landcover-wood') {
      l.paint['fill-color'] = P.wood;
      // OSM Bright ships wood at fill-opacity 0.1 → forest is invisible over our beige.
      // Bump it to a readable, still-soft green (gentle zoom ramp so dense forest at high
      // zoom doesn't over-saturate).
      l.paint['fill-opacity'] = ['interpolate', ['linear'], ['zoom'], 5, 0.45, 12, 0.6];
    } else if (id === 'landcover-grass') l.paint['fill-color'] = P.grass;
    else if (id === 'landcover-grass-park') l.paint['fill-color'] = P.park;
    else if (id === 'landcover-sand') l.paint['fill-color'] = P.sand;
    else if (id === 'landcover-glacier' || id === 'landcover-ice-shelf')
      l.paint['fill-color'] = P.ice;
    else if (id === 'landuse-residential') l.paint['fill-color'] = P.residential;
    else if (id === 'landuse-commercial') l.paint['fill-color'] = P.commercial;
    else if (id === 'landuse-industrial') l.paint['fill-color'] = P.industrial;
    else if (id === 'landuse-cemetery') l.paint['fill-color'] = P.cemetery;
    else if (id === 'landuse-hospital') l.paint['fill-color'] = P.hospital;
    else if (id === 'landuse-school') l.paint['fill-color'] = P.school;
    else if (id === 'landuse-railway') l.paint['fill-color'] = P.railwayArea;
    else if (id === 'building') {
      l.paint['fill-color'] = P.building;
      l.paint['fill-outline-color'] = P.buildingOutline;
    } else if (id === 'building-top') l.paint['fill-color'] = P.buildingTop;
    else if (id === 'aeroway-area') l.paint['fill-color'] = P.aerowayArea;
    else if (sl === 'aeroway' && l.type === 'line') l.paint['line-color'] = P.aerowayLine;

    if (sl === 'transportation' && l.type === 'line') {
      if (id === 'ferry') l.paint['line-color'] = P.ferry;
      else if (id.includes('railway') || id.includes('cablecar')) l.paint['line-color'] = P.railway;
      else if (id.includes('pier')) l.paint['line-color'] = P.building;
      else l.paint['line-color'] = id.includes('casing') ? roadCat(id).c : roadCat(id).f;
    }
    if (sl === 'transportation' && l.type === 'fill' && id.includes('pier'))
      l.paint['fill-color'] = P.building;

    if (l.type === 'symbol') {
      const setName = () => {
        if (l.layout['text-field']) l.layout['text-field'] = nameField;
      };
      if (sl === 'place' && !id.includes('shield')) {
        l.paint['text-color'] = P.label.text;
        l.paint['text-halo-color'] = P.label.halo;
        l.paint['text-halo-width'] = 1.4;
        setName();
      } else if (sl === 'water_name' || id === 'waterway-name') {
        l.paint['text-color'] = P.waterLabel.text;
        l.paint['text-halo-color'] = P.waterLabel.halo;
        if (l.layout['text-field']) l.layout['text-field'] = seaNameField;
      } else if (sl === 'poi') {
        l.paint['text-color'] = P.poiLabel.text;
        l.paint['text-halo-color'] = P.poiLabel.halo;
        l.paint['text-halo-width'] = 1.2;
        setName();
      } else if (id.startsWith('highway-name')) {
        l.paint['text-color'] = P.roadLabel.text;
        l.paint['text-halo-color'] = P.roadLabel.halo;
        setName();
      } else if (id.startsWith('highway-shield')) {
        // Road-ref shields default to pure black (off-theme); warm them to match. (Ref text,
        // not a name — don't run setName.)
        l.paint['text-color'] = P.roadLabel.text;
        l.paint['text-halo-color'] = P.roadLabel.halo;
      } else if (id.startsWith('airport-label')) {
        l.paint['text-color'] = P.label.text;
        l.paint['text-halo-color'] = P.label.halo;
        setName();
      }
    }
  }

  // Polish: real place hierarchy. OSM Bright ships capital == city (same Regular font + size);
  // give capitals/cities Medium weight + darker tone, taper towns/villages down so the
  // settlement rank reads at a glance.
  const placeTune = {
    'place-city-capital': {
      font: ['Noto Sans Medium'],
      color: '#322f29',
      size: {
        base: 1.2,
        stops: [
          [6, 15],
          [11, 27],
        ],
      },
    },
    'place-city': {
      font: ['Noto Sans Medium'],
      color: '#3a352c',
      size: {
        base: 1.2,
        stops: [
          [7, 13],
          [11, 23],
        ],
      },
    },
    'place-town': {
      font: ['Noto Sans Regular'],
      color: '#433c31',
      size: {
        base: 1.2,
        stops: [
          [10, 12.5],
          [15, 21],
        ],
      },
    },
    'place-village': {
      font: ['Noto Sans Regular'],
      color: '#5b5448',
      size: {
        base: 1.2,
        stops: [
          [11, 11],
          [15, 19],
        ],
      },
    },
  };
  for (const [pid, t] of Object.entries(placeTune)) {
    const pl = s.layers.find(x => x.id === pid);
    if (!pl) continue;
    pl.layout = pl.layout || {};
    pl.layout['text-font'] = remapFont(t.font);
    pl.layout['text-size'] = t.size;
    pl.paint = pl.paint || {};
    pl.paint['text-color'] = t.color;
  }

  // Split the ward/commune tier (phường + small settlements) out of `place-other` into its own
  // `place-commune` layer with a STABLE id, so it can be toggled WITHOUT touching the island /
  // locality labels that also live in `place-other`. (These are hidden by default below, along with
  // the rest of the settlement labels — see HIDE_WHEN_BOUNDARIES_ON near the end of buildStyle.)
  const COMMUNE_CLASSES = ['suburb', 'quarter', 'neighbourhood', 'hamlet', 'isolated_dwelling'];
  const placeOther = s.layers.find(x => x.id === 'place-other');
  if (placeOther) {
    const placeCommune = JSON.parse(JSON.stringify(placeOther));
    placeCommune.id = 'place-commune';
    placeCommune.filter = ['in', 'class', ...COMMUNE_CLASSES];
    // place-other now EXCLUDES the commune classes too (so they render only via place-commune).
    if (
      Array.isArray(placeOther.filter) &&
      placeOther.filter[0] === '!in' &&
      placeOther.filter[1] === 'class'
    ) {
      placeOther.filter = [...placeOther.filter, ...COMMUNE_CLASSES];
    } else if (placeOther.filter) {
      placeOther.filter = ['all', placeOther.filter, ['!in', 'class', ...COMMUNE_CLASSES]];
    }
    const vi = s.layers.findIndex(x => x.id === 'place-village');
    s.layers.splice(vi < 0 ? s.layers.length : vi + 1, 0, placeCommune);
  }

  // OSM Bright has no wetland layer — add one so tidal flats / mangroves (landcover
  // class=wetland, e.g. Đồng Rui) render. Drawn above water so the intertidal zone reads.
  const wetland = {
    id: 'landcover-wetland',
    type: 'fill',
    source: 'openmaptiles',
    'source-layer': 'landcover',
    filter: ['==', ['get', 'class'], 'wetland'],
    paint: { 'fill-color': '#a8c5b3', 'fill-opacity': 0.75 },
  };
  const bi = s.layers.findIndex(l => l.id === 'building');
  s.layers.splice(bi < 0 ? s.layers.length : bi, 0, wetland);

  // --- World low-zoom backdrop (OMT `world` source = SE+S-Asia z0–6, disputed islands cut
  // out → clean labels). Styled SOFT like the Protomaps world: thin white roads with light
  // casings (NOT bold), subtle land, city + country labels. Beige (OMT has no low-zoom
  // vegetation, and the user no longer wants green). Drawn UNDER the region layers.
  const wMajorRoad = ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary']]];
  const worldLayers = [
    // UNCAPPED (no maxzoom) so the world ocean overzooms past z5 and keeps every sea teal at
    // any zoom beyond the regional bbox — no white. Inside the bbox it's covered by the beige
    // region-ocean-base (below), so it can't bleed teal through the region's island-holes.
    {
      id: 'world-water',
      type: 'fill',
      source: 'world',
      'source-layer': 'water',
      paint: { 'fill-color': P.water },
    },
    {
      id: 'world-landuse',
      type: 'fill',
      source: 'world',
      'source-layer': 'landuse',
      minzoom: 4,
      maxzoom: 9,
      filter: [
        'in',
        ['get', 'class'],
        ['literal', ['residential', 'commercial', 'industrial', 'suburb', 'neighbourhood']],
      ],
      paint: { 'fill-color': '#ece8dc', 'fill-opacity': 0.6 },
    },
    {
      id: 'world-road-casing',
      type: 'line',
      source: 'world',
      'source-layer': 'transportation',
      minzoom: 5,
      maxzoom: 9,
      filter: wMajorRoad,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#e2dccf',
        'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.8, 9, 2.6],
      },
    },
    {
      id: 'world-road',
      type: 'line',
      source: 'world',
      'source-layer': 'transportation',
      minzoom: 5,
      maxzoom: 9,
      filter: wMajorRoad,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#fbf9f4',
        'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.4, 9, 1.6],
      },
    },
    {
      id: 'world-boundary-country',
      type: 'line',
      source: 'world',
      'source-layer': 'boundary',
      maxzoom: 9,
      filter: ['<=', ['get', 'admin_level'], 2],
      paint: {
        'line-color': '#cdbfa8',
        'line-opacity': 0.5,
        'line-dasharray': [3, 2],
        'line-width': ['interpolate', ['linear'], ['zoom'], 1, 0.4, 6, 1],
      },
    },
  ];
  const afterBg = s.layers.findIndex(l => l.type === 'background') + 1;
  s.layers.splice(afterBg, 0, ...worldLayers);

  // Beige base over the regional bbox, ABOVE the uncapped world-water but BELOW the region's
  // own water/landcover. This is what makes the region's island-holes read as land (beige)
  // instead of the world ocean showing through. minzoom 6 keeps the z0–5 world view (its
  // boundaries/labels inside the bbox) fully intact — the mask only matters once islands
  // resolve as holes (z6+).
  const regionOceanBase = {
    id: 'region-ocean-base',
    type: 'fill',
    source: 'region-mask',
    minzoom: 6,
    paint: { 'fill-color': P.background },
  };
  s.layers.splice(afterBg + worldLayers.length, 0, regionOceanBase);

  // World place labels (clean): cities (small dot + name) + countries (uppercase), like the
  // Protomaps world presentation. Inserted just before the region place labels.
  const worldLabels = [
    {
      id: 'world-place-city-dot',
      type: 'circle',
      source: 'world',
      'source-layer': 'place',
      minzoom: 3,
      maxzoom: 9,
      filter: ['in', ['get', 'class'], ['literal', ['city', 'town']]],
      paint: { 'circle-radius': 1.6, 'circle-color': '#7a7266', 'circle-opacity': 0.7 },
    },
    {
      id: 'world-place-city',
      type: 'symbol',
      source: 'world',
      'source-layer': 'place',
      minzoom: 3,
      maxzoom: 9,
      filter: ['in', ['get', 'class'], ['literal', ['city', 'town']]],
      layout: {
        'text-field': nameField,
        'text-font': ['Noto Sans Medium'],
        'text-max-width': 7,
        'text-size': ['interpolate', ['linear'], ['zoom'], 3, 10, 7, 13],
        'text-offset': [0, 0.6],
        'text-anchor': 'top',
      },
      paint: { 'text-color': '#5a5348', 'text-halo-color': P.background, 'text-halo-width': 1.3 },
    },
    {
      id: 'world-place-country',
      type: 'symbol',
      source: 'world',
      'source-layer': 'place',
      maxzoom: 8,
      filter: ['==', ['get', 'class'], 'country'],
      layout: {
        'text-field': nameField,
        'text-font': ['Noto Sans Medium'],
        'text-max-width': 7,
        'text-transform': 'uppercase',
        'text-letter-spacing': 0.08,
        'text-size': ['interpolate', ['linear'], ['zoom'], 2, 11, 5, 14],
      },
      paint: { 'text-color': '#8a8276', 'text-halo-color': P.background, 'text-halo-width': 1.4 },
    },
  ];
  const firstPlace = s.layers.findIndex(l => l.id.startsWith('place-'));
  s.layers.splice(firstPlace < 0 ? s.layers.length : firstPlace, 0, ...worldLabels);

  // SPATIAL settlement-label split (neighbour context vs Vietnam). The Viettrace boundary overlay
  // owns Vietnam's admin labels (province → district → ward); the basemap's own VN settlement labels
  // would duplicate and out-collide them (world-omt alone carries ~1,188 cities, so "Nam Định" would
  // beat the overlay "Tỉnh Nam Định"). But the basemap has NO per-feature country code, so we filter
  // by GEOMETRY: each settlement layer is shown only for features OUTSIDE Vietnam (neighbour
  // cities/towns/provinces — the surrounding context the user wants), and hidden inside Vietnam.
  // `within` does point-in-polygon on the sparse `place` layer → cheap. Baked into the style (not a
  // runtime setLayoutProperty) so it can't be defeated by load timing. KEPT fully visible for both
  // VN + neighbours: country/continent labels, the national-capital label (place-city-capital →
  // Hà Nội + Viêng Chăn/Băng Cốc/…), and place-other (island/locality — keeps Hoàng Sa/Trường Sa).
  // The planned "toggle OSM boundaries" feature drops the OUTSIDE_VN clause when the overlay is OFF.
  const OUTSIDE_VN = ['!', ['within', VN_OUTLINE]];
  const settlementClass = {
    'place-city': ['all', ['==', ['get', 'class'], 'city'], ['!=', ['get', 'capital'], 2]],
    'place-town': ['==', ['get', 'class'], 'town'],
    'place-village': ['==', ['get', 'class'], 'village'],
    'place-state': ['==', ['get', 'class'], 'state'],
    'world-place-city': ['in', ['get', 'class'], ['literal', ['city', 'town']]],
    'world-place-city-dot': ['in', ['get', 'class'], ['literal', ['city', 'town']]],
  };
  for (const [id, cls] of Object.entries(settlementClass)) {
    const l = s.layers.find(x => x.id === id);
    if (!l) continue;
    l.filter = ['all', cls, OUTSIDE_VN];
    if (l.layout) delete l.layout.visibility; // ensure visible (overrides any earlier 'none')
  }
  // The commune/ward tier (phường + small subdivisions) stays fully hidden: VN wards come from the
  // overlay, and neighbour subdivisions (Chinese neighbourhood names etc.) are clutter, not context.
  const placeCommuneLayer = s.layers.find(x => x.id === 'place-commune');
  if (placeCommuneLayer) {
    placeCommuneLayer.layout = placeCommuneLayer.layout || {};
    placeCommuneLayer.layout.visibility = 'none';
  }

  return s;
}

console.log(`[generate-omt-basemap-style] mode=${LOCAL ? 'LOCAL' : 'production'}`);
console.log(`  region:  ${REGION_PMTILES}`);
console.log(`  glyphs:  ${GLYPHS}`);
console.log(`  sprite:  ${SPRITE}`);
for (const lang of ['vi', 'en']) {
  const out = lang === 'vi' ? 'omt-basemap-style.json' : 'omt-basemap-style-en.json';
  const path = new URL(`../public/${out}`, import.meta.url);
  fs.writeFileSync(path, JSON.stringify(buildStyle(lang), null, 2));
  console.log('wrote', out, '-', JSON.parse(fs.readFileSync(path)).layers.length, 'layers');
}
