import endpoints from "@/constants/endpoints/paths";
import axiosInstance from "@/services/axiosService";
import {
  escritaPendente,
  leituraPendente,
  listaVaziaPendente,
  serieVaziaPendente,
  integracaoPendente,
} from "@/services/integracaoPendente";
import type { ApiEnvelope } from "@/interfaces/Envelope.interface";
import type {
  OfficeExpenseListRequest,
  OfficeExpenseRequest,
  OfficeExpenseResponse,
  OfficeExpenseSummary,
  ExpenseTimelinePoint,
} from "@/interfaces/finance/OfficeExpense.interface";

/**
 * Despesas do escritório — `OfficeExpenseController`, tabela `office_expenses`.
 *
 * Nenhuma leitura silencia erro. Silenciar fazia sentido enquanto as rotas não
 * existiam e o 404 era esperado; agora um erro aqui é erro de verdade, e uma
 * tela financeira que falha em silêncio mostra saldo zero — que é um número, e
 * número errado é pior que tela vazia.
 *
 * Todas as rotas são ADMIN (`@RequerAdmin`).
 *
 * ## O `if` antes do código de verdade
 *
 * Cada função começa perguntando se este grupo de rotas está pausado **neste
 * ambiente** (`NEXT_PUBLIC_INTEGRACOES_PENDENTES`). Onde o backend serve as
 * rotas — o local, por exemplo — a pergunta é falsa e a integração funciona
 * normalmente. Onde não serve, a chamada não chega a sair para a rede.
 */

export const listOfficeExpenses = async (
  params?: OfficeExpenseListRequest,
): Promise<ApiEnvelope<OfficeExpenseResponse[]>> => {
  if (integracaoPendente("expenses")) return listaVaziaPendente();
  const { data } = await axiosInstance.get<ApiEnvelope<OfficeExpenseResponse[]>>(
    endpoints.EXPENSES.LIST,
    { params },
  );
  return data;
};

/** GET /expenses/{id} — o mesmo contrato de `getOfficeRevenue`. */
export const getOfficeExpense = async (
  expenseId: string,
): Promise<ApiEnvelope<OfficeExpenseResponse>> => {
  if (integracaoPendente("expenses")) return leituraPendente("GET /api/v1/expenses/{id}");
  const { data } = await axiosInstance.get<ApiEnvelope<OfficeExpenseResponse>>(
    endpoints.EXPENSES.BY_ID(expenseId),
  );
  return data;
};

export const getOfficeExpenseSummary = async (
  params?: Pick<
    OfficeExpenseListRequest,
    "dueFrom" | "dueTo" | "paidFrom" | "paidTo"
  >,
): Promise<ApiEnvelope<OfficeExpenseSummary>> => {
  if (integracaoPendente("expenses")) return leituraPendente("GET /api/v1/expenses/summary");
  const { data } = await axiosInstance.get<ApiEnvelope<OfficeExpenseSummary>>(
    endpoints.EXPENSES.SUMMARY,
    { params },
  );
  return data;
};

export const createOfficeExpense = async (
  body: OfficeExpenseRequest,
): Promise<ApiEnvelope<OfficeExpenseResponse>> => {
  if (integracaoPendente("expenses")) return escritaPendente("POST /api/v1/expenses");
  const { data } = await axiosInstance.post<ApiEnvelope<OfficeExpenseResponse>>(
    endpoints.EXPENSES.CREATE,
    body,
    { successMessage: "Despesa lançada." },
  );
  return data;
};

export const updateOfficeExpense = async (
  expenseId: string,
  body: OfficeExpenseRequest,
): Promise<ApiEnvelope<OfficeExpenseResponse>> => {
  if (integracaoPendente("expenses")) return escritaPendente("PUT /api/v1/expenses/{id}");
  const { data } = await axiosInstance.put<ApiEnvelope<OfficeExpenseResponse>>(
    endpoints.EXPENSES.UPDATE(expenseId),
    body,
    { successMessage: "Despesa atualizada." },
  );
  return data;
};

export const deleteOfficeExpense = async (expenseId: string): Promise<void> => {
  if (integracaoPendente("expenses")) return escritaPendente("DELETE /api/v1/expenses/{id}");
  await axiosInstance.delete(endpoints.EXPENSES.DELETE(expenseId), {
    successMessage: "Despesa excluída.",
  });
};

/** Série mensal das despesas — mesmo contrato do lado dos recebimentos. */
export const getOfficeExpenseTimeline = async (params: {
  from: string;
  to: string;
  basis?: "due" | "paid";
}): Promise<ApiEnvelope<ExpenseTimelinePoint[]>> => {
  if (integracaoPendente("expenses")) return serieVaziaPendente();
  const { data } = await axiosInstance.get<ApiEnvelope<ExpenseTimelinePoint[]>>(
    endpoints.EXPENSES.TIMELINE,
    { params },
  );
  return data;
};
