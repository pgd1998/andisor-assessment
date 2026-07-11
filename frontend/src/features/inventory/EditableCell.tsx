import { useEffect, useRef, useState } from 'react';

type CellType = 'text' | 'number' | 'currency';

interface EditableCellProps {
  value: string | number;
  type?: CellType;
  /** Rendered (non-editing) representation. */
  display: string;
  /** Whether this field has an unsaved local edit (drives the visual marker). */
  edited?: boolean;
  ariaLabel: string;
  onCommit: (next: string | number) => void;
}

/**
 * Inline-editable cell.
 *
 * Click (or focus + Enter/Space) to edit; commit on blur or Enter; cancel on
 * Escape. Numeric types coerce and reject NaN. An amber left-border marks cells
 * that carry an unsaved local edit.
 */
export function EditableCell({
  value,
  type = 'text',
  display,
  edited = false,
  ariaLabel,
  onCommit,
}: EditableCellProps): JSX.Element {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  // Keep the draft in sync when the underlying value changes externally.
  useEffect(() => {
    if (!isEditing) setDraft(String(value));
  }, [value, isEditing]);

  const commit = (): void => {
    setIsEditing(false);
    const isNumeric = type === 'number' || type === 'currency';
    if (isNumeric) {
      const parsed = Number(draft);
      if (Number.isNaN(parsed) || parsed < 0) return; // reject invalid input
      if (parsed !== value) onCommit(parsed);
    } else {
      const trimmed = draft.trim();
      if (trimmed.length > 0 && trimmed !== value) onCommit(trimmed);
    }
  };

  const cancel = (): void => {
    setDraft(String(value));
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        aria-label={ariaLabel}
        className="w-full rounded border border-accent-blue bg-white px-2 py-1 text-sm outline-none ring-2 ring-accent-blue/20"
        type={type === 'text' ? 'text' : 'number'}
        step={type === 'currency' ? '0.01' : '1'}
        min={type !== 'text' ? 0 : undefined}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commit();
          if (event.key === 'Escape') cancel();
        }}
      />
    );
  }

  return (
    <button
      type="button"
      aria-label={`Edit ${ariaLabel}`}
      onClick={() => {
        setDraft(String(value));
        setIsEditing(true);
      }}
      className={[
        'group flex w-full items-center rounded px-2 py-1 text-left text-sm',
        'hover:bg-accent-blue/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/40',
        edited ? 'border-l-2 border-amber-400 bg-amber-50/40' : '',
      ].join(' ')}
    >
      <span className="truncate">{display}</span>
    </button>
  );
}
