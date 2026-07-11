import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { productsApi, type ListParams } from './client';
import type { PaginatedResponse, Product, ProductUpdate } from './types';

const productKeys = {
  all: ['products'] as const,
  list: (params: ListParams) => [...productKeys.all, 'list', params] as const,
};

/** Fetches a paginated page of products with their variant subtrees. */
export function useProducts(params: ListParams) {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: () => productsApi.list(params),
    // Keep the previous page visible while the next one loads (no flicker).
    placeholderData: (previous) => previous,
  });
}

export interface UpdateVariables {
  id: string;
  patch: ProductUpdate;
}

/**
 * Persists an inline edit. Optimistic: it patches the cached list immediately so
 * the UI feels instant, and rolls back if the request fails.
 */
export function useUpdateProduct(activeListParams: ListParams) {
  const queryClient = useQueryClient();
  const listKey = productKeys.list(activeListParams);

  return useMutation({
    mutationFn: ({ id, patch }: UpdateVariables) => productsApi.update(id, patch),
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<PaginatedResponse<Product>>(listKey);

      if (previous) {
        queryClient.setQueryData<PaginatedResponse<Product>>(listKey, {
          ...previous,
          data: previous.data.map((product) => patchNode(product, id, patch)),
        });
      }

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(listKey, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

/** Applies a patch to whichever node in a product tree matches the id. */
function patchNode(product: Product, id: string, patch: ProductUpdate): Product {
  if (product.id === id) return { ...product, ...patch };

  return {
    ...product,
    primaryVariants: product.primaryVariants.map((primary) => {
      if (primary.id === id) return { ...primary, ...patch };
      return {
        ...primary,
        secondaryVariants: primary.secondaryVariants.map((secondary) =>
          secondary.id === id ? { ...secondary, ...patch } : secondary,
        ),
      };
    }),
  };
}
