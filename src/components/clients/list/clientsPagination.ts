import type { ApiEnvelope } from "@/interfaces/Envelope.interface";

/** Paginação da listagem de clientes, como a página guarda. 1-based. */
export type ClientsPagination = {
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export const CLIENTS_PAGE_SIZE = 10;

export const INITIAL_CLIENTS_PAGINATION: ClientsPagination = {
  pageNumber: 1,
  pageSize: CLIENTS_PAGE_SIZE,
  totalRecords: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
};

const numberOr = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

/**
 * Funde a paginação do envelope com a anterior.
 *
 * Campo ausente ou que não é número fica com o valor anterior — um envelope
 * sem `totalPages` não pode zerar a paginação e fazer a tabela achar que não
 * há páginas. Sem `pagination` nenhum, a anterior volta intacta (o mesmo
 * objeto, para o React não renderizar à toa).
 */
export function paginationFromEnvelope(
  previous: ClientsPagination,
  envelope: Pick<ApiEnvelope<unknown>, "pagination">,
): ClientsPagination {
  const p = envelope.pagination;
  if (!p) return previous;
  return {
    pageNumber: numberOr(p.pageNumber, previous.pageNumber),
    pageSize: numberOr(p.pageSize, previous.pageSize),
    totalRecords: numberOr(p.totalRecords, previous.totalRecords),
    totalPages: numberOr(p.totalPages, previous.totalPages),
    hasNextPage: Boolean(p.hasNextPage),
    hasPreviousPage: Boolean(p.hasPreviousPage),
  };
}
