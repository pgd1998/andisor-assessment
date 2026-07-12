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
  secondaryLabel,
}: {
  node: AnyNode;
  depth: number;
  callbacks: RowCallbacks;
  /**
   * Header label for a primary variant's children (e.g. "Size"). Both dimension
   * names live on the PRODUCT, so the product passes its `secondaryVariantName`
   * down for its primary variants to render above their own children.
   */
  secondaryLabel?: string | null;
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

  // Header shown above this node's children.
  const childGroupLabel = hasPrimary(node)
    ? (node.primaryVariantName ?? 'Variants')
    : hasSecondary(node)
      ? (secondaryLabel ?? 'Variants')
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
            {/* Product description as a muted, truncated subtitle. */}
            {node.level === 'PRODUCT' && node.description && (
              <p className="truncate px-2 text-xs text-text-muted" title={node.description}>
                {node.description}
              </p>
            )}
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

        {/* Category, Type and Lead Time are product-level attributes; a dash on
            variant rows keeps the columns visually aligned. */}
        <Cell className="text-text-muted">
          {node.level === 'PRODUCT' ? textOrDash((effective as ProductNode).category) : '—'}
        </Cell>
        <Cell className="text-text-muted">{node.level === 'PRODUCT' ? 'Product' : '—'}</Cell>
        <Cell className="text-text-muted">
          {node.level === 'PRODUCT' ? textOrDash((effective as ProductNode).leadTime) : '—'}
        </Cell>
      </div>

      {/* Expanded children, introduced by a group-label row */}
      {expanded && isExpandable && childGroupLabel && (
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
            {childGroupLabel}
          </div>
        </div>
      )}
      {expanded &&
        children.map((child) => (
          <ProductRow
            key={child.id}
            node={child}
            depth={depth + 1}
            callbacks={callbacks}
            // A product hands its secondary dimension name to its primary
            // variants, so they can label their own children (e.g. "Size").
            secondaryLabel={hasPrimary(node) ? node.secondaryVariantName : (secondaryLabel ?? null)}
          />
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
  if (node.level === 'PRODUCT') {
    return <ProductAvatar name={node.name} image={node.image} />;
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
  return <InitialAvatar name={node.name} />;
}

/**
 * Product thumbnail with a graceful fallback: renders the image, but if it fails
 * to load (e.g. an unreachable external URL) it swaps to an initial-letter
 * avatar so rows never show a broken-image icon.
 */
function ProductAvatar({ name, image }: { name: string; image: string | null }): JSX.Element {
  const [failed, setFailed] = useState(false);

  if (!image || failed) {
    return <InitialAvatar name={name} />;
  }

  return (
    <img
      src={image}
      alt=""
      onError={() => setFailed(true)}
      className="h-7 w-7 shrink-0 rounded-full border border-surface-border bg-surface-sunken object-cover"
      loading="lazy"
    />
  );
}

function InitialAvatar({ name }: { name: string }): JSX.Element {
  return (
    <span
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-lavender/30 to-accent-blue/20 text-xs font-medium text-indigo"
      aria-hidden="true"
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

function textOrDash(value: string | null): string {
  return value && value.length > 0 ? value : '—';
}
