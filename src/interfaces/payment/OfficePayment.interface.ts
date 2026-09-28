import type { ClientPaymentResponse } from "@/interfaces/client/ClientSubResources.interface";
import type { PaymentMethodInput, PaymentStatusInput } from "@/enums/payment/Payment";

/**
 * Recebimentos do escritório — visão consolidada de `client_payments`.
 *
 * ⚠️ **Este contrato ainda não existe no backend.** Hoje pagamento só é
 * acessível por cliente (`/clients/{clientId}/payments`); não há rota agregada.
 * A alternativa — listar os clientes e pedir os pagamentos de cada um — seria
 * N+1 sobre HTTP (126 requisições para 125 clientes) e piora a cada cadastro
 * novo, então a tela é construída contra este contrato e mostra estado vazio
 * até ele subir.
 *
 * A especificação para implementar em Java está em
 * `docs/ESPEC_FINANCEIRO.md`.
 */

/** Uma linha da lista: o pagamento mais o cliente a que pertence. */
export interface OfficePaymentResponse extends ClientPaymentResponse {
  clientId: string;
  clientName: string;
}

/** Query params de `GET /api/v1/payments` (paginação 1-based, como o resto). */
export interface OfficePaymentListRequest {
  pageNumber?: number;
  pageSize?: number;
  /** Busca livre por nome do cliente ou descrição do pagamento. */
  searchTerm?: string;
  /** Chaves do enum (`PENDENTE`, `PAGO`, `CANCELADO`) — repetidas na query. */
  status?: PaymentStatusInput[];
  paymentMethod?: PaymentMethodInput[];
  /**
   * Recorte por **vencimento** (competência) — a pergunta "o que vence".
   * É o recorte da tela de Pagamentos.
   */
  dueFrom?: string;
  dueTo?: string;
  /**
   * Recorte por **data de pagamento** (caixa) — a pergunta "o que entrou".
   * É o recorte da Carteira. Somar recebimento por vencimento e chamar de
   * "entrou" conta dinheiro que ainda não chegou.
   */
  paidFrom?: string;
  paidTo?: string;
  clientId?: string;
}

/**
 * Totais de `GET /api/v1/payments/summary`.
 *
 * Vêm do servidor, e não de somar a página: a lista é paginada, então somar o
 * que está na tela daria o total de 10 linhas, não do período. Esse é o tipo
 * de erro que ninguém percebe até alguém conferir com a planilha.
 *
 * **Os três baldes são disjuntos** e cobrem todo pagamento não cancelado:
 *
 * | balde | regra |
 * |---|---|
 * | `overdue`  | status Pendente **e** vencimento < hoje |
 * | `upcoming` | status Pendente **e** vencimento ≥ hoje |
 * | `paid`     | status Pago |
 *
 * Cancelado fica fora dos três. `totalAmount` é a soma dos três — se algum dia
 * não fechar, é sinal de que a regra divergiu entre as duas pontas.
 */
export interface OfficePaymentSummary {
  overdueAmount: number;
  overdueCount: number;
  upcomingAmount: number;
  upcomingCount: number;
  paidAmount: number;
  paidCount: number;
  totalAmount: number;
}

/**
 * Um mês da linha do tempo — `GET /api/v1/payments/timeline`.
 *
 * A tela de Pagamentos mostra os totais de **um** período; a linha do tempo
 * mostra o pipeline atravessando os meses, que é informação que os
 * indicadores não carregam. Sem ela, o gráfico repetiria os três números que
 * já estão nos cards — e gráfico que repete indicador é ruído.
 */
export interface PaymentTimelinePoint {
  /** `yyyy-MM`. */
  month: string;
  overdueAmount: number;
  upcomingAmount: number;
  paidAmount: number;
}
