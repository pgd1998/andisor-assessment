import { useState } from 'react';

import type {
  EditableField,
  PrimaryVariant,
  Product,
  ProductNode,
  SecondaryVariant,
} from '../../api/types';
import { formatInteger, formatPrice, swatchColor } from '../../lib/format';
import { applyEdits, useEditStore } from '../../store/editStore';
import { EditableCell } from './EditableCell';
import { GRID_TEMPLATE, INDENT_PER_LEVEL } from './columns';
import { ToggleCell } from './ToggleCell';

interface RowCallbacks {
  onEdit: (id: string, field: EditableField, value: string | number | boolean) => void;
}

type AnyNode = Product | PrimaryVariant | SecondaryVariant;

function hasPrimary(node: AnyNode): node is Product {
  return node.level === 'PRODUCT';
}
function hasSecondary(node: AnyNode): node is PrimaryVariant {
  return node.level === 'PRIMARY_VARIANT';
}

/**
 * Recursively renders a product or variant row and (when expanded) its children,
 * with a group-label row ("Colour" / "Size") introducing each nested level —
 * mirroring the reference screenshot.
 */
export function ProductRow({
  node,
  depth,
  callbacks,
}: {
  node: AnyNode;
  depth: number;
  callbacks: RowCallbacks;
}): JSX.Element {
  const edits = useEditStore((state) => state.edits);
  const [expanded, setExpanded] = useState(false);

  // Effective values = server data with local edits layered on top.
  const effective = applyEdits(node, edits) as AnyNode;
  const nodeEdits = edits[node.id] ?? {};
  const isEdited = (field: EditableField): boolean => field in nodeEdits;

  const children: AnyNode[] = hasPrimary(node)
    ? node.primaryVariants
    : hasSecondary(node)
      ? node.secondaryVariants
      : [];
  const isExpandable = children.length > 0;

  const groupLabel = hasPrimary(node)
    ? (node.primaryVariantName ?? 'Variants')
    : hasSecondary(node)
      ? (node.secondaryVariantName ?? 'Variants')
      : null;

  return (
    <>
      <div
        role="row"
        className="grid items-center border-b border-surface-border/70 bg-white hover:bg-surface-muted/60"
        style={{ gridTemplateColumns: GRID_TEMPLATE }}
      >
        {/* Name cell: chevron + avatar/swatch + editable name */}
        <div
          role="cell"
          className="flex items-center gap-2 py-2 pr-2"
          style={{ paddingLeft: 12 + depth * INDENT_PER_LEVEL }}
        >
          <button
            type="button"
            aria-label={isExpandable ? (expanded ? 'Collapse' : 'Expand') : undefined}
            aria-expanded={isExpandable ? expanded : undefined}
            disabled={!isExpandable}
            onClick={() => setExpanded((value) => !value)}
            className={[
              'flex h-5 w-5 shrink-0 items-center justify-center rounded text-indigo-soft',
              isExpandable ? 'hover:bg-surface-sunken' : 'invisible',
            ].join(' ')}
          >
            <Chevron open={expanded} />
          </button>

          <NodeGlyph node={node} depth={depth} />

          <div className="min-w-0 flex-1">
            <EditableCell
              value={effective.name}
              display={effective.name}
              edited={isEdited('name')}
              ariaLabel={`name of ${node.name}`}
              onCommit={(next) => callbacks.onEdit(node.id, 'name', next)}
            />
          </div>
        </div>

        <Cell>
          <EditableCell
            value={effective.price}
            type="currency"
            display={formatPrice(effective.price)}
            edited={isEdited('price')}
            ariaLabel={`price of ${node.name}`}
            onCommit={(next) => callbacks.onEdit(node.id, 'price', next)}
          />
        </Cell>

        <Cell>
          <EditableCell
            value={effective.discountPercentage}
            type="number"
            display={`${effective.discountPercentage}%`}
            edited={isEdited('discountPercentage')}
            ariaLabel={`discount of ${node.name}`}
            onCommit={(next) => callbacks.onEdit(node.id, 'discountPercentage', next)}
          />
        </Cell>

        <Cell>
          <EditableCell
            value={effective.inventory}
            type="number"
            display={formatInteger(effective.inventory)}
            edited={isEdited('inventory')}
            ariaLabel={`inventory of ${node.name}`}
            onCommit={(next) => callbacks.onEdit(node.id, 'inventory', next)}
          />
        </Cell>

        <Cell className="justify-center">
          <ToggleCell
            checked={effective.active}
            edited={isEdited('active')}
            ariaLabel={`published state of ${node.name}`}
            onChange={(next) => callbacks.onEdit(node.id, 'active', next)}
          />
        </Cell>

        <Cell className="text-text-muted">{textOrDash((effective as ProductNode).category)}</Cell>
        <Cell className="text-text-muted">{levelLabel(node)}</Cell>
        <Cell />
      </div>

      {/* Expanded children, introduced by a group-label row */}
      {expanded && isExpandable && groupLabel && (
        <div
          role="row"
          className="grid border-b border-surface-border/40 bg-surface-sunken/60"
          style={{ gridTemplateColumns: GRID_TEMPLATE }}
        >
          <div
            role="cell"
            className="py-1 text-xs font-medium uppercase tracking-wide text-text-muted"
            style={{ paddingLeft: 12 + (depth + 1) * INDENT_PER_LEVEL + 24 }}
          >
            {groupLabel}
          </div>
        </div>
      )}
      {expanded &&
        children.map((child) => (
          <ProductRow key={child.id} node={child} depth={depth + 1} callbacks={callbacks} />
        ))}
    </>
  );
}

function Cell({
  children,
  className = '',
}: {
  children?: React.ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <div role="cell" className={`flex items-center px-2 py-2 text-sm ${className}`}>
      {children}
    </div>
  );
}

function Chevron({ open }: { open: boolean }): JSX.Element {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`h-4 w-4 transition-transform ${open ? 'rotate-90' : ''}`}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M7 5l6 5-6 5V5z" />
    </svg>
  );
}

/** Avatar for products, colour swatch for primary variants, dot for secondary. */
function NodeGlyph({ node, depth }: { node: AnyNode; depth: number }): JSX.Element {
  if (node.level === 'PRODUCT' && node.image) {
    return (
      <img
        src={node.image}
        alt=""
        className="h-7 w-7 shrink-0 rounded-full border border-surface-border object-cover"
        loading="lazy"
      />
    );
  }
  if (node.level === 'PRIMARY_VARIANT') {
    return (
      <span
        className="h-4 w-4 shrink-0 rounded-full border border-surface-border"
        style={{ backgroundColor: swatchColor(node.name) }}
        aria-hidden="true"
      />
    );
  }
  if (depth > 0 && node.level === 'SECONDARY_VARIANT') {
    return <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-text-muted" aria-hidden="true" />;
  }
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-xs text-text-muted">
      {node.name.charAt(0).toUpperCase()}
    </span>
  );
}

function levelLabel(node: AnyNode): string {
  switch (node.level) {
    case 'PRODUCT':
      return 'Product';
    case 'PRIMARY_VARIANT':
      return 'Colour';
    case 'SECONDARY_VARIANT':
      return 'Size';
  }
}

function textOrDash(value: string | null): string {
  return value && value.length > 0 ? value : '—';
}
