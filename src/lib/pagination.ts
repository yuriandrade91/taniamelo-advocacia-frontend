/**
 * Helpers de paginação compartilhados.
 *
 * Estavam duplicados literalmente em `clientes/page.tsx` e em
 * `AppointmentsCard.tsx`. Como a paginação é server-side nas duas telas, a
 * lógica de janela é idêntica — e duas cópias significam corrigir bug duas
 * vezes.
 */

/** Marcador de intervalo omitido. Comparar por identidade, não por texto. */
export const ELLIPSIS = "…" as const;

export type PageEntry = number | typeof ELLIPSIS;

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

/** Linhas fantasma para o estado de carregamento de uma tabela. */
export const buildSkeletonRows = (count: number) =>
  Array.from({ length: count }, (_, i) => ({ id: `skeleton-${i}` }));
