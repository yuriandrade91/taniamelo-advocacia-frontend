import endpoints from "@/constants/endpoints/paths";
import axiosInstance from "@/services/axiosService";
import type { ApiEnvelope } from "@/interfaces/Envelope.interface";
import type {
  OfficeRevenueListRequest,
  OfficeRevenueRequest,
  OfficeRevenueResponse,
  OfficeRevenueSummary,
  RevenueTimelinePoint,
} from "@/interfaces/finance/OfficeRevenue.interface";

/**
 * Receita do escritório — honorário, parecer avulso, reembolso.
 *
 * Existe como serviço separado de `clientPaymentService` porque a alternativa
 * era pior: reaproveitá-lo faria o honorário ser gravado em `client_payments`,
 * que guarda o que o **INSS paga ao cliente**. Os dois têm o mesmo formato —
 * valor, vencimento, data de pagamento — e nada na tabela os distinguiria
 * depois. A tela de Pagamentos passaria a somar honorário como benefício do
 * cliente, e ninguém teria como desconfiar olhando os números.
 *
 * Todas as rotas são ADMIN (`@RequerAdmin`): o 403 aqui é a regra funcionando,
 * não defeito, e é a tela que decide se mostra a área.
 */

export const listOfficeRevenues = async (
  params?: OfficeRevenueListRequest,
): Promise<ApiEnvelope<OfficeRevenueResponse[]>> => {
  const { data } = await axiosInstance.get<ApiEnvelope<OfficeRevenueResponse[]>>(
    endpoints.REVENUES.LIST,
    { params },
  );
  return data;
};

export const getOfficeRevenue = async (
  revenueId: string,
): Promise<ApiEnvelope<OfficeRevenueResponse>> => {
  const { data } = await axiosInstance.get<ApiEnvelope<OfficeRevenueResponse>>(
    endpoints.REVENUES.BY_ID(revenueId),
  );
  return data;
};

/**
 * Totais do período.
 *
 * Existe em vez de somar a lista porque a lista é paginada: somar a página
 * daria o total de 10 linhas, não do período — e o número pareceria certo.
 */
export const getOfficeRevenueSummary = async (
  params?: Pick<
    OfficeRevenueListRequest,
    "dueFrom" | "dueTo" | "paidFrom" | "paidTo" | "clientId"
  >,
): Promise<ApiEnvelope<OfficeRevenueSummary>> => {
  const { data } = await axiosInstance.get<ApiEnvelope<OfficeRevenueSummary>>(
    endpoints.REVENUES.SUMMARY,
    { params },
  );
  return data;
};

/** Série mensal das receitas — mesmo contrato do lado das despesas. */
export const getOfficeRevenueTimeline = async (params: {
  from: string;
  to: string;
  basis?: "due" | "paid";
}): Promise<ApiEnvelope<RevenueTimelinePoint[]>> => {
  const { data } = await axiosInstance.get<ApiEnvelope<RevenueTimelinePoint[]>>(
    endpoints.REVENUES.TIMELINE,
    { params },
  );
  return data;
};

export const createOfficeRevenue = async (
  body: OfficeRevenueRequest,
): Promise<ApiEnvelope<OfficeRevenueResponse>> => {
  const { data } = await axiosInstance.post<ApiEnvelope<OfficeRevenueResponse>>(
    endpoints.REVENUES.CREATE,
    body,
    { successMessage: "Receita lançada." },
  );
  return data;
};

export const updateOfficeRevenue = async (
  revenueId: string,
  body: OfficeRevenueRequest,
): Promise<ApiEnvelope<OfficeRevenueResponse>> => {
  const { data } = await axiosInstance.put<ApiEnvelope<OfficeRevenueResponse>>(
    endpoints.REVENUES.UPDATE(revenueId),
    body,
    { successMessage: "Receita atualizada." },
  );
  return data;
};

export const deleteOfficeRevenue = async (revenueId: string): Promise<void> => {
  await axiosInstance.delete(endpoints.REVENUES.DELETE(revenueId), {
    successMessage: "Receita excluída.",
  });
};
