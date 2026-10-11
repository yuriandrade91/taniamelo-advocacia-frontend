/**
 * Helpers de paginação compartilhados — a janela de páginas do
 * `TablePagination`, a página presa ao fim e o recorte de listas locais.
 */

import type { ApiEnvelope } from "@/interfaces/Envelope.interface";

/** Uma página de uma lista do servidor: as linhas e os totais da consulta inteira. */
export type ListPage<T> = { items: T[]; total: number; totalPages: number };

/** O envelope paginado da API (`pagination.totalRecords`, 1-based) como página de lista. */
export const pageFromEnvelope = <T,>(envelope: ApiEnvelope<T[]>): ListPage<T> => ({
  items: envelope.data ?? [],
  total: envelope.pagination?.totalRecords ?? 0,
  totalPages: envelope.pagination?.totalPages ?? 0,
});

/** Marcador de intervalo omitido. Comparar por identidade, não por texto. */
export const ELLIPSIS = "…" as const;

type PageEntry = number | typeof ELLIPSIS;

/**
 * Máximo de páginas exibidas sem reticências. Acima disso, mostramos primeira,
 * última e a vizinhança da atual.
 */
const MAX_PAGES_WITHOUT_ELLIPSIS = 7;

/**
 * Janela de páginas com reticências: `1 … 4 5 [6] 7 … 20`.
 *
 * Com paginação server-side `total` pode ser grande — renderizar um botão por
 * página estouraria a largura do rodapé.
 *
 * @param current Página atual (1-based).
 * @param total   Total de páginas.
 */
export function buildPageList(current: number, total: number): PageEntry[] {
  if (total <= MAX_PAGES_WITHOUT_ELLIPSIS) {
    return Array.from({ length: Math.max(0, total) }, (_, i) => i + 1);
  }

  const window = [1, total, current, current - 1, current + 1]
    .filter((page) => page >= 1 && page <= total)
    .sort((a, b) => a - b);

  const unique = Array.from(new Set(window));

  return unique.flatMap((page, index) =>
    index > 0 && page - unique[index - 1] > 1 ? [ELLIPSIS, page] : [page],
  );
}

/**
 * Índices do intervalo exibido ("11 a 20 de 47").
 * `start` é 0 quando não há registros — quem exibe decide o texto vazio.
 */
export function pageRange(
  pageNumber: number,
  pageSize: number,
  totalRecords: number,
): { start: number; end: number } {
  if (totalRecords <= 0) return { start: 0, end: 0 };
  return {
    start: (pageNumber - 1) * pageSize + 1,
    end: Math.min(pageNumber * pageSize, totalRecords),
  };
}

/** Mantém `page` dentro de `[1, totalPages]`. */
export function clampPage(page: number, totalPages: number): number {
  return Math.min(Math.max(1, page), Math.max(1, totalPages));
}

/** A fatia de uma página (1-based) de uma lista já carregada, com a página limitada ao total. */
export function slicePage<T>(list: readonly T[], page: number, size: number) {
  const totalPages = Math.max(1, Math.ceil(list.length / size));
  const current = clampPage(page, totalPages);
  return { current, totalPages, slice: list.slice((current - 1) * size, current * size) };
}
