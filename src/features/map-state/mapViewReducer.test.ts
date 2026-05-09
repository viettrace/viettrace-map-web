import { describe, expect, it } from 'vitest';
import { initialMapViewState, mapViewReducer } from './mapViewReducer';

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
        mode: 'pre',
        slug: 'ha-noi',
        type: 'province',
      },
      type: 'selectFeature',
    });

    expect(state.selectedFeature?.slug).toBe('ha-noi');
    expect(state.panels.detail).toBe(true);
  });
});
