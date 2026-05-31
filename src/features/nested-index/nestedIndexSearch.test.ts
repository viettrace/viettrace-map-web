import { describe, expect, it } from 'vitest';
import { findNestedByMapFeature, findNestedBySlug, searchNestedIndex } from './nestedIndexSearch';
import type { NestedIndexEntry } from './nestedIndexTypes';

const ENTRIES: NestedIndexEntry[] = [
  {
    bbox: [105.84, 21.02, 105.86, 21.04],
    center: [105.85, 21.03],
    id: 'pre:district:ha-noi--hoan-kiem',
    mode: 'pre',
    name: 'Quận Hoàn Kiếm',
    name_en: 'Hoan Kiem District',
    parentProvinceName: 'Thành phố Hà Nội',
    parentProvinceSlug: 'ha-noi',
    slug: 'ha-noi--hoan-kiem',
    type: 'district',
  },
  {
    bbox: [105.79, 21.02, 105.81, 21.04],
    center: [105.8, 21.03],
    id: 'pre:district:ha-noi--cau-giay',
    mode: 'pre',
    name: 'Quận Cầu Giấy',
    name_en: 'Cau Giay District',
    parentProvinceName: 'Thành phố Hà Nội',
    parentProvinceSlug: 'ha-noi',
    slug: 'ha-noi--cau-giay',
    type: 'district',
  },
  {
    bbox: [106.6, 10.7, 106.8, 10.85],
    center: [106.7, 10.78],
    id: 'post:ward:ho-chi-minh--ben-nghe',
    mode: 'post',
    name: 'Phường Bến Nghé',
    name_en: 'Ben Nghe Ward',
    parentProvinceName: 'Thành phố Hồ Chí Minh',
    parentProvinceSlug: 'ho-chi-minh',
    slug: 'ho-chi-minh--ben-nghe',
    type: 'ward',
  },
];

describe('searchNestedIndex', () => {
  it('returns empty for empty query', () => {
    expect(searchNestedIndex(ENTRIES, '')).toEqual([]);
  });

  it('matches accent-insensitive Vietnamese name', () => {
    const results = searchNestedIndex(ENTRIES, 'hoan kiem');
    expect(results.map(entry => entry.slug)).toEqual(['ha-noi--hoan-kiem']);
  });

  it('matches English name when locale is en', () => {
    const results = searchNestedIndex(ENTRIES, 'cau giay', { locale: 'en' });
    expect(results.map(entry => entry.slug)).toEqual(['ha-noi--cau-giay']);
  });

  it('filters by mode', () => {
    const results = searchNestedIndex(ENTRIES, 'phuong', { mode: 'pre' });
    expect(results).toEqual([]);
  });
});

describe('findNestedBySlug', () => {
  it('returns the matching entry', () => {
    const entry = findNestedBySlug(ENTRIES, 'pre', 'district', 'ha-noi--hoan-kiem');
    expect(entry?.id).toBe('pre:district:ha-noi--hoan-kiem');
  });

  it('returns null when type does not match', () => {
    expect(findNestedBySlug(ENTRIES, 'pre', 'ward', 'ha-noi--hoan-kiem')).toBeNull();
  });
});

describe('findNestedByMapFeature', () => {
  it('matches by name and parent', () => {
    const entry = findNestedByMapFeature(ENTRIES, 'pre', 'district', {
      name: 'Quận Hoàn Kiếm',
      parent_province_name: 'Thành phố Hà Nội',
    });
    expect(entry?.slug).toBe('ha-noi--hoan-kiem');
  });

  it('falls back to first match when parent is missing', () => {
    const entry = findNestedByMapFeature(ENTRIES, 'pre', 'district', {
      name: 'Quận Hoàn Kiếm',
    });
    expect(entry?.slug).toBe('ha-noi--hoan-kiem');
  });

  it('returns null when name does not match', () => {
    expect(
      findNestedByMapFeature(ENTRIES, 'pre', 'district', { name: 'Unknown District' }),
    ).toBeNull();
  });
});
