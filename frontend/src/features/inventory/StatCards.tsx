import { formatInteger } from '../../lib/format';
import type { InventoryStats } from './useInventoryStats';

interface StatCardsProps {
  stats: InventoryStats | undefined;
  isLoading: boolean;
}

/** Headline inventory metrics, shown as a KPI strip above the table. */
export function StatCards({ stats, isLoading }: StatCardsProps): JSX.Element {
  const cards = [
    {
      label: 'Products',
      value: stats ? formatInteger(stats.totalProducts) : '—',
      accent: 'from-brand-lavender/25 to-accent-blue/15',
      dot: 'bg-accent-blue',
    },
    {
      label: 'Units in stock',
      value: stats ? formatInteger(stats.totalUnits) : '—',
      accent: 'from-accent-blue/20 to-brand-purple/15',
      dot: 'bg-brand-purple',
    },
    {
      label: 'Published',
      value: stats ? `${stats.publishedPct}%` : '—',
      accent: 'from-stock-in/20 to-stock-in/5',
      dot: 'bg-stock-in',
    },
    {
      label: 'Out of stock',
      value: stats ? formatInteger(stats.outOfStock) : '—',
      accent: 'from-coral/20 to-coral/5',
      dot: 'bg-coral',
    },
  ];

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="relative overflow-hidden rounded-xl border border-surface-border bg-white p-4 shadow-card"
        >
          <div
            className={`pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${card.accent} blur-xl`}
            aria-hidden="true"
          />
          <div className="relative">
            <div className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${card.dot}`} aria-hidden="true" />
              <span className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
                {card.label}
              </span>
            </div>
            <p
              className={`mt-2 font-mono text-2xl font-medium tabular text-indigo ${
                isLoading ? 'animate-pulse text-text-muted/40' : ''
              }`}
            >
              {isLoading ? '···' : card.value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
