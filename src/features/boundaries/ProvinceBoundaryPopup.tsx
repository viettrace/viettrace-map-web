'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { useTranslations } from 'next-intl';
import type { MapMode } from '@src/features/map-state/mapViewTypes';
import { getProvinceHitLayerId } from './boundaryLayerRegistry';

interface ProvinceBoundaryPopupProps {
  map: maplibregl.Map | null;
  mode: MapMode;
}

interface MergerInfo {
  mergeDate: string;
  newProvince: string;
  oldProvince: string;
}

function appendTextRow(container: HTMLElement, label: string, value: string, className: string) {
  const row = document.createElement('div');
  row.className = className;

  const labelNode = document.createTextNode(`${label}: `);
  const valueNode = document.createElement('strong');
  valueNode.textContent = value;

  row.append(labelNode, valueNode);
  container.append(row);
}

function createPopupContent(name: string, merger: MergerInfo | undefined, labels: {
  mergedDate: string;
  mergedInto: string;
}) {
  const container = document.createElement('div');
  container.style.padding = '4px';

  const title = document.createElement('strong');
  title.className = 'text-base font-semibold';
  title.textContent = name;
  container.append(title);

  if (merger) {
    appendTextRow(
      container,
      labels.mergedInto,
      merger.newProvince,
      'mt-1 text-sm text-slate-600',
    );

    const dateRow = document.createElement('div');
    dateRow.className = 'mt-0.5 text-xs text-slate-400';
    dateRow.textContent = `${labels.mergedDate}: ${merger.mergeDate}`;
    container.append(dateRow);
  }

  return container;
}

export default function ProvinceBoundaryPopup({ map, mode }: ProvinceBoundaryPopupProps) {
  const t = useTranslations('Map');
  const mergerDataRef = useRef<Map<string, MergerInfo>>(new Map());
  const [metadataError, setMetadataError] = useState(false);

  useEffect(() => {
    fetch('/data/merger-info.json')
      .then((res) => res.json())
      .then((data: MergerInfo[]) => {
        data.forEach((item) => {
          mergerDataRef.current.set(item.oldProvince, item);
        });
      })
      .catch(() => {
        setMetadataError(true);
      });
  }, []);

  useEffect(() => {
    if (!map) return;

    const layerId = getProvinceHitLayerId(mode);

    const clickHandler = (e: maplibregl.MapMouseEvent) => {
      if (!map.getLayer(layerId)) return;

      try {
        const features = map.queryRenderedFeatures(e.point, { layers: [layerId] });
        if (!features.length) return;

        const feature = features[0];
        const name = feature?.properties?.name as string | undefined;
        if (!name) return;

        const merger = mode === 'pre' ? mergerDataRef.current.get(name) : undefined;

        new maplibregl.Popup({ closeButton: true, maxWidth: '300px' })
          .setLngLat(e.lngLat)
          .setDOMContent(
            createPopupContent(name, merger, {
              mergedDate: t('popupMergedDate'),
              mergedInto: t('popupMergedInto'),
            }),
          )
          .addTo(map);
      } catch {
        // Popup is non-critical; map interaction should continue even if metadata is malformed.
      }
    };

    const mouseEnterHandler = () => {
      map.getCanvas().style.cursor = 'pointer';
    };

    const mouseLeaveHandler = () => {
      map.getCanvas().style.cursor = '';
    };

    map.on('click', clickHandler);

    if (map.getLayer(layerId)) {
      map.on('mouseenter', layerId, mouseEnterHandler);
      map.on('mouseleave', layerId, mouseLeaveHandler);
    }

    return () => {
      try {
        map.off('click', clickHandler);
        if (map.getLayer(layerId)) {
          map.off('mouseenter', layerId, mouseEnterHandler);
          map.off('mouseleave', layerId, mouseLeaveHandler);
        }
      } catch {
        // Ignore cleanup errors from MapLibre teardown.
      }
    };
  }, [map, mode, t]);

  if (!metadataError) return null;

  return (
    <div className="pointer-events-none absolute bottom-10 left-1/2 z-10 w-[min(90vw,28rem)] -translate-x-1/2 rounded-xl border border-amber-200 bg-amber-50/95 px-4 py-3 text-sm text-amber-900 shadow-lg backdrop-blur">
      {t('metadataError')}
    </div>
  );
}
