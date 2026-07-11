import { beforeEach, describe, expect, it } from 'vitest';

import { applyEdits, useEditStore } from './editStore';

describe('useEditStore', () => {
  beforeEach(() => {
    useEditStore.getState().clearAll();
    sessionStorage.clear();
  });

  it('records field edits keyed by node id', () => {
    const { setEdit } = useEditStore.getState();
    setEdit('node-1', 'price', 42);
    setEdit('node-1', 'inventory', 7);
    setEdit('node-2', 'name', 'Renamed');

    const { edits } = useEditStore.getState();
    expect(edits['node-1']).toEqual({ price: 42, inventory: 7 });
    expect(edits['node-2']).toEqual({ name: 'Renamed' });
  });

  it('persists edits to sessionStorage so a refresh keeps them', () => {
    useEditStore.getState().setEdit('node-1', 'price', 99);

    const persisted = sessionStorage.getItem('andisor-inventory-edits');
    expect(persisted).toBeTruthy();
    expect(persisted).toContain('node-1');
    expect(persisted).toContain('99');
  });

  it('clears edits for a single node', () => {
    const { setEdit, clearNode } = useEditStore.getState();
    setEdit('node-1', 'price', 1);
    setEdit('node-2', 'price', 2);

    clearNode('node-1');
    const { edits } = useEditStore.getState();
    expect(edits['node-1']).toBeUndefined();
    expect(edits['node-2']).toEqual({ price: 2 });
  });

  it('applyEdits layers overrides over server values', () => {
    const server = { id: 'node-1', price: 10, name: 'Original' };
    const merged = applyEdits(server, { 'node-1': { price: 20 } });
    expect(merged).toEqual({ id: 'node-1', price: 20, name: 'Original' });
  });
});
