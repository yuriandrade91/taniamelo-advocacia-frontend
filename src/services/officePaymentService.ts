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
 * Recebimentos do escritório — visão consolidada.
 *
 * ⚠️ **O backend ainda não tem estas rotas.** Enquanto não tiver, as chamadas
 * respondem 404 e a tela mostra estado vazio. É deliberado: o contrato fica
 * escrito e tipado de um lado só, e o dia em que o Java subir a tela funciona
 * sem alteração. Ver `docs/ESPEC_FINANCEIRO.md`.
 *
 * `skipErrorToast` nas duas: enquanto a rota não existe, o 404 é esperado e um
 * toast vermelho a cada carregamento seria ruído, não informação. A tela
 * comunica o estado por conta própria.
 */

export const listOfficePayments = async (
  params?: OfficePaymentListRequest,
): Promise<ApiEnvelope<OfficePaymentResponse[]>> => {
  const { data } = await axiosInstance.get<ApiEnvelope<OfficePaymentResponse[]>>(
    endpoints.PAYMENTS.LIST,
    { params, skipErrorToast: true },
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
    { params, skipErrorToast: true },
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
    { params, skipErrorToast: true },
  );
  return data;
};
