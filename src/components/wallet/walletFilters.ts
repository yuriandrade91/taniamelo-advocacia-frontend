import { defineFilters } from "@/components/ui/filters/filters";
import { toSelectOptions } from "@/components/ui/form/options";
import { BUCKET_FILTER_ORDER } from "@/components/payments/paymentBuckets";
import { ExpenseCategoryOptions } from "@/enums/expenseCategory/ExpenseCategory";
import { PaymentMethodOptions } from "@/enums/payment/Payment";
import { bucketLabel } from "./entryKind";
import type { WalletTab } from "./entryForms";

/**
 * Os filtros de cada aba da Carteira — cada uma guarda os seus.
 *
 * Sem "vence de/até": o período já é o mês do seletor no topo, e o resumo
 * soma esse mês; um segundo par de datas deixaria lista e resumo olhando
 * períodos diferentes. Status são os baldes da tela ("Pago" na saída,
 * "Recebido" na entrada), traduzidos por `bucketQuery`.
 */

/** Nos dois lados juntos, "pago" é pago numa saída e recebido numa entrada. */
const statusLabel = (tab: WalletTab, bucket: (typeof BUCKET_FILTER_ORDER)[number]) => {
  if (tab !== "all") return bucketLabel(tab, bucket);
  return bucket === "paid" ? "Pago ou recebido" : bucketLabel("expense", bucket);
};

const status = (tab: WalletTab) =>
  ({
    kind: "select",
    label: "Status",
    placeholder: "Todos",
    options: BUCKET_FILTER_ORDER.map((bucket) => ({ id: bucket, label: statusLabel(tab, bucket) })),
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

/** Os dois lados juntos: o que vale para os dois — busca, status e forma. Categoria é só de saída. */
export const allFilters = defineFilters({
  searchTerm: { kind: "search", label: "Pesquisar lançamento", placeholder: "Pesquisar descrição, fornecedor ou cliente…" },
  bucket: status("all"),
  paymentMethod: method,
});
