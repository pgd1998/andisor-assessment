import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import type { EditableField, ProductUpdate } from '../api/types';

/**
 * A map of node id → the fields edited locally for that node.
 * Layered on top of server data so the UI reflects unsaved/optimistic edits.
 */
type EditMap = Record<string, ProductUpdate>;

interface EditState {
  edits: EditMap;
  /** Record a single field edit for a node. */
  setEdit: (id: string, field: EditableField, value: string | number | boolean) => void;
  /** Clear all edits for a node (e.g. after a confirmed server save). */
  clearNode: (id: string) => void;
  /** Clear every local edit. */
  clearAll: () => void;
}

/**
 * Session-scoped edit store.
 *
 * Persisted to `sessionStorage` (not localStorage) so edits survive a refresh
 * but do not leak across browser sessions — matching the assessment's
 * "keep in the browser session so refresh will not lose edits" requirement.
 */
export const useEditStore = create<EditState>()(
  persist(
    (set) => ({
      edits: {},
      setEdit: (id, field, value) =>
        set((state) => ({
          edits: {
            ...state.edits,
            [id]: { ...state.edits[id], [field]: value },
          },
        })),
      clearNode: (id) =>
        set((state) => {
          const next = { ...state.edits };
          delete next[id];
          return { edits: next };
        }),
      clearAll: () => set({ edits: {} }),
    }),
    {
      name: 'andisor-inventory-edits',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);

/**
 * Merges a node's persisted edits over its server values, so consumers read a
 * single "effective" value per field.
 */
export function applyEdits<T extends { id: string }>(node: T, edits: EditMap): T {
  const override = edits[node.id];
  return override ? { ...node, ...override } : node;
}
