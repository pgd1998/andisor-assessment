interface ToggleCellProps {
  checked: boolean;
  edited?: boolean;
  ariaLabel: string;
  onChange: (next: boolean) => void;
}

/**
 * Accessible on/off switch used for the "Published" (active) column. Renders as
 * a role="switch" button so keyboard and screen-reader users can toggle it.
 */
export function ToggleCell({
  checked,
  edited = false,
  ariaLabel,
  onChange,
}: ToggleCellProps): JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={[
        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/40',
        checked ? 'bg-accent-blue' : 'bg-surface-border',
        edited ? 'ring-2 ring-amber-300' : '',
      ].join(' ')}
    >
      <span
        className={[
          'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0.5',
        ].join(' ')}
      />
    </button>
  );
}
