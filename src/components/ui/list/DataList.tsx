"use client";

import type { ReactNode } from "react";
import { RowSkeleton, SKELETON_ROW_COUNT } from "@/components/ui/feedback/Loading";

/**
 * Lista em linhas com colunas por schema — o desenho das listas da Carteira e
 * de Clientes num lugar só.
 *
 * - No `xl`, um cabeçalho preso ao topo dá nome às colunas e cada linha é uma
 *   grade com o mesmo `grid` (só alinham porque leem a mesma constante).
 * - Abaixo do `xl` não há cabeçalho: a coluna `lead` ocupa a linha inteira e
 *   cada outro campo leva o seu rótulo pequeno.
 * - Sem zebra; divisória entre linhas e realce no hover.
 *
 * `grid` precisa ser uma classe literal (`xl:grid-cols-[…]`): o Tailwind não
 * gera classe montada por interpolação.
 */
export type ListColumn<T> = {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  align?: "left" | "center";
  /** Quem é a linha: largura toda abaixo do `xl`, sem rótulo. */
  lead?: boolean;
  /** Classes da célula (colunas que ocupa abaixo do `xl`). */
  className?: string;
};

const HEADER_ALIGN = { left: "", center: "text-center" } as const;
const FIELD_LABEL =
  "text-[11px] font-medium tracking-wide whitespace-nowrap text-secondary uppercase xl:hidden";

export function DataList<T>({
  ariaLabel,
  items,
  columns,
  grid,
  rowKey,
  rowClassName,
  isLoading,
  empty,
}: {
  ariaLabel: string;
  items: readonly T[];
  columns: readonly ListColumn<T>[];
  grid: string;
  rowKey: (row: T, index: number) => string;
  rowClassName?: (row: T) => string;
  isLoading: boolean;
  /** Estado vazio (sem resultado, filtro ou falha). */
  empty: ReactNode;
}) {
  return (
    // `overflow-clip`, e não `hidden`: corta os cantos sem virar contêiner de
    // rolagem — senão o cabeçalho preso não prenderia.
    <section aria-label={ariaLabel} className="overflow-clip rounded-3xl bg-white ring-1 ring-black/5">
      {!isLoading && items.length === 0 ? (
        empty
      ) : (
        <>
          {/* Cabeçalho já na carga: a lista não salta quando as linhas chegam.
              `aria-hidden`: para leitor de tela cada campo já tem o seu rótulo. */}
          <div aria-hidden="true" className="sticky top-0 z-10 hidden bg-white p-2 pb-1 xl:block">
            <div className={`grid min-h-16 items-center gap-x-5 rounded-2xl bg-primary/5 px-4 py-3 ${grid}`}>
              {columns.map((column) => (
                <span
                  key={column.id}
                  className={`text-xs leading-tight font-semibold tracking-wide text-secondary uppercase ${HEADER_ALIGN[column.align ?? "left"]}`}
                >
                  {column.header}
                </span>
              ))}
            </div>
          </div>
          {isLoading ? (
            <ul role="status" aria-label={`Carregando ${ariaLabel.toLowerCase()}`}>
              {Array.from({ length: SKELETON_ROW_COUNT }, (_, i) => (
                <li key={i} className="border-b border-black/5 px-5 py-4 last:border-b-0 sm:px-6">
                  <RowSkeleton />
                </li>
              ))}
            </ul>
          ) : (
          <ul aria-label={ariaLabel}>
            {items.map((row, index) => (
              <li
                key={rowKey(row, index)}
                className={`${rowClassName?.(row) ?? ""} grid grid-cols-2 items-start gap-x-5 gap-y-3 border-b border-black/5 px-5 py-4 text-sm text-gray-100 transition-colors last:border-b-0 hover:bg-secondary/5 sm:grid-cols-3 sm:px-6 lg:grid-cols-6 xl:items-center ${grid}`}
              >
                {columns.map((column) =>
                  column.lead ? (
                    <div key={column.id} className="col-span-full flex min-w-0 items-center gap-3 self-center xl:col-span-1">
                      {column.cell(row)}
                    </div>
                  ) : (
                    <div key={column.id} className={`min-w-0 ${column.className ?? ""}`}>
                      <p className={FIELD_LABEL}>{column.header}</p>
                      <div className="mt-0.5 tabular-nums xl:mt-0">{column.cell(row)}</div>
                    </div>
                  ),
                )}
              </li>
            ))}
          </ul>
          )}
        </>
      )}
    </section>
  );
}

/** Estado vazio padrão das listas. */
export function ListEmpty({ children }: { children: ReactNode }) {
  return (
    <p className="m-5 rounded-2xl border border-dashed border-black/10 px-5 py-10 text-center text-sm text-gray-100/80">
      {children}
    </p>
  );
}
