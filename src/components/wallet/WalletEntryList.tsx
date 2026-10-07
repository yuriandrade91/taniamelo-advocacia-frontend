"use client";

import { DataList, ListEmpty, type ListColumn } from "@/components/ui/list/DataList";
import {
  RowActions,
  deleteAction,
  editAction,
  viewAction,
  type RowAction,
} from "@/components/ui/table/RowActions";
import { ArrowDownIcon, ArrowUpIcon } from "@/components/ui/icons/glyphs";
import { bucketOf, type PaymentBucket } from "@/components/payments/paymentBuckets";
import type { EntryKind } from "@/components/wallet/entryForms";
import { BUCKET_DOT, KIND_META, bucketLabel } from "./entryKind";
import type { OfficeExpenseResponse } from "@/interfaces/finance/OfficeExpense.interface";
import type { OfficeRevenueResponse } from "@/interfaces/finance/OfficeRevenue.interface";
import { formatBRL, formatDateBR } from "@/lib/format";

/**
 * Lista de lançamentos da Carteira — o "Compilado · Cascata", escolhido entre
 * os modelos do estudo visual.
 *
 * - Uma coluna, 10 por página (a paginação é da página).
 * - **Todos os dados da tabela de antes**: descrição, fornecedor/cliente,
 *   categoria (só despesa), vencimento, pagamento/recebimento, valor, status
 *   e ações. No `xl` os nomes vêm uma vez, num cabeçalho preso ao topo;
 *   abaixo disso cada campo leva o seu rótulo.
 * - Do Cascata: a seta que sobe (entrada) ou desce (saída) e o valor com
 *   sinal. Texto das linhas sempre em `gray-100`; só o valor tem cor.
 * - Ações por schema (`RowActions`) com os nomes acessíveis de antes
 *   ("Editar despesa", "Excluir receita"…). Sem guarda extra no excluir:
 *   chegar aqui exige `podeVerFinanceiro` (ADMIN), o papel do `@RequerAdmin`.
 * - O desenho da lista é o `DataList`, o mesmo de Clientes.
 *
 * Reaproveita `bucketOf` de pagamentos: um lançamento também está atrasado,
 * previsto, pago ou cancelado, e a regra é a mesma. Duplicar a classificação
 * faria as duas telas divergirem no dia em que alguém corrigir só uma.
 */

// ── Lançamento normalizado ──

type EntryBase = {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  /** Fornecedor (despesa) ou cliente (receita). */
  party?: string;
  /** Só despesa tem categoria. */
  category?: string;
  bucket: PaymentBucket;
};

type WalletEntry =
  | (EntryBase & { kind: "entrada"; item: OfficeRevenueResponse })
  | (EntryBase & { kind: "saida"; item: OfficeExpenseResponse });

function fromRevenue(item: OfficeRevenueResponse): WalletEntry {
  return {
    kind: "entrada",
    item,
    id: item.id,
    description: item.description,
    amount: item.amount,
    dueDate: item.dueDate,
    paidDate: item.paidDate,
    // Receita sem cliente é normal: parecer avulso, reembolso. O traço diz
    // "não veio de cliente", não "faltou dado".
    party: item.clientName?.trim() || undefined,
    bucket: bucketOf(item),
  };
}

function fromExpense(item: OfficeExpenseResponse): WalletEntry {
  return {
    kind: "saida",
    item,
    id: item.id,
    description: item.description,
    amount: item.amount,
    dueDate: item.dueDate,
    paidDate: item.paidDate,
    party: item.supplier?.trim() || undefined,
    category: item.category,
    bucket: bucketOf(item),
  };
}

/** Selo de status: texto em `gray-100`, como o resto da linha; a cor fica no ponto. */
export function BucketChip({ kind, bucket }: { kind: EntryKind; bucket: PaymentBucket }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-2.5 py-0.5 text-[11px] font-medium text-gray-100 ring-1 ring-black/10">
      <span className={`h-1.5 w-1.5 rounded-full ${BUCKET_DOT[bucket]}`} />
      {bucketLabel(kind, bucket)}
    </span>
  );
}

// ── Lista ──

type Handlers<T> = {
  onView: (item: T) => void;
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
};

export type WalletEntryActions = {
  expense: Handlers<OfficeExpenseResponse>;
  revenue: Handlers<OfficeRevenueResponse>;
};

export type WalletEntryListProps = {
  isLoading: boolean;
  /** Texto pronto do estado vazio (sem resultado, filtro ou falha). */
  emptyMessage: string;
  actions: WalletEntryActions;
} & (
  | { kind: "saida"; items: OfficeExpenseResponse[] }
  | { kind: "entrada"; items: OfficeRevenueResponse[] }
);

