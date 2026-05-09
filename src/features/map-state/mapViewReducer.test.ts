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
});
