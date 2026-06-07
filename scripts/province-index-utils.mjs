import { readFileSync, writeFileSync } from 'node:fs';

const ADMIN_PREFIX_PATTERN = /^(tinh|thanh pho|tp)\s+/;
const CITY_PREFIX_PATTERN = /^thanh pho\s+/;

export function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function writeJson(path, data) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

export function normalizeSearchText(value) {
  return latinizeVietnamese(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function latinizeVietnamese(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export function formatEnglishProvinceName(vietnameseName, englishName) {
  const displayName = latinizeVietnamese(englishName).trim();

  if (
    CITY_PREFIX_PATTERN.test(normalizeSearchText(vietnameseName)) &&
    !/\bcity$/i.test(displayName)
  ) {
    return `${displayName} City`;
  }

  return displayName;
}

export function normalizeAdministrativeName(value) {
  return normalizeSearchText(value).replace(ADMIN_PREFIX_PATTERN, '').trim();
}

export function createSlug(value) {
  return normalizeAdministrativeName(value).replace(/\s+/g, '-');
}

export function compareAdministrativeName(a, b) {
  return normalizeAdministrativeName(a).localeCompare(normalizeAdministrativeName(b), 'en');
}

export function computeBbox(geometry) {
  const bbox = [Infinity, Infinity, -Infinity, -Infinity];

  visitGeometryPositions(geometry, ([lng, lat]) => {
    bbox[0] = Math.min(bbox[0], lng);
    bbox[1] = Math.min(bbox[1], lat);
    bbox[2] = Math.max(bbox[2], lng);
    bbox[3] = Math.max(bbox[3], lat);
  });

  if (bbox.some(value => !Number.isFinite(value))) {
    throw new Error('Unable to compute bbox for geometry without coordinates.');
  }

  return bbox;
}

export function computeDisplayCenter(properties, bbox) {
  const referencePoints = [
    [properties?.label_node_lng, properties?.label_node_lat],
    [properties?.admin_centre_node_lng, properties?.admin_centre_node_lat],
  ];

  for (const [lngValue, latValue] of referencePoints) {
    const lng = toFiniteNumber(lngValue);
    const lat = toFiniteNumber(latValue);

    if (lng !== null && lat !== null && isPointInsideBbox([lng, lat], bbox)) {
      return [roundCoordinate(lng), roundCoordinate(lat)];
    }
  }

  return [roundCoordinate((bbox[0] + bbox[2]) / 2), roundCoordinate((bbox[1] + bbox[3]) / 2)];
}

export function roundBbox(bbox) {
  return bbox.map(roundCoordinate);
}

function visitGeometryPositions(geometry, visitor) {
  if (!geometry) {
    return;
  }

  if (geometry.type === 'GeometryCollection') {
    for (const childGeometry of geometry.geometries || []) {
      visitGeometryPositions(childGeometry, visitor);
    }

    return;
  }

  visitCoordinates(geometry.coordinates, visitor);
}

function visitCoordinates(coordinates, visitor) {
  if (!Array.isArray(coordinates)) {
    return;
  }

  if (typeof coordinates[0] === 'number' && typeof coordinates[1] === 'number') {
    visitor([coordinates[0], coordinates[1]]);
    return;
  }

  for (const childCoordinates of coordinates) {
    visitCoordinates(childCoordinates, visitor);
  }
}

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function isPointInsideBbox([lng, lat], bbox) {
  return lng >= bbox[0] && lng <= bbox[2] && lat >= bbox[1] && lat <= bbox[3];
}

function roundCoordinate(value) {
  return Number(value.toFixed(6));
}

// ---------------------------------------------------------------------------
// Visual center: pole of inaccessibility (best interior label point).
// For MultiPolygon, operates on the largest sub-polygon by area.
// Falls back to bbox center if geometry is empty or unsupported.
// ---------------------------------------------------------------------------

export function computeVisualCenter(geometry, bbox) {
  let polygon = null;

  if (geometry?.type === 'Polygon') {
    polygon = geometry.coordinates;
  } else if (geometry?.type === 'MultiPolygon') {
    polygon = geometry.coordinates.reduce((best, coords) => {
      const area = Math.abs(ringSignedArea(coords[0]));
      return area > (best ? Math.abs(ringSignedArea(best[0])) : 0) ? coords : best;
    }, null);
  }

  if (polygon) {
    try {
      const point = polylabelCenter(polygon, 0.001);
      return [roundCoordinate(point[0]), roundCoordinate(point[1])];
    } catch {
      // Fall through to bbox fallback
    }
  }

  if (bbox) {
    return [roundCoordinate((bbox[0] + bbox[2]) / 2), roundCoordinate((bbox[1] + bbox[3]) / 2)];
  }

  return null;
}

function polylabelCenter(polygon, precision) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const [x, y] of polygon[0]) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }

  const width = maxX - minX;
  const height = maxY - minY;
  const cellSize = Math.min(width, height);

  if (cellSize === 0) return [minX, minY];

  const queue = [];
  const half = cellSize / 2;
  for (let x = minX; x < maxX; x += cellSize) {
    for (let y = minY; y < maxY; y += cellSize) {
      queue.push(makeCell(x + half, y + half, half, polygon));
    }
  }

  let best = getCentroidCell(polygon);
  const bboxCell = makeCell(minX + width / 2, minY + height / 2, 0, polygon);
  if (bboxCell.d > best.d) best = bboxCell;

  while (queue.length > 0) {
    queue.sort((a, b) => b.max - a.max);
    const cell = queue.shift();
    if (cell.d > best.d) best = cell;
    if (cell.max - best.d <= precision) continue;
    const h = cell.h / 2;
    queue.push(makeCell(cell.x - h, cell.y - h, h, polygon));
    queue.push(makeCell(cell.x + h, cell.y - h, h, polygon));
    queue.push(makeCell(cell.x - h, cell.y + h, h, polygon));
    queue.push(makeCell(cell.x + h, cell.y + h, h, polygon));
  }

  return [best.x, best.y];
}

