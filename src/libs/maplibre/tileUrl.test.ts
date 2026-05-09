import { describe, expect, it } from 'vitest';
import { buildTileTemplate } from './tileUrl';

describe('buildTileTemplate', () => {
  it('builds a Martin tile template without a cache buster', () => {
    expect(buildTileTemplate('https://tiles.viettrace.org/tiles/vn_provinces_pre_2025')).toBe(
      'https://tiles.viettrace.org/tiles/vn_provinces_pre_2025/{z}/{x}/{y}',
    );
  });

  it('adds a cache buster using the correct separator', () => {
    expect(buildTileTemplate('https://tiles.example.test/source', '20260509-display')).toBe(
      'https://tiles.example.test/source/{z}/{x}/{y}?v=20260509-display',
    );
    expect(buildTileTemplate('https://tiles.example.test/source?foo=bar', 'a b')).toBe(
      'https://tiles.example.test/source/{z}/{x}/{y}?foo=bar&v=a%20b',
    );
  });
});
