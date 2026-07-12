import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { bulkImportApi } from '../../api/client';
import type { BulkImportStatus } from '../../api/types';

export type BulkImportPhase = 'idle' | 'uploading' | 'processing' | 'completed' | 'failed';

export interface BulkImportState {
  phase: BulkImportPhase;
  batchId: string | null;
  status: BulkImportStatus | null;
  error: string | null;
}

const POLL_INTERVAL_MS = 1000;
const initialState: BulkImportState = { phase: 'idle', batchId: null, status: null, error: null };

/**
 * Drives the bulk-import flow: upload a file (→ 202), then poll the batch status
 * until it settles. On completion it invalidates the products cache so the newly
 * created products appear in the table.
 *
 * `onCompleted` fires once with the number of products created, letting the
 * caller show a toast and navigate to the freshly imported items.
 */
export function useBulkImport(onCompleted?: (total: number) => void) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<BulkImportState>(initialState);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCompletedRef = useRef(onCompleted);
  onCompletedRef.current = onCompleted;

  const clearTimer = (): void => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  // Stop polling if the component unmounts mid-import.
  useEffect(() => clearTimer, []);

  const poll = useCallback(
    async (batchId: string, total: number): Promise<void> => {
      try {
        const status = await bulkImportApi.status(batchId);
        setState((prev) => ({ ...prev, status }));

        const done = status.counts.completed + status.counts.failed >= total;
        if (status.status === 'COMPLETED' || done) {
          setState((prev) => ({ ...prev, phase: 'completed' }));
          await queryClient.invalidateQueries({ queryKey: ['products'] });
          onCompletedRef.current?.(total);
          return;
        }
        timerRef.current = setTimeout(() => void poll(batchId, total), POLL_INTERVAL_MS);
      } catch (error) {
        setState((prev) => ({
          ...prev,
          phase: 'failed',
          error: error instanceof Error ? error.message : 'Failed to fetch import status',
        }));
      }
    },
    [queryClient],
  );

  const start = useCallback(
    async (file: File): Promise<void> => {
      clearTimer();
      setState({ phase: 'uploading', batchId: null, status: null, error: null });
      try {
        const accepted = await bulkImportApi.upload(file);
        setState({
          phase: 'processing',
          batchId: accepted.batchId,
          status: null,
          error: null,
        });
        await poll(accepted.batchId, accepted.totalProducts);
      } catch (error) {
        setState({
          phase: 'failed',
          batchId: null,
          status: null,
          error: error instanceof Error ? error.message : 'Upload failed',
        });
      }
    },
    [poll],
  );

  const reset = useCallback((): void => {
    clearTimer();
    setState(initialState);
  }, []);

  return { state, start, reset };
}
