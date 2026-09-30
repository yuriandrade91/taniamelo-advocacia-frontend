import endpoints from "@/constants/endpoints/paths";
import axiosInstance from "@/services/axiosService";
import {
  leituraPendente,
  listaVaziaPendente,
  serieVaziaPendente,
} from "@/services/integracaoPendente";
import type { ApiEnvelope } from "@/interfaces/Envelope.interface";
import type {
  OfficePaymentListRequest,
  OfficePaymentResponse,
  OfficePaymentSummary,
  PaymentTimelinePoint,
} from "@/interfaces/payment/OfficePayment.interface";

/**
 * O que os clientes têm a receber do INSS, visto pelo escritório —
 * `PaymentController`, somente leitura.
 *
 * **Não é faturamento.** São atrasados da concessão, benefício, parcela de
 * acordo: dinheiro do cliente, que não passa pelo caixa. A receita do
 * escritório é `officeRevenueService`. Somar um como se fosse o outro já fez a
 * Carteira mostrar saldo plausível, positivo e falso.
 *
 * Criar e editar continuam em `clientPaymentService`: uma parcela pertence a
 * um cliente, e esta rota é consulta.
 *
 * ## O `return` antes do código de verdade
 *
 * Cada função abre com um atalho de `integracaoPendente` e o código real fica
 * logo abaixo, inalcançável. É deliberado: a chamada não sai para a rede
 * enquanto a rota não está no ar, e religar é apagar **duas linhas** — sem
 * reescrever nada e sem que ninguém precise lembrar como a função era.
 */

export const listOfficePayments = async (
  params?: OfficePaymentListRequest,
): Promise<ApiEnvelope<OfficePaymentResponse[]>> => {
  // INTEGRAÇÃO PENDENTE — apague esta linha quando a rota subir.
  return listaVaziaPendente();
  const { data } = await axiosInstance.get<ApiEnvelope<OfficePaymentResponse[]>>(
    endpoints.PAYMENTS.LIST,
    { params },
  );
  return data;
};

export const getOfficePaymentSummary = async (
  /**
   * Aceita os dois recortes: por vencimento (competência, usado em
   * Pagamentos) ou por data de pagamento (caixa, usado na Carteira). Quem
   * chama escolhe a pergunta que está fazendo.
   */
  params?: Pick<
    OfficePaymentListRequest,
    "dueFrom" | "dueTo" | "paidFrom" | "paidTo" | "clientId"
  >,
): Promise<ApiEnvelope<OfficePaymentSummary>> => {
  // INTEGRAÇÃO PENDENTE — apague esta linha quando a rota subir.
  return leituraPendente("GET /api/v1/payments/summary");
  const { data } = await axiosInstance.get<ApiEnvelope<OfficePaymentSummary>>(
    endpoints.PAYMENTS.SUMMARY,
    { params },
  );
  return data;
};

/**
 * Série mensal para o gráfico. `basis` escolhe a pergunta: `due` (competência,
 * "o que vence em cada mês") ou `paid` (caixa, "o que entrou em cada mês").
 */
export const getOfficePaymentTimeline = async (params: {
  from: string;
  to: string;
  basis?: "due" | "paid";
}): Promise<ApiEnvelope<PaymentTimelinePoint[]>> => {
  // INTEGRAÇÃO PENDENTE — apague esta linha quando a rota subir.
  return serieVaziaPendente();
  const { data } = await axiosInstance.get<ApiEnvelope<PaymentTimelinePoint[]>>(
    endpoints.PAYMENTS.TIMELINE,
    { params },
  );
  return data;
};
