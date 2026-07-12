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
    <div className="flex items-center justify-between border-t border-surface-border bg-surface-muted/40 px-5 py-3.5 text-sm">
      <p className="text-text-muted">
        Showing <span className="font-mono tabular font-medium text-indigo">{from}</span>–
        <span className="font-mono tabular font-medium text-indigo">{to}</span> of{' '}
        <span className="font-mono tabular font-medium text-indigo">{total}</span>
      </p>

      <div className="flex items-center gap-2">
        <PagerButton disabled={!hasPreviousPage} onClick={() => onPageChange(page - 1)}>
          Previous
        </PagerButton>
        <span className="px-2 font-mono text-xs tabular text-text-muted">
          {page} / {totalPages}
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
        'rounded-lg border bg-white px-3.5 py-1.5 font-medium transition-all',
        disabled
          ? 'cursor-not-allowed border-surface-border/60 text-surface-border'
          : 'border-surface-border text-indigo hover:border-accent-blue hover:text-accent-blue hover:shadow-sm active:scale-[0.97]',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
