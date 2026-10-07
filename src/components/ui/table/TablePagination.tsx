"use client";

import { Pagination } from "@heroui/react";
import {
  ELLIPSIS,
  buildPageList,
  clampPage,
  pageRange,
} from "@/lib/pagination";

/**
 * Paginação de tabela — resumo "1 a 10 de 42" à esquerda, páginas à direita.
 *
 * Saiu de Pagamentos quando a Carteira ganhou duas tabelas paginadas: três
 * cópias do mesmo bloco de 50 linhas eram três lugares para o rótulo ou o
 * limite de página divergir.
 *
 * Some com uma página só: "1 a 3 de 3" e um botão "1" sozinho não dizem nada
 * que a tabela já não mostre.
 */

export type TablePaginationProps = {
  pageNumber: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Singular e plural do que se conta: `["despesa", "despesas"]`. */
  noun: readonly [singular: string, plural: string];
};

export function TablePagination({
  pageNumber,
  pageSize,
  total,
  totalPages,
  onPageChange,
  noun,
}: TablePaginationProps) {
  if (totalPages <= 1) return null;

  const { start, end } = pageRange(pageNumber, pageSize, total);
  const goTo = (next: number) => onPageChange(clampPage(next, totalPages));

  return (
    <div className="mt-4 flex justify-end">
      <Pagination size="sm" className="text-gray-100">
        <Pagination.Summary className="text-sm text-gray-100">
          {`${start} a ${end} de ${total} ${total === 1 ? noun[0] : noun[1]}`}
        </Pagination.Summary>

        <Pagination.Content>
          <Pagination.Item>
            <Pagination.Previous
              className="text-sm text-gray-100"
              isDisabled={pageNumber <= 1}
              onPress={() => goTo(pageNumber - 1)}
            >
              <Pagination.PreviousIcon />
              Anterior
            </Pagination.Previous>
          </Pagination.Item>

          {buildPageList(pageNumber, totalPages).map((entry, index) =>
            entry === ELLIPSIS ? (
              <Pagination.Item key={`gap-${index}`}>
                <Pagination.Ellipsis className="text-sm text-gray-100" />
              </Pagination.Item>
            ) : (
              <Pagination.Item key={entry}>
                <Pagination.Link
                  isActive={entry === pageNumber}
                  onPress={() => goTo(entry)}
                  className={`text-sm ${
                    entry === pageNumber
                      ? "bg-gray-100 text-white"
                      : "text-gray-100"
                  }`}
                >
                  {entry}
                </Pagination.Link>
              </Pagination.Item>
            ),
          )}

          <Pagination.Item>
            <Pagination.Next
              className="text-sm text-gray-100"
              isDisabled={pageNumber >= totalPages}
              onPress={() => goTo(pageNumber + 1)}
            >
              Próxima
              <Pagination.NextIcon />
            </Pagination.Next>
          </Pagination.Item>
        </Pagination.Content>
      </Pagination>
    </div>
  );
}
