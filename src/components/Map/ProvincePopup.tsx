'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { useTranslations } from 'next-intl';

interface ProvincePopupProps {
  map: maplibregl.Map | null;
  mode: 'pre' | 'post';
}

interface MergerInfo {
  oldProvince: string;
  newProvince: string;
  mergeDate: string;
}

export default function ProvincePopup({ map, mode }: ProvincePopupProps) {
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

    const layerId = mode === 'pre' ? 'provinces-pre-fill' : 'provinces-post-fill';

    const clickHandler = (e: maplibregl.MapMouseEvent) => {
      if (!map.getLayer(layerId)) return;

      try {
        const features = map.queryRenderedFeatures(e.point, { layers: [layerId] });
        if (!features.length) return;

        const feature = features[0];
        if (!feature) return;
        const name = feature.properties?.name as string | undefined;
        if (!name) return;

        let html = `<strong class="text-base font-semibold">${name}</strong>`;

        if (mode === 'pre') {
          const merger = mergerDataRef.current.get(name);
          if (merger) {
            html += `<div style="margin-top:4px;font-size:0.875rem;color:#555">${t('popupMergedInto')}: <strong>${merger.newProvince}</strong></div>`;
            html += `<div style="font-size:0.75rem;color:#999;margin-top:2px">${t('popupMergedDate')}: ${merger.mergeDate}</div>`;
          }
        }

        new maplibregl.Popup({ closeButton: true, maxWidth: '300px' })
          .setLngLat(e.lngLat)
          .setHTML(`<div style="padding:4px">${html}</div>`)
          .addTo(map);
      } catch {
        // Ignore popup errors
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
        // Ignore cleanup errors
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
