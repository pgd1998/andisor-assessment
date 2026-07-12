import { useEffect, useMemo, useRef, useState } from 'react';

import { useProducts, useUpdateProduct } from '../../api/hooks';
import type { EditableField } from '../../api/types';
import { useEditStore } from '../../store/editStore';
import { BulkImportModal } from './BulkImportModal';
import { InventoryTable } from './InventoryTable';
import { StatCards } from './StatCards';
import { useBulkImport } from './useBulkImport';
import { useInventoryStats } from './useInventoryStats';

const PAGE_SIZE = 5;

/**
 * Inventory screen. Owns pagination/search state, wires the products query to the
 * table, routes inline edits to both the session store and the API, and hosts the
 * bulk-import flow.
 */
export function InventoryPage(): JSX.Element {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  // Newest-first by default, so freshly imported products surface at the top of
  // page 1 without any special post-import navigation.
  const listParams = useMemo(
    () => ({ page, pageSize: PAGE_SIZE, sort: 'newest' as const, ...(search ? { search } : {}) }),
    [page, search],
  );

  const { data, isLoading, isError, error, isFetching, refetch } = useProducts(listParams);
  const stats = useInventoryStats();
  const updateProduct = useUpdateProduct(listParams);
  const setEdit = useEditStore((state) => state.setEdit);
  const bulkImport = useBulkImport();

  // ── Bulk-import completion, driven by what's actually rendered ──────────────
  // When the worker finishes (phase === 'refreshing'), snapshot the currently
  // rendered total, force a refetch, and only mark the import complete once the
  // rendered query data reflects the new products. The on-screen table is the
  // single source of truth — not the cache or a status count.
  const importPhase = bulkImport.state.phase;
  const importedCount = bulkImport.state.importedCount;
  const targetTotalRef = useRef<number | null>(null);
  const { confirmVisible } = bulkImport;

  useEffect(() => {
    if (importPhase !== 'refreshing') {
      targetTotalRef.current = null;
      return;
    }
    // On entering the refreshing phase: capture the target total and reset the
    // view to page 1 (newest-first) so the imported rows are on the visible page.
    if (targetTotalRef.current === null) {
      const current = data?.meta.total ?? 0;
      targetTotalRef.current = current + importedCount;
      setPage(1);
      void refetch();
      return;
    }
    // The rendered data now reflects the imported products → declare success.
    if (!isFetching && (data?.meta.total ?? 0) >= targetTotalRef.current) {
      confirmVisible();
    }
  }, [importPhase, importedCount, data, isFetching, refetch, confirmVisible]);

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
    <div className="mx-auto max-w-7xl px-6 py-10">
      <Header
        search={search}
        onSearch={(value) => {
          setSearch(value);
          setPage(1);
        }}
        onImportClick={() => setModalOpen(true)}
      />

      <StatCards stats={stats.data} isLoading={stats.isLoading} />

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
    <header className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-brand-purple">
          Catalogue
        </p>
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-indigo">
          Inventory
        </h1>
        <p className="mt-1.5 text-sm text-text-muted">
          Products, colours and sizes — click any value to edit inline.
        </p>
      </div>
      <div className="flex w-full items-center gap-3 sm:w-auto">
        <div className="relative w-full sm:w-64">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
            <path d="m14 14 3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search products…"
            aria-label="Search products"
            className="w-full rounded-xl border border-surface-border bg-white py-2.5 pl-9 pr-3 text-sm shadow-sm outline-none transition-shadow focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/20"
          />
        </div>
        <button
          type="button"
          onClick={onImportClick}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-indigo px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:shadow-raised active:scale-[0.98]"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M10 4v9m0-9L6.5 7.5M10 4l3.5 3.5M5 15h10"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Bulk import
        </button>
      </div>
    </header>
  );
}

function SkeletonTable(): JSX.Element {
  return (
    <div className="overflow-hidden rounded-2xl border border-surface-border bg-white p-4 shadow-card">
      {Array.from({ length: PAGE_SIZE }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 border-b border-surface-border/50 py-3 last:border-0"
        >
          <div className="h-8 w-8 shrink-0 rounded-full bg-surface-sunken" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 rounded bg-surface-sunken" />
            <div className="h-2.5 w-1/2 rounded bg-surface-sunken/70" />
          </div>
          <div className="h-3 w-16 rounded bg-surface-sunken" />
          <div className="h-5 w-9 rounded-full bg-surface-sunken" />
        </div>
      ))}
      {/* Shimmer sweep over the skeleton. */}
      <div
        className="pointer-events-none -mt-[calc(100%)] h-full animate-pulse"
        aria-hidden="true"
      />
    </div>
  );
}

function EmptyState(): JSX.Element {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-surface-border bg-white p-16 text-center shadow-card">
      <span
        className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-lavender/25 to-accent-blue/20 text-2xl"
        aria-hidden="true"
      >
        📦
      </span>
      <p className="font-medium text-indigo">No products found</p>
      <p className="mt-1 max-w-sm text-sm text-text-muted">
        Try a different search, or bulk-import a product catalogue to get started.
      </p>
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
