import type {
  PaymentMethodInput,
  PaymentMethodLabel,
  PaymentStatusInput,
  PaymentStatusLabel,
} from "@/enums/payment/Payment";
import type {
  FinancePeriodFilter,
  FinanceSummary,
  FinanceTimelinePoint,
} from "@/interfaces/finance/Finance.interface";

/**
 * Receita do escritório — honorário, parecer avulso, reembolso.
 *
 * Atende `GET/POST/PUT/DELETE /api/v1/revenues` (`OfficeRevenueController`,
 * tabela `office_revenues`, migration V18).
 *
 * ## Por que não reaproveita `ClientPaymentRequest`
 *
 * O formato é quase igual — e é justamente o problema. `client_payments`
 * guarda o que o INSS paga ao cliente; honorário é o que o cliente paga ao
 * escritório. Com um tipo só, nada impediria gravar um no outro, e depois não
 * haveria como separar: as colunas são as mesmas.
 *
 * ## O que este contrato ainda não resolve
 *
 * Como o honorário é **contratado** varia — percentual do êxito sobre os
 * atrasados, valor fixo parcelado, e outros arranjos. Isso é um modelo de
 * contrato, com regra própria, que gera estas receitas. Este tipo descreve a
 * receita já apurada, não o contrato que a origina; `clientId` e
 * `sourcePaymentId` existem para amarrar as duas coisas quando o contrato
 * existir.
 */
export interface OfficeRevenueRequest {
  description: string;
  amount: number;
  /** "yyyy-MM-dd". */
  dueDate: string;
  paidDate?: string;
  /** Omitido, nasce Pendente. Enviar "Pago" sem `paidDate` assume hoje no servidor. */
  status?: PaymentStatusInput;
  paymentMethod?: PaymentMethodInput;
  /** Cliente de quem veio o honorário. Opcional: nem toda receita é de cliente. */
  clientId?: string;
  /**
   * Quando o honorário é percentual do êxito, o `client_payments` de onde ele
   * saiu. É o que permite conferir "30% dos atrasados" contra o valor de fato.
   */
  sourcePaymentId?: string;
  notes?: string;
}

export interface OfficeRevenueResponse {
  id: string;
  description: string;
  amount: number;
  /** Labels (@JsonValue), como no resto da API. */
  status?: PaymentStatusLabel;
  paymentMethod?: PaymentMethodLabel;
  dueDate: string;
  paidDate?: string;
  /** Calculado no servidor a cada leitura, nunca persistido. */
  overdue: boolean;
  clientId?: string;
  /**
   * Desnormalizado, como em `PaymentListItem`: sem ele a tabela precisaria de
   * uma consulta por linha só para mostrar de quem veio o dinheiro.
   */
  clientName?: string;
  sourcePaymentId?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OfficeRevenueListRequest extends FinancePeriodFilter {
  pageNumber?: number;
  pageSize?: number;
  searchTerm?: string;
  status?: PaymentStatusInput[];
  paymentMethod?: PaymentMethodInput[];
  /** Todas as receitas vindas de um cliente. */
  clientId?: string;
}

/**
 * Totais do período. Sem `byCategory`: categoria é coisa de despesa — receita
 * de escritório de advocacia se classifica por cliente e por origem, não por
 * rubrica de custo.
 */
export type OfficeRevenueSummary = FinanceSummary;

/** Um mês da linha do tempo de receitas — `GET /api/v1/revenues/timeline`. */
export type RevenueTimelinePoint = FinanceTimelinePoint;
