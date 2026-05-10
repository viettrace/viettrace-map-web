import { describe, expect, it } from 'vitest';
import type { ProvinceIndexEntry } from './provinceIndexTypes';
import {
  findProvinceByMapFeature,
  findProvinceBySelection,
  searchProvinceIndex,
} from './provinceIndexSearch';

const entries: ProvinceIndexEntry[] = [
  {
    bbox: [104.6, 22.1, 105.5, 23.3],
    center: [104.9, 22.8],
    id: 'pre:ha-giang',
    merger: {
      mergeDate: '2025-07-01',
      newProvince: 'Tỉnh Tuyên Quang',
    },
    mode: 'pre',
    name: 'Tỉnh Hà Giang',
    name_en: 'Ha Giang Province',
    slug: 'ha-giang',
  },
  {
    bbox: [105.3, 21.2, 106.1, 22.7],
    center: [105.8, 21.8],
    id: 'post:tuyen-quang',
    merger: {
      mergeDate: '2025-07-01',
      oldProvinces: ['Tỉnh Hà Giang'],
    },
    mode: 'post',
    name: 'Tỉnh Tuyên Quang',
    name_en: 'Tuyen Quang Province',
    slug: 'tuyen-quang',
  },
  {
    bbox: [106.3, 10.3, 107.1, 11.1],
    center: [106.7, 10.7],
    id: 'post:ho-chi-minh',
    mode: 'post',
    name: 'Thành phố Hồ Chí Minh',
    name_en: 'Ho Chi Minh City',
    slug: 'ho-chi-minh',
  },
];

describe('searchProvinceIndex', () => {
  it('matches Vietnamese names without accents or administrative prefixes', () => {
    expect(searchProvinceIndex(entries, 'ha giang').map(entry => entry.id)).toEqual([
      'pre:ha-giang',
    ]);
    expect(searchProvinceIndex(entries, 'Tỉnh Hà Giang').map(entry => entry.id)).toEqual([
      'pre:ha-giang',
    ]);
  });

  it('matches English names and city abbreviations through normalized text', () => {
    expect(
      searchProvinceIndex(entries, 'ho chi minh', { locale: 'en' }).map(entry => entry.id),
    ).toEqual(['post:ho-chi-minh']);
  });

  it('keeps Vietnamese aliases available in English search as a fallback', () => {
    expect(
      searchProvinceIndex(entries, 'thanh pho', { locale: 'en' }).map(entry => entry.id),
    ).toEqual(['post:ho-chi-minh']);
  });
});

describe('province index lookup helpers', () => {
  it('finds an entry from selected map state', () => {
    expect(
      findProvinceBySelection(entries, { mode: 'post', slug: 'tuyen-quang', type: 'province' })?.id,
    ).toBe('post:tuyen-quang');
  });

  it('finds an entry from MapLibre feature properties', () => {
    expect(
      findProvinceByMapFeature(entries, 'post', {
        name: 'Thành phố Hồ Chí Minh',
      })?.id,
    ).toBe('post:ho-chi-minh');
  });
});
