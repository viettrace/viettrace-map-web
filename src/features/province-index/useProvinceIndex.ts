'use client';

import { useEffect, useState } from 'react';
import type { ProvinceIndex } from './provinceIndexTypes';

const PROVINCE_INDEX_URL = '/data/province-index.json';

interface ProvinceIndexState {
  data: ProvinceIndex | null;
  error: string | null;
  isLoading: boolean;
}

export function useProvinceIndex(): ProvinceIndexState {
  const [state, setState] = useState<ProvinceIndexState>({
    data: null,
    error: null,
    isLoading: true,
  });

  useEffect(() => {
    const controller = new AbortController();

    fetch(PROVINCE_INDEX_URL, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) {
          throw new Error(`Unable to load province index: ${response.status}`);
        }

        const data: unknown = await response.json();

        if (!isProvinceIndex(data)) {
          throw new Error('Province index has an invalid shape.');
        }

        setState({ data, error: null, isLoading: false });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setState({
          data: null,
          error: error instanceof Error ? error.message : 'Unable to load province index.',
          isLoading: false,
        });
      });

    return () => {
      controller.abort();
    };
  }, []);

  return state;
}

function isProvinceIndex(data: unknown): data is ProvinceIndex {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const candidate = data as Partial<ProvinceIndex>;

  return candidate.schemaVersion === 1 && Array.isArray(candidate.provinces);
}
