import { useMemo, useState } from 'react';

import { useProducts, useUpdateProduct } from '../../api/hooks';
import type { EditableField } from '../../api/types';
import { useEditStore } from '../../store/editStore';
import { BulkImportModal } from './BulkImportModal';
import { InventoryTable } from './InventoryTable';
import { Toast } from './Toast';
import { useBulkImport } from './useBulkImport';

const PAGE_SIZE = 5;

/**
 * Inventory screen. Owns pagination/search/sort state, wires the products query
 * to the table, routes inline edits to both the session store and the API, and
 * hosts the bulk-import flow.
 */
export function InventoryPage(): JSX.Element {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  // Default order preserves the catalogue; switched to `newest` after an import
  // so the freshly created products land at the top of page 1.
  const [sort, setSort] = useState<'oldest' | 'newest'>('oldest');
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const listParams = useMemo(
    () => ({ page, pageSize: PAGE_SIZE, sort, ...(search ? { search } : {}) }),
    [page, search, sort],
  );

  const { data, isLoading, isError, error, isFetching, refetch } = useProducts(listParams);
  const updateProduct = useUpdateProduct(listParams);
  const setEdit = useEditStore((state) => state.setEdit);

  // On import completion: surface the new products (newest-first, page 1) + toast.
  const bulkImport = useBulkImport((total) => {
    setSort('newest');
    setPage(1);
    setToast(`${total} product${total === 1 ? '' : 's'} imported — shown at the top.`);
  });

  const handleEdit = (id: string, field: EditableField, value: string | number | boolean): void => {
    // 1) Persist to the session store so a refresh keeps the edit.
    setEdit(id, field, value);
    // 2) Optimistically PATCH the server.
    updateProduct.mutate({ id, patch: { [field]: value } });
  };

  const closeModal = (): void => {
    setModalOpen(false);
    bulkImport.reset();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Header
        search={search}
        onSearch={(value) => {
          setSearch(value);
          setPage(1);
        }}
        onImportClick={() => setModalOpen(true)}
      />

      {isLoading ? (
        <SkeletonTable />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message} onRetry={() => void refetch()} />
      ) : !data || data.data.length === 0 ? (
        <EmptyState />
      ) : (
        <InventoryTable
          products={data.data}
          meta={data.meta}
          onPageChange={setPage}
          onEdit={handleEdit}
          isFetching={isFetching}
        />
      )}

      {modalOpen && (
        <BulkImportModal
          state={bulkImport.state}
          onUpload={(file) => void bulkImport.start(file)}
          onClose={closeModal}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

function Header({
  search,
  onSearch,
  onImportClick,
}: {
  search: string;
  onSearch: (value: string) => void;
  onImportClick: () => void;
}): JSX.Element {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-indigo">Inventory</h1>
        <p className="mt-1 text-sm text-text-muted">
          Products, colours and sizes — click any value to edit inline.
        </p>
      </div>
      <div className="flex w-full items-center gap-3 sm:w-auto">
        <div className="relative w-full sm:w-64">
          <input
            type="search"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search products…"
            aria-label="Search products"
            className="w-full rounded-lg border border-surface-border bg-white px-3 py-2 text-sm outline-none focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/20"
          />
        </div>
        <button
          type="button"
          onClick={onImportClick}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-accent-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
        >
          <span aria-hidden="true">＋</span>
          Bulk import
        </button>
      </div>
    </header>
  );
}

function SkeletonTable(): JSX.Element {
  return (
    <div className="space-y-2 rounded-xl border border-surface-border bg-white p-4 shadow-card">
      {Array.from({ length: PAGE_SIZE }).map((_, index) => (
        <div key={index} className="h-10 animate-pulse rounded bg-surface-sunken" />
      ))}
    </div>
  );
}

function EmptyState(): JSX.Element {
  return (
    <div className="rounded-xl border border-dashed border-surface-border bg-white p-12 text-center">
      <p className="text-sm text-text-muted">No products found.</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message?: string; onRetry: () => void }): JSX.Element {
  return (
    <div className="rounded-xl border border-coral/30 bg-coral-tint p-8 text-center">
      <p className="font-medium text-coral-hover">Could not load inventory</p>
      <p className="mt-1 text-sm text-text-muted">{message ?? 'Please try again.'}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-lg bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-coral-hover"
      >
        Retry
      </button>
    </div>
  );
}
