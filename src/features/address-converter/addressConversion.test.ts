import { describe, expect, it } from 'vitest';
import {
  buildSelectionQuery,
  formatNewAddress,
  formatOldAddress,
  parseSelection,
  resolveSelection,
  type AddressProvinceFile,
} from './addressConversion';

const file: AddressProvinceFile = {
  schemaVersion: 1,
  mergeDate: '2025-07-01',
  code: '31',
  name: 'Thành phố Hải Phòng',
  name_en: 'Hai Phong City',
  slug: 'hai-phong',
  districts: [
    {
      code: '303',
      name: 'Quận Hồng Bàng',
      type: 'Quận',
      isIsland: false,
      results: [],
      wards: [
        {
          code: '1',
          name: 'Phường A',
          type: 'Phường',
          isDivided: false,
          results: [
            {
              newProvince: 'Thành phố Hải Phòng',
              newProvinceSlug: 'hai-phong',
              newProvinceCode: '31',
              newWard: 'Phường Hồng Bàng',
              newWardShort: 'Hồng Bàng',
              newWardCode: '11500',
              newWardType: 'Phường',
              lat: 20.86,
              lon: 106.68,
              areaKm2: 5.1,
            },
          ],
        },
        {
          code: '2',
          name: 'Phường B',
          type: 'Phường',
          isDivided: true,
          results: [
            {
              newProvince: 'Thành phố Hải Phòng',
              newProvinceSlug: 'hai-phong',
              newProvinceCode: '31',
              newWard: 'Phường X',
              newWardShort: 'X',
              newWardCode: '11501',
              newWardType: 'Phường',
              lat: 20.8,
              lon: 106.6,
              areaKm2: 3,
            },
            {
              newProvince: 'Thành phố Hải Phòng',
              newProvinceSlug: 'hai-phong',
              newProvinceCode: '31',
              newWard: 'Phường Y',
              newWardShort: 'Y',
              newWardCode: '11502',
              newWardType: 'Phường',
              lat: 20.81,
              lon: 106.61,
              areaKm2: 2,
            },
          ],
        },
      ],
    },
    {
      code: '318',
      name: 'Huyện Bạch Long Vĩ',
      type: 'Huyện',
      isIsland: true,
      wards: [],
      results: [
        {
          newProvince: 'Thành phố Hải Phòng',
          newProvinceSlug: 'hai-phong',
          newProvinceCode: '31',
          newWard: 'Đặc khu Bạch Long Vĩ',
          newWardShort: 'Bạch Long Vĩ',
          newWardCode: '11948',
          newWardType: 'Đặc khu',
          lat: 20.13,
          lon: 107.73,
          areaKm2: 3.07,
        },
      ],
    },
  ],
};

describe('resolveSelection', () => {
  it('resolves a normal ward to a single new unit', () => {
    const resolved = resolveSelection(file, '303', '1');
    expect(resolved).not.toBeNull();
    expect(resolved!.isDivided).toBe(false);
    expect(resolved!.results).toHaveLength(1);
    expect(resolved!.results[0]!.newWard).toBe('Phường Hồng Bàng');
  });

  it('resolves a divided ward to multiple candidates', () => {
    const resolved = resolveSelection(file, '303', '2');
    expect(resolved!.isDivided).toBe(true);
    expect(resolved!.results.map(r => r.newWard)).toEqual(['Phường X', 'Phường Y']);
  });

  it('resolves an island district on the district alone (no ward)', () => {
    const resolved = resolveSelection(file, '318', null);
    expect(resolved).not.toBeNull();
    expect(resolved!.ward).toBeNull();
    expect(resolved!.results[0]!.newWard).toBe('Đặc khu Bạch Long Vĩ');
  });

  it('returns null when a normal district has no ward selected', () => {
    expect(resolveSelection(file, '303', null)).toBeNull();
  });

  it('returns null for an unknown district', () => {
    expect(resolveSelection(file, '999', '1')).toBeNull();
  });
});

describe('address formatting', () => {
  it('formats the new address most-specific first', () => {
    const resolved = resolveSelection(file, '303', '1')!;
    expect(formatNewAddress(resolved.results[0]!)).toBe('Phường Hồng Bàng, Thành phố Hải Phòng');
  });

  it('formats the old ward address', () => {
    const resolved = resolveSelection(file, '303', '1')!;
    expect(formatOldAddress(file, resolved.district, resolved.ward)).toBe(
      'Phường A, Quận Hồng Bàng, Thành phố Hải Phòng',
    );
  });

  it('formats the old island-district address without a ward', () => {
    const resolved = resolveSelection(file, '318', null)!;
    expect(formatOldAddress(file, resolved.district, resolved.ward)).toBe(
      'Huyện Bạch Long Vĩ, Thành phố Hải Phòng',
    );
  });
});

describe('URL selection state', () => {
  it('parses selection query keys', () => {
    expect(parseSelection(new URLSearchParams('p=31&d=318'))).toEqual({
      p: '31',
      d: '318',
      w: null,
    });
  });

  it('builds a query round-trip', () => {
    expect(buildSelectionQuery({ p: '31', d: '303', w: '2' })).toBe('?p=31&d=303&w=2');
  });

  it('omits empty parts', () => {
    expect(buildSelectionQuery({ p: '31', d: null, w: null })).toBe('?p=31');
    expect(buildSelectionQuery({ p: null, d: null, w: null })).toBe('');
  });
});
