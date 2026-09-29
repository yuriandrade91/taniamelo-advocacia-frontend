import endpoints from "@/constants/endpoints/paths";
import axiosInstance from "@/services/axiosService";
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
 */

export const listOfficePayments = async (
  params?: OfficePaymentListRequest,
): Promise<ApiEnvelope<OfficePaymentResponse[]>> => {
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
  const { data } = await axiosInstance.get<ApiEnvelope<PaymentTimelinePoint[]>>(
    endpoints.PAYMENTS.TIMELINE,
    { params },
  );
  return data;
};
