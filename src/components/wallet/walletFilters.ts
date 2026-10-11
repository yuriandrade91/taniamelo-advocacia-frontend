import { defineFilters } from "@/components/ui/filters/filters";
import { toSelectOptions } from "@/components/ui/form/options";
import { BUCKET_FILTER_ORDER } from "@/components/payments/paymentBuckets";
import { ExpenseCategoryOptions } from "@/enums/expenseCategory/ExpenseCategory";
import { PaymentMethodOptions } from "@/enums/payment/Payment";
import { bucketLabel } from "./entryKind";
import type { EntryKind } from "./entryForms";

/**
 * Os filtros de cada aba da Carteira — cada uma guarda os seus.
 *
 * Sem "vence de/até": o período já é o mês do seletor no topo, e o resumo
 * soma esse mês; um segundo par de datas deixaria lista e resumo olhando
 * períodos diferentes. Status são os baldes da tela ("Pago" na saída,
 * "Recebido" na entrada), traduzidos por `bucketQuery`.
 */

const status = (kind: EntryKind) =>
  ({
    kind: "select",
    label: "Status",
    placeholder: "Todos",
    options: BUCKET_FILTER_ORDER.map((bucket) => ({ id: bucket, label: bucketLabel(kind, bucket) })),
  }) as const;

const method = {
  kind: "multi",
  label: "Forma",
  placeholder: "Todas",
  options: toSelectOptions(PaymentMethodOptions),
} as const;

/** Saídas: a busca olha descrição e fornecedor; só despesa tem categoria. */
export const expenseFilters = defineFilters({
  searchTerm: { kind: "search", label: "Pesquisar lançamento", placeholder: "Pesquisar descrição ou fornecedor…" },
  bucket: status("expense"),
  category: {
    kind: "multi",
    label: "Categoria",
    placeholder: "Todas",
    options: toSelectOptions(ExpenseCategoryOptions),
  },
  paymentMethod: method,
});

/** Entradas: a busca olha descrição e cliente. */
export const revenueFilters = defineFilters({
  searchTerm: { kind: "search", label: "Pesquisar lançamento", placeholder: "Pesquisar descrição ou cliente…" },
  bucket: status("income"),
  paymentMethod: method,
});
