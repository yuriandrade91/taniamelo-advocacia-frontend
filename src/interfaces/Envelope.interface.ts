export interface PaginationInfo {
  pageNumber?: number;
  pageSize?: number;
  totalRecords?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}

/**
 * Item do array `errors` do envelope da API.
 * O backend serializa os três campos sempre presentes, mas `null` quando não
 * se aplicam (ex.: `field: null` num erro que não é de um campo específico).
 */
export interface ApiErrorItem {
  field?: string | null;
  message?: string | null;
  code?: string | null;
}

export interface ApiEnvelope<T> {
  data?: T;
  pagination?: PaginationInfo | null;
  success?: boolean;
  errors?: ApiErrorItem[];
  message?: string;
}

export default ApiEnvelope;
