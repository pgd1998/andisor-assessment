import { useCallback, useEffect, useRef, useState } from 'react';

import { bulkImportApi } from '../../api/client';
import type { BulkImportStatus } from '../../api/types';

export type BulkImportPhase =
  'idle' | 'uploading' | 'processing' | 'refreshing' | 'completed' | 'failed';

export interface BulkImportState {
  phase: BulkImportPhase;
  batchId: string | null;
  status: BulkImportStatus | null;
  /** Number of products the batch created (known once the worker finishes). */
  importedCount: number;
  error: string | null;
}

const POLL_INTERVAL_MS = 1000;
const initialState: BulkImportState = {
  phase: 'idle',
  batchId: null,
  status: null,
  importedCount: 0,
  error: null,
};

/**
 * Drives the bulk-import flow: upload a file (→ 202), then poll the batch status
 * until the worker has created every product.
 *
 * Crucially, this hook does NOT declare success on its own. When the worker
 * finishes it enters the `refreshing` phase; the owning component (which renders
 * the product list) confirms the new rows are actually on screen and then calls
 * `confirmVisible()`. Only then does the phase become `completed`. This makes the
 * rendered UI — not a cache/count — the single source of truth for "success".
 */
export function useBulkImport() {
  const [state, setState] = useState<BulkImportState>(initialState);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = (): void => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  // Stop polling if the component unmounts mid-import.
  useEffect(() => clearTimer, []);

  const poll = useCallback(async (batchId: string, total: number): Promise<void> => {
    try {
      const status = await bulkImportApi.status(batchId);
      setState((prev) => ({ ...prev, status }));

      // Note: the queue counts are cumulative/queue-wide, so we rely on the batch's
      // own persisted status for completion, and on the batch size (`total`) for
      // how many products this import created.
      if (status.status === 'COMPLETED') {
        // Worker finished — hand off to the component to confirm the rows render.
        setState((prev) => ({ ...prev, phase: 'refreshing', importedCount: total }));
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
  }, []);

  const start = useCallback(
    async (file: File): Promise<void> => {
      clearTimer();
      setState({ ...initialState, phase: 'uploading' });
      try {
        const accepted = await bulkImportApi.upload(file);
        setState({
          phase: 'processing',
          batchId: accepted.batchId,
          status: null,
          importedCount: 0,
          error: null,
        });
        await poll(accepted.batchId, accepted.totalProducts);
      } catch (error) {
        setState({
          ...initialState,
          phase: 'failed',
          error: error instanceof Error ? error.message : 'Upload failed',
        });
      }
    },
    [poll],
  );

  /** Called by the owner once the imported rows are actually rendered. */
  const confirmVisible = useCallback((): void => {
    setState((prev) => (prev.phase === 'refreshing' ? { ...prev, phase: 'completed' } : prev));
  }, []);

  const reset = useCallback((): void => {
    clearTimer();
    setState(initialState);
  }, []);

  return { state, start, confirmVisible, reset };
}
