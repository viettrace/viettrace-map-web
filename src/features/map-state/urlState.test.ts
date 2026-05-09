import { describe, expect, it } from 'vitest';
import { initialMapViewState } from './mapViewReducer';
import { parseMapMode, readMapUrlState, writeMapUrlState } from './urlState';

describe('parseMapMode', () => {
  it('accepts only stable map mode values', () => {
    expect(parseMapMode('pre')).toBe('pre');
    expect(parseMapMode('post')).toBe('post');
    expect(parseMapMode('legacy')).toBeNull();
  });
});

describe('readMapUrlState', () => {
  it('reads mode and province slug from URL search params', () => {
    expect(readMapUrlState(new URLSearchParams('mode=pre&province=ha-giang'))).toEqual({
      mode: 'pre',
      provinceSlug: 'ha-giang',
    });
  });
});

describe('writeMapUrlState', () => {
  it('writes mode-only state while preserving unrelated params', () => {
    const searchParams = writeMapUrlState(new URLSearchParams('utm=test'), initialMapViewState);

    expect(searchParams.toString()).toBe('utm=test&mode=pre');
  });

  it('writes selected province state with stable slug', () => {
    const searchParams = writeMapUrlState(new URLSearchParams(), {
      ...initialMapViewState,
      mode: 'post',
      selectedFeature: {
        mode: 'post',
        slug: 'ho-chi-minh',
        type: 'province',
      },
    });

    expect(searchParams.toString()).toBe('mode=post&province=ho-chi-minh');
  });
});
