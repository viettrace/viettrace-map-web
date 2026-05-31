import { describe, expect, it } from 'vitest';
import { initialMapViewState } from './mapViewReducer';
import { parseMapMode, readMapUrlState, writeMapUrlState } from './urlState';
import { COMPARE_DIVIDER_MAX } from './mapViewTypes';

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
      compareMode: null,
      compareDividerX: null,
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
      compareMode: null,
      compareDividerX: null,
    });
  });

  it('rejects unknown nested types', () => {
    expect(readMapUrlState(new URLSearchParams('nestedType=street')).nestedType).toBeNull();
  });

  it('reads compare mode and divider position', () => {
    expect(readMapUrlState(new URLSearchParams('compare=swipe&divider=0.4'))).toEqual({
      mode: null,
      provinceSlug: null,
      nestedSlug: null,
      nestedType: null,
      compareMode: 'swipe',
      compareDividerX: 0.4,
    });
  });

  it('clamps divider values that are out of range', () => {
    expect(readMapUrlState(new URLSearchParams('divider=2')).compareDividerX).toBe(
      COMPARE_DIVIDER_MAX,
    );
    expect(readMapUrlState(new URLSearchParams('divider=oops')).compareDividerX).toBeNull();
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

  it('writes compare=swipe and a non-default divider position', () => {
    const searchParams = writeMapUrlState(new URLSearchParams(), {
      ...initialMapViewState,
      compareMode: 'swipe',
      compareDividerX: 0.4,
    });

    const text = searchParams.toString();
    expect(text).toContain('compare=swipe');
    expect(text).toContain('divider=0.40');
  });

  it('omits divider when divider position is the default', () => {
    const searchParams = writeMapUrlState(new URLSearchParams('divider=0.4'), {
      ...initialMapViewState,
      compareMode: 'swipe',
    });

    expect(searchParams.has('compare')).toBe(true);
    expect(searchParams.has('divider')).toBe(false);
  });

  it('clears compare and divider params when leaving swipe mode', () => {
    const searchParams = writeMapUrlState(
      new URLSearchParams('compare=swipe&divider=0.4'),
      initialMapViewState,
    );

    expect(searchParams.has('compare')).toBe(false);
    expect(searchParams.has('divider')).toBe(false);
  });
});
