import { useRef, useState } from 'react';

import type { BulkImportState } from './useBulkImport';

interface BulkImportModalProps {
  state: BulkImportState;
  onUpload: (file: File) => void;
  onClose: () => void;
}

/**
 * Modal for bulk-importing products from a JSON file.
 *
 * Flow: pick/drop a `.json` file → upload (202) → live progress polled from the
 * batch status → completion. On completion the product list has already been
 * refreshed by the hook, so closing reveals the imported rows.
 */
export function BulkImportModal({ state, onUpload, onClose }: BulkImportModalProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const busy = state.phase === 'uploading' || state.phase === 'processing';
  const total = state.status?.totalProducts ?? 0;
  const done = (state.status?.counts.completed ?? 0) + (state.status?.counts.failed ?? 0);
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  const pickFile = (selected: File | null): void => {
    if (selected && selected.name.endsWith('.json')) setFile(selected);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bulk import products"
      className="fixed inset-0 z-50 flex items-center justify-center bg-indigo-deep/40 p-4"
      onClick={busy ? undefined : onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-card"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-indigo">Bulk import products</h2>
          {!busy && (
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="rounded p-1 text-text-muted hover:bg-surface-sunken"
            >
              ✕
            </button>
          )}
        </div>

        {state.phase === 'completed' ? (
          <CompletedView state={state} onClose={onClose} />
        ) : state.phase === 'failed' ? (
          <FailedView message={state.error} onRetry={() => setFile(null)} onClose={onClose} />
        ) : busy ? (
          <ProgressView phase={state.phase} done={done} total={total} percent={percent} />
        ) : (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(event) => pickFile(event.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragOver(false);
                pickFile(event.dataTransfer.files?.[0] ?? null);
              }}
              className={[
                'flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-10 text-sm transition-colors',
                dragOver
                  ? 'border-accent-blue bg-accent-blue/5'
                  : 'border-surface-border hover:border-accent-blue/60',
              ].join(' ')}
            >
              <span className="text-2xl" aria-hidden="true">
                ⬆️
              </span>
              {file ? (
                <span className="font-medium text-indigo">{file.name}</span>
              ) : (
                <>
                  <span className="font-medium text-indigo">Choose a JSON file</span>
                  <span className="text-text-muted">or drag & drop it here</span>
                </>
              )}
            </button>

            <p className="mt-3 text-xs text-text-muted">
              A JSON array of products (same shape as the seed file). Processing is asynchronous —
              you can keep working while products are created.
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-surface-border px-4 py-2 text-sm font-medium text-indigo hover:bg-surface-sunken"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!file}
                onClick={() => file && onUpload(file)}
                className="rounded-lg bg-accent-blue px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Import
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ProgressView({
  phase,
  done,
  total,
  percent,
}: {
  phase: string;
  done: number;
  total: number;
  percent: number;
}): JSX.Element {
  return (
    <div className="py-4">
      <p className="mb-3 text-sm text-text-muted">
        {phase === 'uploading' ? 'Uploading & queueing…' : `Processing ${done} / ${total || '…'}`}
      </p>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
        <div
          className="h-full rounded-full bg-accent-blue transition-all"
          style={{ width: `${phase === 'uploading' ? 10 : Math.max(percent, 5)}%` }}
        />
      </div>
    </div>
  );
}

function CompletedView({
  state,
  onClose,
}: {
  state: BulkImportState;
  onClose: () => void;
}): JSX.Element {
  const total = state.status?.totalProducts ?? 0;
  const failed = state.status?.counts.failed ?? 0;
  return (
    <div className="py-2">
      <div className="mb-2 flex items-center gap-2 text-green-600">
        <span className="text-xl" aria-hidden="true">
          ✓
        </span>
        <p className="font-medium">Import complete</p>
      </div>
      <p className="text-sm text-text-muted">
        {total - failed} product{total - failed === 1 ? '' : 's'} created
        {failed > 0 ? `, ${failed} failed` : ''}. They now appear at the top of the list.
      </p>
      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-accent-blue px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          View products
        </button>
      </div>
    </div>
  );
}

function FailedView({
  message,
  onRetry,
  onClose,
}: {
  message: string | null;
  onRetry: () => void;
  onClose: () => void;
}): JSX.Element {
  return (
    <div className="py-2">
      <p className="font-medium text-coral-hover">Import failed</p>
      <p className="mt-1 text-sm text-text-muted">{message ?? 'Something went wrong.'}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-surface-border px-4 py-2 text-sm font-medium text-indigo hover:bg-surface-sunken"
        >
          Close
        </button>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-coral-hover"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
