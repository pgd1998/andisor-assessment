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
 * Escape. Numeric types coerce and reject NaN. Committed numeric/currency values
 * render in the brand mono face with tabular figures so columns align; a brief
 * "save pulse" confirms a change landed. An amber marker flags unsaved edits.
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
  const [justSaved, setJustSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isNumeric = type === 'number' || type === 'currency';

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
    if (isNumeric) {
      const parsed = Number(draft);
      if (Number.isNaN(parsed) || parsed < 0) return; // reject invalid input
      if (parsed !== value) {
        onCommit(parsed);
        pulse();
      }
    } else {
      const trimmed = draft.trim();
      if (trimmed.length > 0 && trimmed !== value) {
        onCommit(trimmed);
        pulse();
      }
    }
  };

  const pulse = (): void => {
    setJustSaved(true);
    window.setTimeout(() => setJustSaved(false), 900);
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
        className={[
          'w-full rounded-md border border-accent-blue bg-white px-2 py-1 text-sm outline-none ring-2 ring-accent-blue/20',
          isNumeric ? 'font-mono tabular' : '',
        ].join(' ')}
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
        'group/cell flex w-full items-center gap-1 rounded-md px-2 py-1 text-left text-sm transition-colors',
        'hover:bg-accent-blue/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/40',
        edited ? 'bg-amber-50/60 ring-1 ring-inset ring-amber-300/60' : '',
        justSaved ? 'animate-save-pulse' : '',
      ].join(' ')}
    >
      <span className={['truncate', isNumeric ? 'font-mono tabular' : ''].join(' ')}>
        {display}
      </span>
      {/* Faint pencil that surfaces on hover to signal editability. */}
      <svg
        className="ml-auto h-3 w-3 shrink-0 text-accent-blue opacity-0 transition-opacity group-hover/cell:opacity-60"
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M13 4l3 3-8 8H5v-3l8-8z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
