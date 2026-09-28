import endpoints from "@/constants/endpoints/paths";
import axiosInstance from "@/services/axiosService";
import type { ApiEnvelope } from "@/interfaces/Envelope.interface";
import type {
  OfficeExpenseListRequest,
  OfficeExpenseRequest,
  OfficeExpenseResponse,
  OfficeExpenseSummary,
  ExpenseTimelinePoint,
} from "@/interfaces/finance/OfficeExpense.interface";

/**
 * Despesas do escritório.
 *
 * ⚠️ **O backend não tem nada disto ainda** — nem a tabela. Enquanto não
 * tiver, as leituras respondem 404 e a Carteira mostra isso explicitamente em
 * vez de fingir saldo zero. Saldo zero é um número, e número errado numa tela
 * financeira é pior que tela vazia.
 *
 * `skipErrorToast` nas leituras pelo mesmo motivo da área de pagamentos: o 404
 * é esperado hoje e um toast vermelho por carregamento seria ruído. As
 * escritas **não** silenciam: se alguém tentar lançar uma despesa, precisa
 * saber que não foi.
 */

export const listOfficeExpenses = async (
  params?: OfficeExpenseListRequest,
): Promise<ApiEnvelope<OfficeExpenseResponse[]>> => {
  const { data } = await axiosInstance.get<ApiEnvelope<OfficeExpenseResponse[]>>(
    endpoints.EXPENSES.LIST,
    { params, skipErrorToast: true },
  );
  return data;
};

export const getOfficeExpenseSummary = async (
  params?: Pick<
    OfficeExpenseListRequest,
    "dueFrom" | "dueTo" | "paidFrom" | "paidTo"
  >,
): Promise<ApiEnvelope<OfficeExpenseSummary>> => {
  const { data } = await axiosInstance.get<ApiEnvelope<OfficeExpenseSummary>>(
    endpoints.EXPENSES.SUMMARY,
    { params, skipErrorToast: true },
  );
  return data;
};

export const createOfficeExpense = async (
  body: OfficeExpenseRequest,
): Promise<ApiEnvelope<OfficeExpenseResponse>> => {
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
  const { data } = await axiosInstance.put<ApiEnvelope<OfficeExpenseResponse>>(
    endpoints.EXPENSES.UPDATE(expenseId),
    body,
    { successMessage: "Despesa atualizada." },
  );
  return data;
};

export const deleteOfficeExpense = async (expenseId: string): Promise<void> => {
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
  const { data } = await axiosInstance.get<ApiEnvelope<ExpenseTimelinePoint[]>>(
    endpoints.EXPENSES.TIMELINE,
    { params, skipErrorToast: true },
  );
  return data;
};
