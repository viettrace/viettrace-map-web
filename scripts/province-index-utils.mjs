import { readFileSync, writeFileSync } from 'node:fs';

const ADMIN_PREFIX_PATTERN = /^(tinh|thanh pho|tp)\s+/;

export function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function writeJson(path, data) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

export function normalizeSearchText(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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
