import { useMemo, useState } from 'react';

import { useProducts, useUpdateProduct } from '../../api/hooks';
import type { EditableField } from '../../api/types';
import { useEditStore } from '../../store/editStore';
import { InventoryTable } from './InventoryTable';

const PAGE_SIZE = 5;

/**
 * Inventory screen. Owns pagination + search state, wires the products query to
 * the table, and routes inline edits both to the session store (so they survive
 * refresh) and to the API (optimistic PATCH).
 */
export function InventoryPage(): JSX.Element {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const listParams = useMemo(
    () => ({ page, pageSize: PAGE_SIZE, ...(search ? { search } : {}) }),
    [page, search],
  );

  const { data, isLoading, isError, error, isFetching, refetch } = useProducts(listParams);
  const updateProduct = useUpdateProduct(listParams);
  const setEdit = useEditStore((state) => state.setEdit);

  const handleEdit = (id: string, field: EditableField, value: string | number | boolean): void => {
    // 1) Persist to the session store so a refresh keeps the edit.
    setEdit(id, field, value);
    // 2) Optimistically PATCH the server.
    updateProduct.mutate({ id, patch: { [field]: value } });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Header
        search={search}
        onSearch={(value) => {
          setSearch(value);
          setPage(1);
        }}
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
    </div>
  );
}

function Header({
  search,
  onSearch,
}: {
  search: string;
  onSearch: (value: string) => void;
}): JSX.Element {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-indigo">Inventory</h1>
        <p className="mt-1 text-sm text-text-muted">
          Products, colours and sizes — click any value to edit inline.
        </p>
      </div>
      <div className="relative w-full sm:w-72">
        <input
          type="search"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Search products…"
          aria-label="Search products"
          className="w-full rounded-lg border border-surface-border bg-white px-3 py-2 text-sm outline-none focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/20"
        />
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
