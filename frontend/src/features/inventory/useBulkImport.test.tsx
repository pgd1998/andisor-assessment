import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { bulkImportApi } from '../../api/client';
import { useBulkImport } from './useBulkImport';

vi.mock('../../api/client', () => ({
  bulkImportApi: {
    upload: vi.fn(),
    status: vi.fn(),
  },
}));

const uploadMock = vi.mocked(bulkImportApi.upload);
const statusMock = vi.mocked(bulkImportApi.status);

function wrapper({ children }: { children: ReactNode }): JSX.Element {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useBulkImport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('uploads, polls, and reaches the refreshing phase once the worker finishes', async () => {
    uploadMock.mockResolvedValue({ batchId: 'b1', totalProducts: 2, statusUrl: '/x' });
    statusMock.mockResolvedValue({
      batchId: 'b1',
      status: 'COMPLETED',
      totalProducts: 2,
      counts: { queued: 0, active: 0, completed: 2, failed: 0 },
    });

    const { result } = renderHook(() => useBulkImport(), { wrapper });

    await act(async () => {
      await result.current.start(new File(['[]'], 'products.json'));
    });

    // The hook hands off in 'refreshing'; the owner confirms the rows are visible.
    await waitFor(() => expect(result.current.state.phase).toBe('refreshing'));
    expect(result.current.state.importedCount).toBe(2);

    act(() => result.current.confirmVisible());
    expect(result.current.state.phase).toBe('completed');
    expect(uploadMock).toHaveBeenCalledOnce();
  });

  it('surfaces an upload failure', async () => {
    uploadMock.mockRejectedValue(new Error('Uploaded file is not valid JSON'));

    const { result } = renderHook(() => useBulkImport(), { wrapper });
    await act(async () => {
      await result.current.start(new File(['bad'], 'products.json'));
    });

    expect(result.current.state.phase).toBe('failed');
    expect(result.current.state.error).toContain('not valid JSON');
  });
});
