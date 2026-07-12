import type { EditableField, PaginationMeta, Product } from '../../api/types';
import { COLUMN_HEADERS, GRID_TEMPLATE } from './columns';
import { Pagination } from './Pagination';
import { ProductRow } from './ProductRow';

interface InventoryTableProps {
  products: Product[];
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  onEdit: (id: string, field: EditableField, value: string | number | boolean) => void;
  isFetching: boolean;
}

/**
 * The inventory table shell: sticky header, the list of top-level product rows
 * (each recursively expandable), and pagination.
 */
export function InventoryTable({
  products,
  meta,
  onPageChange,
  onEdit,
  isFetching,
}: InventoryTableProps): JSX.Element {
  return (
    <div className="overflow-hidden rounded-2xl border border-surface-border bg-white shadow-card">
      <div className="overflow-x-auto">
        <div className="min-w-[980px]" role="table" aria-label="Product inventory">
          {/* Header */}
          <div
            role="row"
            className="grid border-b border-surface-border bg-surface-muted/80 font-mono text-[11px] uppercase tracking-[0.12em] text-text-muted"
            style={{ gridTemplateColumns: GRID_TEMPLATE }}
          >
            {COLUMN_HEADERS.map((header, index) => (
              <div
                key={header || `col-${index}`}
                role="columnheader"
                className={`px-3 py-3.5 ${index === 4 ? 'text-center' : ''}`}
                style={index === 0 ? { paddingLeft: 16 } : undefined}
              >
                {header}
              </div>
            ))}
          </div>

          {/* Body */}
          <div
            role="rowgroup"
            className={
              isFetching
                ? 'opacity-50 transition-opacity duration-200'
                : 'transition-opacity duration-200'
            }
          >
            {products.map((product) => (
              <ProductRow key={product.id} node={product} depth={0} callbacks={{ onEdit }} />
            ))}
          </div>
        </div>
      </div>

      <Pagination meta={meta} onPageChange={onPageChange} />
    </div>
  );
}
