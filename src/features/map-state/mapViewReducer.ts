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
  colorMode: 'default',
  colorModeBeforeCompare: null,
  compareDividerX: COMPARE_DIVIDER_DEFAULT,
  selectedFeature: null,
  layers: {
    // Nested boundaries (districts/wards) are visible by default in production.
    // Layer-level minzoom keeps them hidden at low zoom levels automatically.
    nestedCandidates: true,
    offshoreIslands: true,
    boundaries: true,
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
    case 'setColorMode':
      return { ...state, colorMode: action.colorMode };
    case 'setCompareMode': {
      // Switching to swipe mode keeps the current single-map mode as the user's
      // last toggle choice, so flipping back to toggle restores it.
      // Selection is cleared when leaving toggle mode because the detail panel
      // is intentionally suppressed in swipe mode and a stale selection would
      // re-open it on return.
      // Region colors are forced to default in swipe mode (region fill colors
      // don't distinguish the two maps visually) and restored on exit.
      const enteringSwipe = action.compareMode === 'swipe';
      return {
        ...state,
        compareMode: action.compareMode,
        colorMode: enteringSwipe ? 'default' : (state.colorModeBeforeCompare ?? state.colorMode),
        colorModeBeforeCompare: enteringSwipe ? state.colorMode : null,
        selectedFeature: enteringSwipe ? null : state.selectedFeature,
        panels: {
          ...state.panels,
          detail: enteringSwipe ? false : state.panels.detail,
        },
      };
    }
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
    case 'setBoundariesVisible':
      return {
        ...state,
        layers: {
          ...state.layers,
          boundaries: action.visible,
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
