export type MapMode = 'pre' | 'post';

export interface SelectedMapFeature {
  type: 'province';
  mode: MapMode;
  slug: string;
}

export interface MapViewState {
  mode: MapMode;
  selectedFeature: SelectedMapFeature | null;
  layers: {
    nestedCandidates: boolean;
    offshoreIslands: boolean;
  };
  panels: {
    dataNotice: boolean;
    detail: boolean;
  };
}

export type MapViewAction =
  | { type: 'setMode'; mode: MapMode }
  | { type: 'setNestedCandidatesVisible'; visible: boolean }
  | { type: 'setOffshoreIslandsVisible'; visible: boolean }
  | { type: 'setDataNoticeOpen'; open: boolean }
  | { type: 'toggleDataNotice' }
  | { type: 'selectFeature'; feature: SelectedMapFeature | null };