function makeCell(x, y, h, polygon) {
  const d = pointToPolygonDist([x, y], polygon);
  return { x, y, h, d, max: d + h * Math.SQRT2 };
}

function getCentroidCell(polygon) {
  let area = 0,
    cx = 0,
    cy = 0;
  const ring = polygon[0];
  for (let i = 0, len = ring.length, j = len - 1; i < len; j = i++) {
    const a = ring[i],
      b = ring[j];
    const f = a[0] * b[1] - b[0] * a[1];
    cx += (a[0] + b[0]) * f;
    cy += (a[1] + b[1]) * f;
    area += f * 3;
  }
  if (area === 0) return makeCell(ring[0][0], ring[0][1], 0, polygon);
  return makeCell(cx / area, cy / area, 0, polygon);
}

function pointToPolygonDist(point, polygon) {
  let inside = false,
    minDistSq = Infinity;
  for (const ring of polygon) {
    for (let i = 0, len = ring.length, j = len - 1; i < len; j = i++) {
      const a = ring[i],
        b = ring[j];
      if (
        a[1] > point[1] !== b[1] > point[1] &&
        point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0]
      ) {
        inside = !inside;
      }
      minDistSq = Math.min(minDistSq, segDistSq(point, a, b));
    }
  }
  return (inside ? 1 : -1) * Math.sqrt(minDistSq);
}

function segDistSq(p, a, b) {
  let x = a[0],
    y = a[1];
  const dx = b[0] - x,
    dy = b[1] - y;
  if (dx !== 0 || dy !== 0) {
    const t = Math.max(0, Math.min(1, ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy)));
    x += dx * t;
    y += dy * t;
  }
  return (p[0] - x) ** 2 + (p[1] - y) ** 2;
}

function ringSignedArea(ring) {
  let area = 0;
  for (let i = 0, len = ring.length, j = len - 1; i < len; j = i++) {
    area += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]);
  }
  return area;
}
