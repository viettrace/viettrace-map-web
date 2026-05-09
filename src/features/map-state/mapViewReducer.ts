import type { MapViewAction, MapViewState } from './mapViewTypes';

export const initialMapViewState: MapViewState = {
  mode: 'pre',
  selectedFeature: null,
  layers: {
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
