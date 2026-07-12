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
    <header className="sticky top-0 z-20 bg-gradient-header text-white shadow-raised">
      {/* Faint lavender glow bleeding from the right, echoing the brand site. */}
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            'radial-gradient(40rem 12rem at 90% -60%, rgba(211,124,233,0.35), transparent 70%)',
        }}
        aria-hidden="true"
      />
      <div className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-brand text-sm font-bold shadow-glow-coral"
            aria-hidden="true"
          >
            A
          </span>
          <span className="text-lg font-semibold tracking-tight">andisor</span>
          <span className="ml-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wider text-white/75">
            Inventory
          </span>
        </div>
        {/* Link to the live API docs — an honest, working destination. */}
        <a
          href="http://localhost:4000/docs"
          target="_blank"
          rel="noreferrer"
          className="hidden items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white/75 transition-colors hover:bg-white/10 hover:text-white sm:inline-flex"
        >
          API docs
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M7 13l6-6m0 0H8m5 0v5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
      </div>
    </header>
  );
}