/** Ver primeiro (olhar antes de mexer), excluir por último. */
function entryActions(kind: EntryKind, actions: WalletEntryActions): RowAction<WalletEntry>[] {
  const noun = KIND_META[kind].noun;
  const call = (pick: keyof Handlers<unknown>) => (entry: WalletEntry) =>
    entry.kind === "entrada" ? actions.revenue[pick](entry.item) : actions.expense[pick](entry.item);
  return [
    viewAction(`Ver detalhes da ${noun}`, call("onView")),
    editAction(`Editar ${noun}`, call("onEdit")),
    deleteAction(`Excluir ${noun}`, call("onDelete")),
  ];
}

/**
 * Colunas no `xl` (receita não tem categoria: uma coluna a menos). As classes
 * do grid são literais — ver `DataList`.
 */
const GRID: Record<EntryKind, string> = {
  saida: "xl:grid-cols-[minmax(14rem,1.6fr)_minmax(8rem,1fr)_minmax(8rem,1fr)_6.5rem_6.5rem_8.5rem_7.5rem_7rem]",
  entrada: "xl:grid-cols-[minmax(14rem,1.8fr)_minmax(10rem,1.2fr)_6.5rem_6.5rem_8.5rem_7.5rem_7rem]",
};

const text = (value?: string) => (
  <span className="block truncate" title={value}>
    {value ?? "—"}
  </span>
);

function columnsOf(kind: EntryKind, actions: WalletEntryActions): ListColumn<WalletEntry>[] {
  const meta = KIND_META[kind];
  const rowActions = entryActions(kind, actions);
  const up = kind === "entrada";
  return [
    {
      id: "description",
      header: "Descrição",
      align: "center",
      lead: true,
      cell: (entry) => (
        <>
          <span
            aria-hidden="true"
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
              up ? "bg-success/15 text-emerald-700" : "bg-rose-500/10 text-rose-500"
            }`}
          >
            {up ? <ArrowUpIcon className="h-4 w-4" /> : <ArrowDownIcon className="h-4 w-4" />}
          </span>
          {/* Cancelado: só a descrição riscada. */}
          <p
            title={entry.description}
            className={`min-w-0 truncate font-medium text-gray-100 ${entry.bucket === "cancelled" ? "line-through" : ""}`}
          >
            {entry.description}
          </p>
        </>
      ),
    },
    { id: "party", header: meta.partyLabel, cell: (entry) => text(entry.party) },
    ...(kind === "saida"
      ? [{ id: "category", header: "Categoria", cell: (entry: WalletEntry) => text(entry.category) }]
      : []),
    { id: "dueDate", header: "Vencimento", cell: (entry) => formatDateBR(entry.dueDate) },
    { id: "paidDate", header: meta.paidDateLabel, cell: (entry) => formatDateBR(entry.paidDate) },
    {
      id: "amount",
      header: "Valor",
      align: "center",
      className: "xl:text-center",
      cell: (entry) => (
        <span className={`font-semibold whitespace-nowrap ${up ? "text-emerald-700" : "text-rose-500"}`}>
          {up ? "+" : "−"}
          {formatBRL(entry.amount)}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      align: "center",
      className: "xl:text-center",
      cell: (entry) => <BucketChip kind={entry.kind} bucket={entry.bucket} />,
    },
    {
      id: "actions",
      header: "Ações",
      align: "center",
      cell: (entry) => <RowActions row={entry} actions={rowActions} className="xl:justify-center" />,
    },
  ];
}

/**
 * Linha cancelada: cinza e apagada em tudo, menos no status e nas ações (as
 * duas últimas células), que seguem com a aparência de sempre.
 */
const CANCELLED_ROW =
  "[&>*:not(:nth-last-child(-n+2))]:opacity-60 [&>*:not(:nth-last-child(-n+2))]:grayscale";

export function WalletEntryList(props: WalletEntryListProps) {
  const { kind, isLoading, emptyMessage, actions } = props;
  const entries = props.kind === "saida" ? props.items.map(fromExpense) : props.items.map(fromRevenue);
  return (
    <DataList
      ariaLabel={KIND_META[kind].label}
      items={entries}
      columns={columnsOf(kind, actions)}
      grid={GRID[kind]}
      rowKey={(entry) => entry.id}
      rowClassName={(entry) => (entry.bucket === "cancelled" ? CANCELLED_ROW : "")}
      isLoading={isLoading}
      empty={<ListEmpty>{emptyMessage}</ListEmpty>}
    />
  );
}
