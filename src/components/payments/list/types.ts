import type { ReactNode } from "react";
import type { FiltersState } from "@/hooks/useFilters";
import type { paymentFilters } from "../paymentFilters";
import type { Payment } from "../paymentDisplay";

/**
 * O que a página de Pagamentos entrega à grade de parcelas.
 *
 * Pagamentos = o que os **clientes** têm a receber do INSS (atrasados,
 * benefício, acordo), pela data prevista do crédito (`dueDate`). Não é caixa
 * do escritório — isso é a Carteira. A página é dona da carga, dos filtros, da
 * paginação e dos modais; a grade só desenha. A exceção é o cartão de
 * parcelas, que busca o acordo só quando abre (`installmentTrail.ts`).
 */

export type PaymentsLoadState = "loading" | "ready" | "missing-endpoint" | "error";

export type PaymentActions = {
  onView: (item: Payment) => void;
  onRegisterReceipt: (item: Payment) => void;
  onEdit: (item: Payment) => void;
  onDelete: (item: Payment) => void;
  /** Abre a ficha do cliente da parcela. */
  onViewClient: (item: Payment) => void;
};

export type PaymentsBoardProps = {
  /** A página atual da lista (12 por página). */
  items: Payment[];
  state: PaymentsLoadState;
  /** Texto pronto do estado vazio. */
  emptyMessage: string;
  filters: FiltersState<typeof paymentFilters>;
  /** Paginação pronta. */
  pagination: ReactNode;
  actions: PaymentActions;
};
