"use client";

import { Skeleton, Table } from "@heroui/react";
import { StatusBadge } from "@/components/ui/feedback/Badges";
import { buildSkeletonRows } from "@/lib/pagination";
import { formatBRL, formatDateBR, formatInstallment } from "@/lib/format";
import type { OfficePaymentResponse } from "@/interfaces/payment/OfficePayment.interface";
import ActionButton from "@/components/ui/table/ActionButton";
import { BUCKET_BADGE, bucketOf } from "./paymentBuckets";

/** Recebimento só se registra no que está atrasado ou a vencer. */
const canRegister = (payment: OfficePaymentResponse): boolean => {
  const bucket = bucketOf(payment);
  return bucket === "overdue" || bucket === "upcoming";
};

function CheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/**
 * Tabela dos valores a receber do INSS, consolidada por cliente.
 *
 * Segue as decisões já apuradas na listagem de clientes, que não são óbvias e
 * custaram para achar:
 *
 * - `Table.Content` é a coleção do React Aria — sem ele as colunas renderizam
 *   "outside a collection";
 * - as utilities do Tailwind vencem o `.table__column` do HeroUI por **camada**
 *   (`utilities` vem depois de `components`), então `bg-white` e
 *   `rounded-none` desfazem o `variant="secondary"` sem `!important`;
 * - `after:content-none` remove a barra vertical, que é um `::after` da
 *   própria coluna;
 * - o divisor do cabeçalho vai nas COLUNAS, porque o `variant="secondary"`
 *   zera a borda do `Table.Header`.
 */

const COLUMNS = [
  { id: "clientName", name: "Cliente" },
  { id: "description", name: "Descrição" },
  { id: "installment", name: "Parcela" },
  { id: "dueDate", name: "Vencimento" },
  { id: "paidDate", name: "Pagamento" },
  { id: "paymentMethod", name: "Forma" },
  { id: "amount", name: "Valor" },
  { id: "status", name: "Status" },
  { id: "actions", name: "" },
];

const SKELETON_ROWS = buildSkeletonRows(8);

export type PaymentsTableProps = {
  items: OfficePaymentResponse[];
  isLoading: boolean;
  /** Mensagem do estado vazio — muda se é "sem resultado" ou "sem rota". */
  emptyMessage: string;
  /**
   * Registrar o recebimento de uma parcela. Sem o handler, a coluna de ação
   * some — a tabela continua servindo como visão somente-leitura.
   */
  onRegisterReceipt?: (payment: OfficePaymentResponse) => void;
};

export function PaymentsTable({
  items,
  isLoading,
  emptyMessage,
  onRegisterReceipt,
}: PaymentsTableProps) {
  /**
   * A coluna vazia do cabeçalho só faz sentido se houver ação. Filtrar aqui,
   * e não esconder com CSS, mantém o número de `<th>` igual ao de `<td>` — o
   * React Aria monta a linha pela coleção de colunas, e a divergência quebra
   * o alinhamento inteiro.
   */
  const columns = onRegisterReceipt
    ? COLUMNS
    : COLUMNS.filter((column) => column.id !== "actions");

  return (
    <Table variant="secondary" className="text-gray-100">
      <Table.ScrollContainer className="rounded-t-none rounded-b-2xl bg-white">
        <Table.Content
          aria-label="Valores a receber do INSS"
          className="min-w-[1000px]"
        >
          <Table.Header columns={columns}>
            {(column) => (
              <Table.Column
                className="h-12 rounded-none border-b border-secondary/30 bg-white text-center text-xs tracking-wide text-secondary uppercase after:content-none"
                isRowHeader={column.id === "clientName"}
              >
                {column.name}
              </Table.Column>
            )}
          </Table.Header>

          {isLoading ? (
            <Table.Body items={SKELETON_ROWS}>
              {() => (
                <Table.Row>
                  <Table.Collection items={columns}>
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
              {(item: OfficePaymentResponse) => {
                const badge = BUCKET_BADGE[bucketOf(item)];
                return (
                  <Table.Row>
                    <Table.Cell className="truncate text-primary">
                      {item.clientName}
                    </Table.Cell>
                    <Table.Cell className="truncate text-center">
                      {item.description}
                    </Table.Cell>
                    <Table.Cell className="text-center">
                      {formatInstallment(
                        item.installmentNumber,
                        item.installmentTotal,
                      )}
                    </Table.Cell>
                    <Table.Cell className="text-center whitespace-nowrap">
                      {formatDateBR(item.dueDate)}
                    </Table.Cell>
                    <Table.Cell className="text-center whitespace-nowrap">
                      {formatDateBR(item.paidDate)}
                    </Table.Cell>
                    <Table.Cell className="text-center">
                      {item.paymentMethod ?? "—"}
                    </Table.Cell>
                    {/* Valor com centavos e alinhado à direita: coluna de
                        dinheiro se confere de cima para baixo, e a vírgula
                        precisa cair na mesma posição. */}
                    <Table.Cell className="text-right font-medium whitespace-nowrap text-primary tabular-nums">
                      {item.amount === undefined ? "—" : formatBRL(item.amount)}
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex justify-center">
                        <StatusBadge label={badge.label} tone={badge.tone} />
                      </div>
                    </Table.Cell>
                    {onRegisterReceipt && (
                      <Table.Cell>
                        <div className="flex justify-center">
                          {/*
                            Só o que ainda não foi pago nem cancelado. Oferecer
                            "registrar recebimento" numa parcela já paga
                            convidaria a sobrescrever a data que está certa —
                            e o caixa do mês é somado por ela.
                          */}
                          {canRegister(item) ? (
                            <ActionButton
                              label="Registrar recebimento"
                              tone="success"
                              onClick={() => onRegisterReceipt(item)}
                            >
                              <CheckIcon />
                            </ActionButton>
                          ) : (
                            <span className="text-xs text-gray-100/40">—</span>
                          )}
                        </div>
                      </Table.Cell>
                    )}
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
