"use client";

import { Skeleton, Table } from "@heroui/react";
import { StatusBadge } from "@/components/ui/feedback/Badges";
import { BUCKET_BADGE, bucketOf } from "@/components/payments/paymentBuckets";
import { buildSkeletonRows } from "@/lib/pagination";
import { formatBRL, formatDateBR } from "@/lib/format";
import type { OfficeExpenseResponse } from "@/interfaces/finance/OfficeExpense.interface";

/**
 * Despesas do mês.
 *
 * Reaproveita `bucketOf`/`BUCKET_BADGE` de pagamentos: uma despesa também está
 * atrasada, a vencer, paga ou cancelada, e as regras são as mesmas. Duplicar a
 * classificação faria as duas telas divergirem no dia em que alguém corrigir
 * só uma.
 */

const COLUMNS = [
  { id: "description", name: "Descrição" },
  { id: "supplier", name: "Fornecedor" },
  { id: "category", name: "Categoria" },
  { id: "dueDate", name: "Vencimento" },
  { id: "paidDate", name: "Pagamento" },
  { id: "amount", name: "Valor" },
  { id: "status", name: "Status" },
];

const SKELETON_ROWS = buildSkeletonRows(6);

export type ExpensesTableProps = {
  items: OfficeExpenseResponse[];
  isLoading: boolean;
  emptyMessage: string;
};

export function ExpensesTable({
  items,
  isLoading,
  emptyMessage,
}: ExpensesTableProps) {
  return (
    <Table variant="secondary" className="text-gray-100">
      <Table.ScrollContainer className="rounded-2xl bg-white">
        <Table.Content
          aria-label="Despesas do escritório"
          className="min-w-[900px]"
        >
          <Table.Header columns={COLUMNS}>
            {(column) => (
              <Table.Column
                className="h-12 rounded-none border-b border-secondary/30 bg-white text-center text-xs tracking-wide text-secondary uppercase after:content-none"
                isRowHeader={column.id === "description"}
              >
                {column.name}
              </Table.Column>
            )}
          </Table.Header>

          {isLoading ? (
            <Table.Body items={SKELETON_ROWS}>
              {() => (
                <Table.Row>
                  <Table.Collection items={COLUMNS}>
                    {() => (
                      <Table.Cell>
                        <Skeleton className="h-4 w-full rounded-md" />
                      </Table.Cell>
                    )}
                  </Table.Collection>
                </Table.Row>
              )}
            </Table.Body>
          ) : (
            <Table.Body
              items={items}
              renderEmptyState={() => (
                <div className="px-6 py-14 text-center text-sm text-gray-100/70">
                  {emptyMessage}
                </div>
              )}
            >
              {(item: OfficeExpenseResponse) => {
                const badge = BUCKET_BADGE[bucketOf(item)];
                return (
                  <Table.Row>
                    <Table.Cell className="truncate text-primary">
                      {item.description}
                    </Table.Cell>
                    <Table.Cell className="truncate text-center">
                      {item.supplier ?? "—"}
                    </Table.Cell>
                    <Table.Cell className="truncate text-center">
                      {item.category ?? "—"}
                    </Table.Cell>
                    <Table.Cell className="text-center whitespace-nowrap">
                      {formatDateBR(item.dueDate)}
                    </Table.Cell>
                    <Table.Cell className="text-center whitespace-nowrap">
                      {formatDateBR(item.paidDate)}
                    </Table.Cell>
                    <Table.Cell className="text-right font-medium whitespace-nowrap text-primary tabular-nums">
                      {formatBRL(item.amount)}
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex justify-center">
                        <StatusBadge label={badge.label} tone={badge.tone} />
                      </div>
                    </Table.Cell>
                  </Table.Row>
                );
              }}
            </Table.Body>
          )}
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}
