import { useQuery } from '@tanstack/react-query';

import { productsApi } from '../../api/client';
import type { Product } from '../../api/types';

export interface InventoryStats {
  totalProducts: number;
  totalUnits: number;
  publishedPct: number;
  outOfStock: number;
}

/**
 * Derives headline inventory metrics. Fetches products in a single large page
 * (the catalogue is small) so the summary reflects the whole catalogue, not just
 * the visible page. Kept separate from the paginated list query.
 */
export function useInventoryStats() {
  return useQuery({
    queryKey: ['products', 'stats'],
    queryFn: async (): Promise<InventoryStats> => {
      const { data, meta } = await productsApi.list({ page: 1, pageSize: 100, sort: 'newest' });
      return computeStats(data, meta.total);
    },
    staleTime: 15_000,
  });
}

function computeStats(products: Product[], total: number): InventoryStats {
  const totalUnits = products.reduce((sum, p) => sum + p.inventory, 0);
  const published = products.filter((p) => p.active).length;
  const outOfStock = products.filter((p) => p.inventory === 0).length;
  return {
    totalProducts: total,
    totalUnits,
    publishedPct: products.length ? Math.round((published / products.length) * 100) : 0,
    outOfStock,
  };
}
