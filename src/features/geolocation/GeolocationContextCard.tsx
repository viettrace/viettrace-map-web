'use client';

import { useEffect, useRef, useState } from 'react';
import type maplibregl from 'maplibre-gl';
import { useLocale, useTranslations } from 'next-intl';
import { CloseIcon } from '@src/components/Map/MapChromeIcons';
import { boundaryLayerIds } from '@src/features/boundaries/boundaryLayerRegistry';
import type { GeolocationPosition } from './useGeolocation';

const NESTED_LAYER_IDS = [
  boundaryLayerIds.postWardsCandidateFill,
  boundaryLayerIds.preDistrictsCandidateFill,
];
const PROVINCE_LAYER_IDS = [boundaryLayerIds.preFill, boundaryLayerIds.postFill];
const LOCATION_LAYER_IDS = [...NESTED_LAYER_IDS, ...PROVINCE_LAYER_IDS];
const NESTED_LAYER_ID_SET = new Set<string>(NESTED_LAYER_IDS);
const PROVINCE_LAYER_ID_SET = new Set<string>(PROVINCE_LAYER_IDS);
const NESTED_RETRY_LIMIT = 12;
const NESTED_RETRY_DELAY_MS = 250;

interface LocationContext {
  nestedName: string | null;
  nestedType: 'district' | 'ward' | null;
  provinceName: string | null;
}

interface GeolocationContextCardProps {
  isReady: boolean;
  map: maplibregl.Map | null;
  position: GeolocationPosition | null;
  isTracking: boolean;
}

export default function GeolocationContextCard({
  isReady,
  map,
  position,
  isTracking,
}: GeolocationContextCardProps) {
  const t = useTranslations('geolocation');
  const locale = useLocale();
  const [locationContext, setLocationContext] = useState<LocationContext | null>(null);
  const [visible, setVisible] = useState(false);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastContextKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!map || !position || !isReady) {
      return;
    }

    const scheduleDismiss = () => {
      if (isTracking) {
        return;
      }

      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }

      dismissTimerRef.current = setTimeout(() => {
        setVisible(false);
      }, 15000);
    };

    const queryLocation = (attempt = 0): void => {
      const available = LOCATION_LAYER_IDS.filter((id) => map.getLayer(id));
      if (available.length === 0) return;

      const point = map.project([position.lng, position.lat]);
      const features = map.queryRenderedFeatures(point, { layers: available });
      const nestedFeature = features.find(feature => NESTED_LAYER_ID_SET.has(feature.layer.id));
      const provinceFeature = features.find(feature => PROVINCE_LAYER_ID_SET.has(feature.layer.id));
      const hasNestedLayer = available.some(id => NESTED_LAYER_ID_SET.has(id));

      if (
        provinceFeature &&
        !nestedFeature &&
        hasNestedLayer &&
        map.getZoom() >= 7 &&
        attempt < NESTED_RETRY_LIMIT
      ) {
        retryTimerRef.current = setTimeout(() => {
          queryLocation(attempt + 1);
        }, NESTED_RETRY_DELAY_MS);
        return;
      }

      if (nestedFeature || provinceFeature) {
        const context = {
          nestedName: nestedFeature ? getFeatureName(nestedFeature, locale) : null,
          nestedType: nestedFeature ? getNestedType(nestedFeature.layer.id) : null,
          provinceName: provinceFeature ? getFeatureName(provinceFeature, locale) : null,
        } satisfies LocationContext;
        const contextKey = `${context.provinceName ?? ''}|${context.nestedType ?? ''}|${context.nestedName ?? ''}`;

        if (isTracking && contextKey === lastContextKeyRef.current) {
          return;
        }

        lastContextKeyRef.current = contextKey;
        setLocationContext(context);
        setVisible(true);
      } else {
        const outsideLabel = t('outsideVietnam');

        if (isTracking && outsideLabel === lastContextKeyRef.current) {
          return;
        }

        lastContextKeyRef.current = outsideLabel;
        setLocationContext(null);
        setVisible(true);
      }
    };

    // Wait for map to finish flying before querying
    if (map.isMoving()) {
      const handler = () => {
        queryLocation();
        map.off('moveend', handler);
      };
      map.on('moveend', handler);
      scheduleDismiss();
      return () => { map.off('moveend', handler); };
    }

    queryLocation();
    scheduleDismiss();
    return undefined;
  }, [isReady, locale, map, position, isTracking, t]);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div
      className="pointer-events-auto w-[min(20rem,calc(100vw-1.25rem))] rounded-lg border border-slate-200 bg-white/95 p-3 text-sm text-slate-800 shadow-lg backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/95 dark:text-gray-100"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-5">
            {locationContext?.provinceName
              ? t('youAreIn', { province: locationContext.provinceName })
              : t('outsideVietnam')}
          </p>
          {locationContext?.nestedName && locationContext.nestedType ? (
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-xs leading-5 text-slate-600 dark:text-gray-300">
              <dt className="font-medium text-slate-500 dark:text-gray-400">
                {locationContext.nestedType === 'district' ? t('districtLabel') : t('wardLabel')}
              </dt>
              <dd className="min-w-0 truncate font-medium text-slate-800 dark:text-gray-100">
                {locationContext.nestedName}
              </dd>
            </dl>
          ) : null}
        </div>
        <button
          aria-label={t('dismiss')}
          className="-mr-1 -mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          onClick={() => setVisible(false)}
          type="button"
        >
          <CloseIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function getFeatureName(feature: maplibregl.MapGeoJSONFeature, locale: string) {
  const nameEn = typeof feature.properties?.name_en === 'string' ? feature.properties.name_en : null;
  const name = typeof feature.properties?.name === 'string' ? feature.properties.name : null;

  if (locale === 'en') {
    return getEnglishFeatureName(nameEn, name);
  }

  return name ?? nameEn ?? '';
}

