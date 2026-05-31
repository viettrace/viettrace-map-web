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
      nestedSlug: null,
      nestedType: null,
      provinceSlug: 'ha-giang',
    });
  });

  it('reads nested slug and type when present', () => {
    expect(
      readMapUrlState(new URLSearchParams('mode=pre&nested=ha-noi--hoan-kiem&nestedType=district')),
    ).toEqual({
      mode: 'pre',
      nestedSlug: 'ha-noi--hoan-kiem',
      nestedType: 'district',
      provinceSlug: null,
    });
  });

  it('rejects unknown nested types', () => {
    expect(readMapUrlState(new URLSearchParams('nestedType=street')).nestedType).toBeNull();
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

  it('writes nested selection slug and type', () => {
    const searchParams = writeMapUrlState(new URLSearchParams(), {
      ...initialMapViewState,
      mode: 'pre',
      selectedFeature: {
        featureType: 'district',
        mode: 'pre',
        slug: 'ha-noi--hoan-kiem',
        type: 'nested',
      },
    });

    expect(searchParams.toString()).toBe('mode=pre&nested=ha-noi--hoan-kiem&nestedType=district');
  });

  it('clears nested params when no feature selected', () => {
    const searchParams = writeMapUrlState(
      new URLSearchParams('mode=pre&nested=foo&nestedType=district'),
      initialMapViewState,
    );

    expect(searchParams.has('nested')).toBe(false);
    expect(searchParams.has('nestedType')).toBe(false);
  });
});
