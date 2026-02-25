export interface PaginationInfo {
  pageNumber?: number;
  pageSize?: number;
  totalRecords?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}

export interface ApiEnvelope<T> {
  data?: T;
  pagination?: PaginationInfo | null;
  success?: boolean;
  errors?: unknown;
  message?: string;
}

export default ApiEnvelope;
