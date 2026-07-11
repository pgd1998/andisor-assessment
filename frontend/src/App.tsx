import { InventoryPage } from './features/inventory/InventoryPage';

/** Application shell: branded top bar + the inventory screen. */
export function App(): JSX.Element {
  return (
    <div className="min-h-full">
      <TopBar />
      <main>
        <InventoryPage />
      </main>
    </div>
  );
}

function TopBar(): JSX.Element {
  return (
    <header className="sticky top-0 z-10 border-b border-surface-border bg-indigo text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-lavender to-accent-blue text-sm font-bold"
            aria-hidden="true"
          >
            A
          </span>
          <span className="text-lg font-semibold tracking-tight">andisor</span>
          <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/80">
            Inventory
          </span>
        </div>
      </div>
    </header>
  );
}
