import { useEffect } from 'react';

interface ToastProps {
  message: string;
  onDismiss: () => void;
  /** Auto-dismiss delay in ms. */
  duration?: number;
}

/** A small, auto-dismissing success toast anchored to the bottom-right. */
export function Toast({ message, onDismiss, duration = 4000 }: ToastProps): JSX.Element {
  useEffect(() => {
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [onDismiss, duration]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg bg-indigo px-4 py-3 text-sm text-white shadow-card"
    >
      <span className="text-green-400" aria-hidden="true">
        ✓
      </span>
      <span>{message}</span>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onDismiss}
        className="ml-1 text-white/60 hover:text-white"
      >
        ✕
      </button>
    </div>
  );
}
