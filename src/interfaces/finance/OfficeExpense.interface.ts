import type {
  ExpenseCategoryInput,
  ExpenseCategoryLabel,
} from "@/enums/expenseCategory/ExpenseCategory";
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
 * Despesas do escritório — a metade das saídas da Carteira.
 *
 * Atende `GET/POST/PUT/DELETE /api/v1/expenses` (`OfficeExpenseController`,
 * tabela `office_expenses`, migration V18).
 *
 * Reaproveita os enums de `payment` para status e forma de pagamento: uma
 * despesa também está Pendente/Paga/Cancelada e também sai por Pix ou boleto.
 * Criar um segundo par de enums com os mesmos valores só daria duas listas
 * para manter sincronizadas.
 */

export interface OfficeExpenseResponse {
  id: string;
  description: string;
  amount: number;
  /** Labels (@JsonValue), como no resto da API. */
  category?: ExpenseCategoryLabel;
  status?: PaymentStatusLabel;
  paymentMethod?: PaymentMethodLabel;
  dueDate: string;
  paidDate?: string;
  /** Calculado no servidor, como em `client_payments`. */
  overdue: boolean;
  /** Fornecedor / beneficiário do pagamento. */
  supplier?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OfficeExpenseRequest {
  description: string;
  amount: number;
  category?: ExpenseCategoryInput;
  paymentMethod?: PaymentMethodInput;
  dueDate: string;
  paidDate?: string;
  /** Omitido, nasce Pendente. Enviar "Pago" sem `paidDate` assume hoje no servidor. */
  status?: PaymentStatusInput;
  supplier?: string;
  notes?: string;
}

export interface OfficeExpenseListRequest extends FinancePeriodFilter {
  pageNumber?: number;
  pageSize?: number;
  searchTerm?: string;
  category?: ExpenseCategoryInput[];
  status?: PaymentStatusInput[];
  paymentMethod?: PaymentMethodInput[];
}

/** Uma fatia do balanço por categoria, no formato que o `MonthlyBalance` já usa. */
export interface ExpenseCategoryTotal {
  category: ExpenseCategoryLabel | string;
  amount: number;
}

export interface OfficeExpenseSummary extends FinanceSummary {
  /** Só das despesas **pagas** no período — é o que compõe o gráfico. */
  byCategory: ExpenseCategoryTotal[];
}

/** Um mês da linha do tempo de despesas — `GET /api/v1/expenses/timeline`. */
export type ExpenseTimelinePoint = FinanceTimelinePoint;

/** Entradas × saídas por mês, composto no front a partir das duas linhas. */
export interface FlowTimelinePoint {
  month: string;
  inflowAmount: number;
  outflowAmount: number;
}
