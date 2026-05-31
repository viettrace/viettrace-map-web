'use client';

import { useEffect, useState } from 'react';
import type { NestedIndex } from './nestedIndexTypes';

const NESTED_INDEX_URL = '/data/nested-index.json';

interface NestedIndexState {
  data: NestedIndex | null;
  error: string | null;
  isLoading: boolean;
}

export function useNestedIndex(): NestedIndexState {
  const [state, setState] = useState<NestedIndexState>({
    data: null,
    error: null,
    isLoading: true,
  });

  useEffect(() => {
    const controller = new AbortController();

    fetch(NESTED_INDEX_URL, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) {
          throw new Error(`Unable to load nested index: ${response.status}`);
        }

        const data: unknown = await response.json();

        if (!isNestedIndex(data)) {
          throw new Error('Nested index has an invalid shape.');
        }

        setState({ data, error: null, isLoading: false });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setState({
          data: null,
          error: error instanceof Error ? error.message : 'Unable to load nested index.',
          isLoading: false,
        });
      });

    return () => {
      controller.abort();
    };
  }, []);

  return state;
}

function isNestedIndex(data: unknown): data is NestedIndex {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const candidate = data as Partial<NestedIndex>;

  return candidate.schemaVersion === 1 && Array.isArray(candidate.features);
}
