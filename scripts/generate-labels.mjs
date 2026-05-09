import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pointOnFeature from '@turf/point-on-feature';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspaceRoot = path.resolve(repoRoot, '..');
const dataRoot = process.env.VIETTRACE_DATA_DIR
  ? path.resolve(process.env.VIETTRACE_DATA_DIR)
  : path.join(workspaceRoot, 'viettrace-data');
const publicDataRoot = path.join(repoRoot, 'public', 'data');

function resolveInputPath(relativePath) {
  return path.join(dataRoot, relativePath);
}

function resolveOutputPath(fileName) {
  return path.join(publicDataRoot, fileName);
}

function generateLabels(inputPath, outputPath, options = {}) {
  const data = JSON.parse(readFileSync(inputPath, 'utf8'));

  const features = data.features.filter(feature => {
    if (!options.boundary) {
      return true;
    }

    return feature.properties?.boundary === options.boundary;
  });

  const points = features.map(feature => {
    const point = getProvinceLabelPoint(feature);

    return {
      type: 'Feature',
      geometry: point.geometry,
      properties: {
        name: feature.properties.name,
        name_en: feature.properties.name_en,
      },
    };
  });

  const output = { type: 'FeatureCollection', features: points };
  writeFileSync(outputPath, JSON.stringify(output));
  console.log(`Wrote ${points.length}/${data.features.length} labels -> ${outputPath}`);
}

function getProvinceLabelPoint(feature) {
  const labelPolygon = getLabelPolygon(feature);

  if (labelPolygon) {
    const coordinates = polylabel(labelPolygon, 0.01);
    return {
      type: 'Feature',
      geometry: {
        coordinates,
        type: 'Point',
      },
      properties: {},
    };
  }

  return pointOnFeature(feature);
}

function getLabelPolygon(feature) {
  if (feature.geometry.type === 'Polygon') {
    return feature.geometry.coordinates;
  }

  if (feature.geometry.type !== 'MultiPolygon') {
    return null;
  }

  const referencePoints = getReferencePoints(feature.properties);

  for (const point of referencePoints) {
    const containingPolygon = feature.geometry.coordinates.find(
      polygon => pointToPolygonDist(point, polygon) >= -1e-9,
    );

    if (containingPolygon) {
      return containingPolygon;
    }
  }

  return feature.geometry.coordinates.reduce((largest, polygon) => {
    if (!largest) {
      return polygon;
    }

    return Math.abs(ringArea(polygon[0])) > Math.abs(ringArea(largest[0])) ? polygon : largest;
  }, null);
}

function getReferencePoints(properties) {
  return [
    [properties?.label_node_lng, properties?.label_node_lat],
    [properties?.admin_centre_node_lng, properties?.admin_centre_node_lat],
  ].reduce((points, [lng, lat]) => {
    const numberLng = toNumberOrNull(lng);
    const numberLat = toNumberOrNull(lat);

    if (numberLng !== null && numberLat !== null) {
      points.push([numberLng, numberLat]);
    }

    return points;
  }, []);
}

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function polylabel(polygon, precision) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const [x, y] of polygon[0]) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  const width = maxX - minX;
  const height = maxY - minY;
  const cellSize = Math.min(width, height);

  if (cellSize === 0) {
    return [minX, minY];
  }

  const cellQueue = [];
  const half = cellSize / 2;

  for (let x = minX; x < maxX; x += cellSize) {
    for (let y = minY; y < maxY; y += cellSize) {
      cellQueue.push(createCell(x + half, y + half, half, polygon));
    }
  }

  let bestCell = getCentroidCell(polygon);
  const bboxCell = createCell(minX + width / 2, minY + height / 2, 0, polygon);

  if (bboxCell.d > bestCell.d) {
    bestCell = bboxCell;
  }

  while (cellQueue.length > 0) {
    cellQueue.sort((a, b) => b.max - a.max);
    const cell = cellQueue.shift();

    if (cell.d > bestCell.d) {
      bestCell = cell;
    }

    if (cell.max - bestCell.d <= precision) {
      continue;
    }

    const nextHalf = cell.h / 2;
    cellQueue.push(createCell(cell.x - nextHalf, cell.y - nextHalf, nextHalf, polygon));
    cellQueue.push(createCell(cell.x + nextHalf, cell.y - nextHalf, nextHalf, polygon));
    cellQueue.push(createCell(cell.x - nextHalf, cell.y + nextHalf, nextHalf, polygon));
    cellQueue.push(createCell(cell.x + nextHalf, cell.y + nextHalf, nextHalf, polygon));
  }

  return [bestCell.x, bestCell.y];
}

function createCell(x, y, h, polygon) {
  const d = pointToPolygonDist([x, y], polygon);

  return {
    d,
    h,
    max: d + h * Math.SQRT2,
    x,
    y,
  };
}

function getCentroidCell(polygon) {
  let area = 0;
  let x = 0;
  let y = 0;
  const ring = polygon[0];

  for (let i = 0, len = ring.length, j = len - 1; i < len; j = i++) {
    const a = ring[i];
    const b = ring[j];
    const f = a[0] * b[1] - b[0] * a[1];
    x += (a[0] + b[0]) * f;
    y += (a[1] + b[1]) * f;
    area += f * 3;
  }

  if (area === 0) {
    return createCell(ring[0][0], ring[0][1], 0, polygon);
  }

  return createCell(x / area, y / area, 0, polygon);
}

function pointToPolygonDist(point, polygon) {
  let inside = false;
  let minDistSq = Infinity;

  for (const ring of polygon) {
    for (let i = 0, len = ring.length, j = len - 1; i < len; j = i++) {
      const a = ring[i];
      const b = ring[j];

      if (
        a[1] > point[1] !== b[1] &&
        point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0]
      ) {
        inside = !inside;
      }

      minDistSq = Math.min(minDistSq, getSegDistSq(point, a, b));
    }
  }

  return (inside ? 1 : -1) * Math.sqrt(minDistSq);
}

function getSegDistSq(point, a, b) {
  let x = a[0];
  let y = a[1];
  const dx = b[0] - x;
  const dy = b[1] - y;

  if (dx !== 0 || dy !== 0) {
    const t = Math.max(
      0,
      Math.min(1, ((point[0] - x) * dx + (point[1] - y) * dy) / (dx * dx + dy * dy)),
    );

    x += dx * t;
    y += dy * t;
  }

  const pointDx = point[0] - x;
  const pointDy = point[1] - y;

  return pointDx * pointDx + pointDy * pointDy;
}

function ringArea(ring) {
  let area = 0;

  for (let i = 0, len = ring.length, j = len - 1; i < len; j = i++) {
    area += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]);
  }

  return area;
}

generateLabels(
  resolveInputPath('processed/provinces/vn_pre_2025.geojson'),
  resolveOutputPath('province-labels-pre.json'),
);
generateLabels(
  resolveInputPath('processed/provinces/vn_post_2025.geojson'),
  resolveOutputPath('province-labels-post.json'),
  {
    boundary: 'administrative',
  },
);
