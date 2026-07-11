import type { PaginationMeta } from '../../api/types';

interface PaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}

/** Compact pager showing the current window and prev/next controls. */
export function Pagination({ meta, onPageChange }: PaginationProps): JSX.Element {
  const { page, pageSize, total, totalPages, hasNextPage, hasPreviousPage } = meta;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between border-t border-surface-border bg-white px-4 py-3 text-sm">
      <p className="text-text-muted">
        Showing <span className="font-medium text-indigo">{from}</span>–
        <span className="font-medium text-indigo">{to}</span> of{' '}
        <span className="font-medium text-indigo">{total}</span>
      </p>

      <div className="flex items-center gap-1">
        <PagerButton disabled={!hasPreviousPage} onClick={() => onPageChange(page - 1)}>
          Previous
        </PagerButton>
        <span className="px-3 text-text-muted">
          Page <span className="font-medium text-indigo">{page}</span> of {totalPages}
        </span>
        <PagerButton disabled={!hasNextPage} onClick={() => onPageChange(page + 1)}>
          Next
        </PagerButton>
      </div>
    </div>
  );
}

function PagerButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        'rounded-md border px-3 py-1.5 font-medium transition-colors',
        disabled
          ? 'cursor-not-allowed border-surface-border text-surface-border'
          : 'border-surface-border text-indigo hover:border-accent-blue hover:text-accent-blue',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
