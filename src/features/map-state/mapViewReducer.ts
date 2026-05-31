import {
  clampCompareDivider,
  COMPARE_DIVIDER_DEFAULT,
  COMPARE_MODE_DEFAULT,
  type MapViewAction,
  type MapViewState,
} from './mapViewTypes';

export const initialMapViewState: MapViewState = {
  mode: 'pre',
  compareMode: COMPARE_MODE_DEFAULT,
  compareDividerX: COMPARE_DIVIDER_DEFAULT,
  selectedFeature: null,
  layers: {
    // Nested boundaries (districts/wards) are visible by default in production.
    // Layer-level minzoom keeps them hidden at low zoom levels automatically.
    nestedCandidates: true,
    offshoreIslands: true,
  },
  panels: {
    dataNotice: true,
    detail: false,
  },
};

export function mapViewReducer(state: MapViewState, action: MapViewAction): MapViewState {
  switch (action.type) {
    case 'setMode':
      return {
        ...state,
        mode: action.mode,
        selectedFeature: state.selectedFeature?.mode === action.mode ? state.selectedFeature : null,
        panels: {
          ...state.panels,
          detail: state.selectedFeature?.mode === action.mode ? state.panels.detail : false,
        },
      };
    case 'setCompareMode':
      // Switching to swipe mode keeps the current single-map mode as the user's
      // last toggle choice, so flipping back to toggle restores it.
      // Selection is cleared when leaving toggle mode because the detail panel
      // is intentionally suppressed in swipe mode and a stale selection would
      // re-open it on return.
      return {
        ...state,
        compareMode: action.compareMode,
        selectedFeature: action.compareMode === 'toggle' ? state.selectedFeature : null,
        panels: {
          ...state.panels,
          detail: action.compareMode === 'toggle' ? state.panels.detail : false,
        },
      };
    case 'setCompareDividerX':
      return {
        ...state,
        compareDividerX: clampCompareDivider(action.dividerX),
      };
    case 'setNestedCandidatesVisible':
      return {
        ...state,
        layers: {
          ...state.layers,
          nestedCandidates: action.visible,
        },
      };
    case 'setOffshoreIslandsVisible':
      return {
        ...state,
        layers: {
          ...state.layers,
          offshoreIslands: action.visible,
        },
      };
    case 'setDataNoticeOpen':
      return {
        ...state,
        panels: {
          ...state.panels,
          dataNotice: action.open,
        },
      };
    case 'toggleDataNotice':
      return {
        ...state,
        panels: {
          ...state.panels,
          dataNotice: !state.panels.dataNotice,
        },
      };
    case 'selectFeature':
      return {
        ...state,
        mode: action.feature?.mode ?? state.mode,
        selectedFeature: action.feature,
        panels: {
          ...state.panels,
          detail: action.feature !== null,
        },
      };
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}
