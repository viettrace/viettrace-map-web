'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import type maplibregl from 'maplibre-gl';
import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  boundarySourceIds,
  boundarySourceLayers,
  getBoundarySourceDefinitions,
} from '@src/features/boundaries/boundaryLayerRegistry';
import { clearHighlight, highlightFeature } from '@src/features/boundaries/featureHighlight';
import { useMapLibre } from '@src/features/map-shell/useMapLibre';
import type { ProvinceIndexEntry } from '@src/features/province-index/provinceIndexTypes';
import { localizeBasemapStyle, readPublicEnv } from '@src/libs/config/publicEnv';
import { ensureSource } from '@src/libs/maplibre/sources';

interface ProvinceMiniMapProps {
  entry: ProvinceIndexEntry;
}

type View = 'locate' | 'explore';

const MM_PROV_OUTLINE = 'mm-province-outline';
const MM_NESTED_FILL = 'mm-nested-fill';
const MM_NESTED_LINE = 'mm-nested-line';
const MM_NESTED_LABEL = 'mm-nested-label';

// Two views: "Vị trí" (locate) marks the province in its regional context; "Quận/huyện" or
// "Phường/xã" (explore) fits the province and draws ONLY its own child units (filtered by
// parent_province_name) with on-map name labels — no province tint/marker, no neighbours.
export default function ProvinceMiniMap({ entry }: ProvinceMiniMapProps) {
  const t = useTranslations('ProvinceProfile');
  const locale = useLocale();
  const [view, setView] = useState<View>('explore');

  const style = localizeBasemapStyle(
    process.env.NEXT_PUBLIC_MAP_STYLE ?? '/omt-basemap-style.json',
    locale,
  );
  const center = useMemo<[number, number]>(() => [entry.center[0], entry.center[1]], [entry]);
  const { containerRef, error, isReady, map } = useMapLibre({ center, style, zoom: 6 });

  const color = entry.mode === 'pre' ? '#dc2626' : '#1d4ed8';
  const provName = entry.name;
  const isPre = entry.mode === 'pre';
  const provSourceId = isPre ? boundarySourceIds.pre : boundarySourceIds.post;
  const provSourceLayer = isPre ? boundarySourceLayers.pre : boundarySourceLayers.post;
  const nestedSourceId = isPre
    ? boundarySourceIds.preDistrictsCandidate
    : boundarySourceIds.postWardsCandidate;
  const nestedSourceLayer = isPre
    ? boundarySourceLayers.preDistrictsCandidate
    : boundarySourceLayers.postWardsCandidate;
  const labelSourceId = isPre
    ? boundarySourceIds.preDistrictsCandidateLabels
    : boundarySourceIds.postWardsCandidateLabels;
  const labelSourceLayer = isPre
    ? boundarySourceLayers.preDistrictsCandidateLabels
    : boundarySourceLayers.postWardsCandidateLabels;

  // One-time setup: the province outline + this-province-only child fill/line/labels (hidden until
  // the explore view turns them on).
  useEffect(() => {
    if (!map || !isReady) return;
    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation();

    try {
      const defs = getBoundarySourceDefinitions(readPublicEnv());
      const addSource = (id: string) => {
        const d = defs.find(x => x.id === id);
        if (d) ensureSource(map, d.id, d.source);
      };
      addSource(provSourceId);
      addSource(nestedSourceId);
      addSource(labelSourceId);

      const parentFilter = [
        '==',
        ['get', 'parent_province_name'],
        provName,
      ] as maplibregl.FilterSpecification;

      if (!map.getLayer(MM_PROV_OUTLINE)) {
        map.addLayer({
          id: MM_PROV_OUTLINE,
          type: 'line',
          source: provSourceId,
          'source-layer': provSourceLayer,
          filter: [
            'all',
            ['==', ['get', 'boundary'], 'administrative'],
            ['==', ['get', 'name'], provName],
          ] as maplibregl.FilterSpecification,
          layout: { visibility: 'none' },
          paint: { 'line-color': color, 'line-opacity': 0.9, 'line-width': 2 },
        });
      }
      if (map.getSource(nestedSourceId)) {
        if (!map.getLayer(MM_NESTED_FILL)) {
          map.addLayer({
            id: MM_NESTED_FILL,
            type: 'fill',
            source: nestedSourceId,
            'source-layer': nestedSourceLayer,
            filter: parentFilter,
            layout: { visibility: 'none' },
            paint: { 'fill-color': color, 'fill-opacity': 0.04 },
          });
        }
        if (!map.getLayer(MM_NESTED_LINE)) {
          map.addLayer({
            id: MM_NESTED_LINE,
            type: 'line',
            source: nestedSourceId,
            'source-layer': nestedSourceLayer,
            filter: parentFilter,
            layout: { visibility: 'none' },
            paint: { 'line-color': color, 'line-opacity': 0.4, 'line-width': 0.7 },
          });
        }
      }
      if (map.getSource(labelSourceId) && !map.getLayer(MM_NESTED_LABEL)) {
        map.addLayer({
          id: MM_NESTED_LABEL,
          type: 'symbol',
          source: labelSourceId,
          'source-layer': labelSourceLayer,
          filter: [
            'all',
            ['has', 'name'],
            ['==', ['get', 'parent_province_name'], provName],
          ] as maplibregl.FilterSpecification,
          layout: {
            visibility: 'none',
            'text-field': ['get', locale === 'en' ? 'name_en' : 'name'],
            'text-font': ['Noto Sans Regular'],
            'text-size': 11,
            'text-allow-overlap': false,
            'text-max-width': 7,
            'text-padding': 3,
          },
          paint: { 'text-color': '#1e293b', 'text-halo-color': '#fff', 'text-halo-width': 1.5 },
        });
      }
    } catch {
      // Non-critical decoration.
    }
  }, [
    map,
    isReady,
    locale,
    color,
    provName,
    provSourceId,
    provSourceLayer,
    nestedSourceId,
    nestedSourceLayer,
    labelSourceId,
    labelSourceLayer,
  ]);

  // View + fit. Explore shows the child layers + a plain province outline (no highlight); locate marks
  // the province with the highlight. maxBounds is derived from the FITTED viewport so it can never
  // force a zoom-in (which was clipping the province).
  useEffect(() => {
    if (!map || !isReady) return;
    const explore = view === 'explore';
    for (const id of [MM_PROV_OUTLINE, MM_NESTED_FILL, MM_NESTED_LINE, MM_NESTED_LABEL]) {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', explore ? 'visible' : 'none');
    }
    try {
      if (explore) {
        clearHighlight(map);
      } else {
        highlightFeature({
          map,
          center: [entry.center[0], entry.center[1]],
          label: locale === 'en' ? entry.name_en : entry.name,
          color,
          mode: entry.mode,
          featureName: entry.name,
          featureType: 'province',
        });
      }
    } catch {
      // ignore
    }

    const [w, s, e, n] = entry.bbox;
    const applyFit = () => {
      map.resize();
      map.setMaxBounds(null);
      if (explore) {
        const cam = map.cameraForBounds(
          [
            [w, s],
            [e, n],
          ],
          { padding: 28, maxZoom: 10.5 },
        );
        if (!cam) return;
        const z = (cam.zoom ?? map.getZoom()) - 0.4;
        map.jumpTo({ center: cam.center, zoom: z });
        map.setMinZoom(z);
        map.setMaxZoom(Math.min(14, z + 4));
        // Bound panning to the fitted viewport (+25%). Because this contains the current view, it
        // never triggers a corrective zoom-in — so the province stays fully visible.
        const b = map.getBounds();
        const sw = b.getSouthWest();
        const ne = b.getNorthEast();
        const dx = (ne.lng - sw.lng) * 0.25;
        const dy = (ne.lat - sw.lat) * 0.25;
        map.setMaxBounds([
          [sw.lng - dx, sw.lat - dy],
          [ne.lng + dx, ne.lat + dy],
        ]);
      } else {
        map.setMinZoom(0);
        map.setMaxZoom(14);
        const ex = e - w;
        const ey = n - s;
        const cam = map.cameraForBounds(
          [
            [w - ex * 0.8, s - ey * 0.8],
            [e + ex * 0.8, n + ey * 0.8],
          ],
          { padding: 12, maxZoom: 9 },
        );
        if (cam) map.jumpTo({ center: cam.center, zoom: (cam.zoom ?? 7) - 0.3 });
      }
    };

    applyFit();
    const container = containerRef.current;
    const ro = new ResizeObserver(() => applyFit());
    if (container) ro.observe(container);
    return () => ro.disconnect();
  }, [map, isReady, view, entry, locale, color, containerRef]);

  if (error) return null;

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="h-56 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 md:h-72"
      />
      <div className="absolute top-2 left-2 z-10 inline-flex rounded-md border border-slate-200 bg-white/95 p-0.5 text-xs shadow-sm backdrop-blur-sm">
        {(['locate', 'explore'] as const).map(v => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            aria-pressed={view === v}
            className={
              view === v
                ? 'rounded bg-blue-600 px-2.5 py-1 font-medium text-white'
                : 'rounded px-2.5 py-1 font-medium text-slate-600 hover:text-slate-900'
            }
          >
            {v === 'locate' ? t('mapViewLocate') : isPre ? t('mapViewDistricts') : t('mapViewWards')}
          </button>
        ))}
      </div>
    </div>
  );
}
