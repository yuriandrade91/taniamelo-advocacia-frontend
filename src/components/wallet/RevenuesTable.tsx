"use client";

import { Skeleton, Table } from "@heroui/react";
import { StatusBadge } from "@/components/ui/feedback/Badges";
import { bucketOf, type PaymentBucket } from "@/components/payments/paymentBuckets";
import type { BadgeTone } from "@/components/ui/feedback/Badges";
import ActionButton from "@/components/ui/table/ActionButton";
import { PencilIcon, TrashIcon } from "@/components/ui/icons/actions";
import { buildSkeletonRows } from "@/lib/pagination";
import { formatBRL, formatDateBR } from "@/lib/format";
import type { OfficeRevenueResponse } from "@/interfaces/finance/OfficeRevenue.interface";

/**
 * Receitas do mês — a contraparte de `ExpensesTable`.
 *
 * Reaproveita `bucketOf` de pagamentos: uma receita também está atrasada, a
 * vencer, paga ou cancelada, e a regra é a mesma. O que **não** reaproveita é
 * o rótulo: em pagamentos, "Recebido" significa que o cliente recebeu do INSS;
 * aqui significa que o dinheiro entrou no caixa do escritório. Mesmo estado,
 * dono diferente — por isso a tabela tem o seu próprio mapa de selos.
 */

const BADGE: Record<PaymentBucket, { label: string; tone: BadgeTone }> = {
  overdue: { label: "Atrasado", tone: "danger" },
  upcoming: { label: "Previsto", tone: "neutral" },
  paid: { label: "Recebido", tone: "success" },
  cancelled: { label: "Cancelado", tone: "neutral" },
};

const COLUMNS = [
  { id: "description", name: "Descrição" },
  { id: "clientName", name: "Cliente" },
  { id: "dueDate", name: "Vencimento" },
  { id: "paidDate", name: "Recebimento" },
  { id: "amount", name: "Valor" },
  { id: "status", name: "Status" },
  { id: "actions", name: "Ações" },
];

const SKELETON_ROWS = buildSkeletonRows(6);

export type RevenuesTableProps = {
  items: OfficeRevenueResponse[];
  isLoading: boolean;
  emptyMessage: string;
  onEdit: (item: OfficeRevenueResponse) => void;
  /**
   * Ausente, o botão de excluir não aparece na linha. É como a tela esconde a exclusão
   * de quem o backend recusaria — sem prometer um botão que responde 403.
   */
  onDelete?: (item: OfficeRevenueResponse) => void;
};

export function RevenuesTable({
  items,
  isLoading,
  emptyMessage,
  onEdit,
  onDelete,
}: RevenuesTableProps) {
  return (
    <Table variant="secondary" className="text-gray-100">
      <Table.ScrollContainer className="rounded-2xl bg-white">
        <Table.Content
          aria-label="Receitas do escritório"
          className="min-w-[800px]"
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
              {(item: OfficeRevenueResponse) => {
                const badge = BADGE[bucketOf(item)];
                return (
                  <Table.Row>
                    <Table.Cell className="truncate text-primary">
                      {item.description}
                    </Table.Cell>
                    {/* Receita sem cliente é normal: parecer avulso, reembolso.
                        O traço diz "não veio de cliente", não "faltou dado". */}
                    <Table.Cell className="truncate text-center">
                      {item.clientName ?? "—"}
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
                    <Table.Cell>
                      <span className="flex items-center justify-end gap-1">
                        <ActionButton
                          label="Editar receita"
                          tone="secondary"
                          onClick={() => onEdit(item)}
                        >
                          <PencilIcon />
                        </ActionButton>
                        {onDelete && (
                          <ActionButton
                            label="Excluir receita"
                            tone="danger"
                            onClick={() => onDelete(item)}
                          >
                            <TrashIcon />
                          </ActionButton>
                        )}
                      </span>
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
