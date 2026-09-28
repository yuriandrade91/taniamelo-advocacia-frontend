import endpoints from "@/constants/endpoints/paths";
import axiosInstance from "@/services/axiosService";
import type { ApiEnvelope } from "@/interfaces/Envelope.interface";
import type { OfficeRevenueRequest } from "@/interfaces/finance/OfficeRevenue.interface";

/**
 * Receita do escritório — honorários.
 *
 * ⚠️ **Nada disto existe no backend**: nem rota, nem tabela. É o outro metade
 * do domínio `financial` do ADR-0003, ao lado das despesas.
 *
 * Existe como serviço separado porque a alternativa era pior: reaproveitar
 * `clientPaymentService` faria o honorário ser gravado em `client_payments`,
 * que guarda o que o **INSS paga ao cliente**. Os dois têm o mesmo formato —
 * valor, vencimento, data de pagamento — e nada na tabela os distinguiria
 * depois. A tela de Pagamentos passaria a somar honorário como benefício do
 * cliente, e ninguém teria como desconfiar olhando os números.
 *
 * A escrita **não** silencia erro: quem tentar lançar precisa saber que não
 * foi.
 */
export const createOfficeRevenue = async (
  body: OfficeRevenueRequest,
): Promise<ApiEnvelope<unknown>> => {
  const { data } = await axiosInstance.post<ApiEnvelope<unknown>>(
    endpoints.REVENUES.CREATE,
    body,
    { successMessage: "Receita lançada." },
  );
  return data;
};
