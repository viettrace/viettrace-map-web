import { describe, expect, it } from 'vitest';
import { normalizeAdministrativeName, normalizeSearchText } from './normalize';
import { createSlug } from './slug';

describe('normalizeSearchText', () => {
  it('normalizes Vietnamese accents and spacing', () => {
    expect(normalizeSearchText('  Thành phố   Hồ Chí Minh  ')).toBe('thanh pho ho chi minh');
  });
});

describe('normalizeAdministrativeName', () => {
  it('removes common administrative prefixes', () => {
    expect(normalizeAdministrativeName('Tỉnh Bà Rịa - Vũng Tàu')).toBe('ba ria vung tau');
    expect(normalizeAdministrativeName('TP Hồ Chí Minh')).toBe('ho chi minh');
  });
});

describe('createSlug', () => {
  it('creates stable ASCII slugs for URL state', () => {
    expect(createSlug('Tỉnh Bà Rịa - Vũng Tàu')).toBe('ba-ria-vung-tau');
    expect(createSlug('Thành phố Hồ Chí Minh')).toBe('ho-chi-minh');
  });
});
