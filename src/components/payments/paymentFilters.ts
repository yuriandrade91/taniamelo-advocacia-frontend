import { defineFilters } from "@/components/ui/filters/filters";
import { PaymentMethodOptions } from "@/enums/payment/Payment";
import { toSelectOptions } from "@/components/ui/form/options";
import { BUCKET_BADGE, BUCKET_FILTER_ORDER } from "./paymentBuckets";

/**
 * Os filtros de Pagamentos.
 *
 * Status são os baldes da tela (Atrasado, Previsto, Recebido, Cancelado), não
 * o enum do banco: quem quer "os previstos" não tinha como pedir com
 * Pendente/Pago/Cancelado. `bucketQuery` traduz para o que a API entende, um
 * balde por vez. O período é livre ("vence de/até"), diferente da Carteira,
 * onde ele é o mês do topo.
 */
export const paymentFilters = defineFilters({
  searchTerm: {
    kind: "search",
    label: "Pesquisar recebimento",
    placeholder: "Pesquisar cliente ou descrição…",
  },
  bucket: {
    kind: "select",
    label: "Status",
    placeholder: "Todos",
    options: BUCKET_FILTER_ORDER.map((bucket) => ({ id: bucket, label: BUCKET_BADGE[bucket].label })),
  },
  period: { kind: "dateRange", label: "Período" },
  paymentMethod: {
    kind: "multi",
    label: "Forma",
    placeholder: "Todas",
    options: toSelectOptions(PaymentMethodOptions),
  },
});

