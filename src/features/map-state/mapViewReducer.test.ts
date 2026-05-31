import { describe, expect, it } from 'vitest';
import { initialMapViewState, mapViewReducer } from './mapViewReducer';
import { COMPARE_DIVIDER_DEFAULT, COMPARE_DIVIDER_MAX, COMPARE_DIVIDER_MIN } from './mapViewTypes';

describe('mapViewReducer', () => {
  it('switches comparison mode', () => {
    expect(mapViewReducer(initialMapViewState, { mode: 'post', type: 'setMode' }).mode).toBe(
      'post',
    );
  });

  it('toggles the data notice panel', () => {
    expect(
      mapViewReducer(initialMapViewState, { type: 'toggleDataNotice' }).panels.dataNotice,
    ).toBe(false);
  });

  it('opens the detail panel when a feature is selected', () => {
    const state = mapViewReducer(initialMapViewState, {
      feature: {
        mode: 'post',
        slug: 'ha-noi',
        type: 'province',
      },
      type: 'selectFeature',
    });

    expect(state.selectedFeature?.slug).toBe('ha-noi');
    expect(state.mode).toBe('post');
    expect(state.panels.detail).toBe(true);
  });

  it('clears selected detail when switching away from the selected mode', () => {
    const selectedState = mapViewReducer(initialMapViewState, {
      feature: {
        mode: 'pre',
        slug: 'ha-giang',
        type: 'province',
      },
      type: 'selectFeature',
    });
    const nextState = mapViewReducer(selectedState, { mode: 'post', type: 'setMode' });

    expect(nextState.selectedFeature).toBeNull();
    expect(nextState.panels.detail).toBe(false);
  });

  it('switches compare mode and clears selection when entering swipe', () => {
    const selected = mapViewReducer(initialMapViewState, {
      feature: { mode: 'pre', slug: 'ha-giang', type: 'province' },
      type: 'selectFeature',
    });
    const swipe = mapViewReducer(selected, { compareMode: 'swipe', type: 'setCompareMode' });

    expect(swipe.compareMode).toBe('swipe');
    expect(swipe.selectedFeature).toBeNull();
    expect(swipe.panels.detail).toBe(false);

    const back = mapViewReducer(swipe, { compareMode: 'toggle', type: 'setCompareMode' });

    expect(back.compareMode).toBe('toggle');
  });

  it('clamps compare divider position between min and max bounds', () => {
    const tooSmall = mapViewReducer(initialMapViewState, {
      dividerX: -1,
      type: 'setCompareDividerX',
    });
    const tooLarge = mapViewReducer(initialMapViewState, {
      dividerX: 5,
      type: 'setCompareDividerX',
    });
    const valid = mapViewReducer(initialMapViewState, {
      dividerX: 0.42,
      type: 'setCompareDividerX',
    });

    expect(tooSmall.compareDividerX).toBe(COMPARE_DIVIDER_MIN);
    expect(tooLarge.compareDividerX).toBe(COMPARE_DIVIDER_MAX);
    expect(valid.compareDividerX).toBe(0.42);
    expect(initialMapViewState.compareDividerX).toBe(COMPARE_DIVIDER_DEFAULT);
  });
});