function getNestedType(layerId: string): LocationContext['nestedType'] {
  if (layerId === boundaryLayerIds.preDistrictsCandidateFill) {
    return 'district';
  }

  if (layerId === boundaryLayerIds.postWardsCandidateFill) {
    return 'ward';
  }

  return null;
}

function getEnglishFeatureName(nameEn: string | null, nameVi: string | null) {
  const normalizedEnglish = nameEn ? normalizeLatinText(nameEn) : null;
  const inferredSuffix = inferEnglishAdminSuffix(nameVi);
  const hasEnglishSuffix = normalizedEnglish
    ? /\b(city|province|urban district|rural district|district|ward|commune|township|special zone)\b/i.test(
        normalizedEnglish,
      )
    : false;
  const baseName = normalizedEnglish
    ? stripEnglishAdminSuffix(normalizedEnglish)
    : latinizeVietnamesePlaceName(nameVi ?? '');
  const formattedBaseName = normalizeEnglishPlaceSpelling(baseName);

  if (hasEnglishSuffix) {
    return normalizeEnglishPlaceSpelling(formatEnglishPlaceName(normalizedEnglish ?? ''));
  }

  return inferredSuffix ? `${formattedBaseName} ${inferredSuffix}` : formattedBaseName;
}

function formatEnglishPlaceName(value: string) {
  return normalizeLatinText(value).replace(
    /\b(City|Province|Urban District|Rural District|District|Ward|Commune|Township|Special Zone)\b/gi,
    match => match.toLowerCase(),
  );
}

function inferEnglishAdminSuffix(value: string | null) {
  if (!value) return null;
  if (/^Thành phố\s+/i.test(value)) return 'city';
  if (/^Tỉnh\s+/i.test(value)) return 'province';
  if (/^Quận\s+/i.test(value)) return 'Urban district';
  if (/^Huyện\s+/i.test(value)) return 'District';
  if (/^Phường\s+/i.test(value)) return 'Ward';
  if (/^Xã\s+/i.test(value)) return 'Commune';
  if (/^Thị trấn\s+/i.test(value)) return 'Township';
  if (/^Đặc khu\s+/i.test(value)) return 'Special zone';
  return null;
}

function stripEnglishAdminSuffix(value: string) {
  return value
    .replace(/\s+(city|province|urban district|rural district|district|ward|commune|township|special zone)$/i, '')
    .trim();
}

function normalizeEnglishPlaceSpelling(value: string) {
  return value.replace(/\bHa Noi\b/g, 'Hanoi').trim();
}

function normalizeLatinText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .trim();
}

function latinizeVietnamesePlaceName(value: string) {
  return normalizeLatinText(value)
    .replace(/^Thành phố\s+/i, '')
    .replace(/^Tỉnh\s+/i, '')
    .replace(/^Quận\s+/i, '')
    .replace(/^Huyện\s+/i, '')
    .replace(/^Phường\s+/i, '')
    .replace(/^Xã\s+/i, '')
    .replace(/^Thị trấn\s+/i, '')
    .replace(/^Đặc khu\s+/i, '')
    .trim();
}
