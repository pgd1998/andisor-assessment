import type {
  ApiError,
  BulkImportAccepted,
  BulkImportStatus,
  PaginatedResponse,
  Product,
  ProductUpdate,
  SingleResponse,
} from './types';

// Base URL is injected at build time; defaults to the dev proxy path.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

/** Error thrown for non-2xx responses, carrying the parsed API error body. */
export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiError | null;
    throw new ApiRequestError(
      response.status,
      body?.error.code ?? 'UNKNOWN',
      body?.error.message ?? response.statusText,
    );
  }

  // 204 No Content has no body.
  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export interface ListParams {
  page: number;
  pageSize: number;
  search?: string;
  sort?: 'oldest' | 'newest';
}

export const productsApi = {
  list(params: ListParams): Promise<PaginatedResponse<Product>> {
    const query = new URLSearchParams({
      page: String(params.page),
      pageSize: String(params.pageSize),
      ...(params.search ? { search: params.search } : {}),
      ...(params.sort ? { sort: params.sort } : {}),
    });
    return request<PaginatedResponse<Product>>(`/products?${query.toString()}`);
  },

  get(id: string): Promise<SingleResponse<Product>> {
    return request<SingleResponse<Product>>(`/products/${id}`);
  },

  update(id: string, patch: ProductUpdate): Promise<SingleResponse<Product>> {
    return request<SingleResponse<Product>>(`/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },
};

export const bulkImportApi = {
  /** Uploads a JSON file of products; the API queues them and returns 202. */
  async upload(file: File): Promise<BulkImportAccepted> {
    const form = new FormData();
    form.append('file', file);
    // Note: no Content-Type header — the browser sets the multipart boundary.
    const response = await fetch(`${API_BASE_URL}/products/bulk-import`, {
      method: 'POST',
      body: form,
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as ApiError | null;
      throw new ApiRequestError(
        response.status,
        body?.error.code ?? 'UNKNOWN',
        body?.error.message ?? response.statusText,
      );
    }
    const json = (await response.json()) as SingleResponse<BulkImportAccepted>;
    return json.data;
  },

  /** Fetches the current status/progress of a bulk-import batch. */
  async status(batchId: string): Promise<BulkImportStatus> {
    const json = await request<SingleResponse<BulkImportStatus>>(
      `/products/bulk-import/${batchId}`,
    );
    return json.data;
  },
};
