import { readFileSync } from 'node:fs';

const labelFiles = [
  {
    expectedCount: 63,
    path: 'public/data/province-labels-pre.json',
    requiredPoints: {
      'Thành phố Cần Thơ': [105.58, 10.12],
      'Tỉnh Bà Rịa - Vũng Tàu': [107.3284362, 10.5738801],
      'Tỉnh Bình Thuận': [108.1832931, 11.1041572],
    },
  },
  {
    expectedCount: 34,
    path: 'public/data/province-labels-post.json',
    requiredPoints: {
      'Thành phố Cần Thơ': [105.7916442, 9.7999355],
      'Thành phố Đà Nẵng': [108.1323566, 15.8220848],
      'Thành phố Hồ Chí Minh': [106.7021047, 10.7755254],
      'Tỉnh An Giang': [104.95, 10.35],
      'Tỉnh Lâm Đồng': [108.1335279, 11.6614957],
      'Tỉnh Quảng Trị': [106.6900942, 17.1496898],
    },
  },
];

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function coordinatesEqual(actual, expected) {
  return (
    actual.length === expected.length && actual.every((value, index) => value === expected[index])
  );
}

function assertAsciiText(value, label) {
  assert(/^[\x00-\x7F]+$/.test(value), `${label} must be ASCII-only English text.`);
}

function assertEnglishCitySuffix(feature, labelFilePath) {
  if (feature.properties.name.startsWith('Thành phố')) {
    assert(
      /\bCity$/.test(feature.properties.name_en),
      `${labelFilePath} ${feature.properties.name} name_en must end with City.`,
    );
  }
}

function assertCityFlag(feature, labelFilePath) {
  const expectedIsCity = feature.properties.name.startsWith('Thành phố ');

  assert(
    feature.properties.is_city === expectedIsCity,
    `${labelFilePath} ${feature.properties.name} has an invalid is_city flag.`,
  );
}

for (const labelFile of labelFiles) {
  const data = readJson(labelFile.path);

  assert(Array.isArray(data.features), `${labelFile.path} must be a FeatureCollection.`);
  assert(
    data.features.length === labelFile.expectedCount,
    `${labelFile.path} expected ${labelFile.expectedCount} labels, got ${data.features.length}.`,
  );

  const byName = new Map(data.features.map(feature => [feature.properties?.name, feature]));

  for (const feature of data.features) {
    assert(feature.geometry?.type === 'Point', `${labelFile.path} includes a non-point label.`);
    assert(
      Array.isArray(feature.geometry.coordinates) && feature.geometry.coordinates.length === 2,
      `${labelFile.path} includes an invalid point coordinate.`,
    );
    assert(typeof feature.properties?.name === 'string', `${labelFile.path} label missing name.`);
    assert(
      typeof feature.properties?.name_en === 'string',
      `${labelFile.path} label missing name_en.`,
    );
    assertAsciiText(feature.properties.name_en, `${labelFile.path} ${feature.properties.name_en}`);
    assertEnglishCitySuffix(feature, labelFile.path);
    assertCityFlag(feature, labelFile.path);
  }

  const capitalFeatures = data.features.filter(feature => feature.properties?.is_capital === true);

  assert(
    capitalFeatures.length === 1,
    `${labelFile.path} must include exactly one national capital label.`,
  );
  assert(
    capitalFeatures[0].properties.name === 'Thành phố Hà Nội',
    `${labelFile.path} national capital label must be Ha Noi.`,
  );

  for (const [name, expectedCoordinates] of Object.entries(labelFile.requiredPoints)) {
    const feature = byName.get(name);

    assert(feature, `${labelFile.path} missing required label: ${name}.`);
    assert(
      coordinatesEqual(feature.geometry.coordinates, expectedCoordinates),
      `${labelFile.path} label override mismatch for ${name}.`,
    );
  }
}

console.log('Verified province label counts, localized names, and label placement overrides.');
