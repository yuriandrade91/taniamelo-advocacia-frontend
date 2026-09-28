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

/**
 * Despesas do escritório — a metade que falta para existir "carteira".
 *
 * ⚠️ **Não existe absolutamente nada disto no backend**: nem tabela, nem
 * migration, nem DTO. É o domínio `financial` que o ADR-0003 já previa. O
 * contrato está escrito aqui para a tela poder ser construída e para a
 * implementação em Java não precisar adivinhar o formato.
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
  supplier?: string;
  notes?: string;
}

export interface OfficeExpenseListRequest {
  pageNumber?: number;
  pageSize?: number;
  searchTerm?: string;
  category?: ExpenseCategoryInput[];
  status?: PaymentStatusInput[];
  /** Recorte por **vencimento** — a pergunta "o que vence". */
  dueFrom?: string;
  dueTo?: string;
  /** Recorte por **pagamento** — a pergunta "o que saiu do caixa". */
  paidFrom?: string;
  paidTo?: string;
}

/** Uma fatia do balanço por categoria, no formato que o `MonthlyBalance` já usa. */
export interface ExpenseCategoryTotal {
  category: ExpenseCategoryLabel | string;
  amount: number;
}

export interface OfficeExpenseSummary {
  overdueAmount: number;
  overdueCount: number;
  upcomingAmount: number;
  upcomingCount: number;
  paidAmount: number;
  paidCount: number;
  totalAmount: number;
  /** Só das despesas **pagas** no período — é o que compõe o gráfico. */
  byCategory: ExpenseCategoryTotal[];
}

/**
 * Visão de caixa do período, composta no front a partir dos dois resumos.
 *
 * ## Competência × caixa
 *
 * Esta é a distinção que faz a Carteira ser outra tela, e não um filtro de
 * Pagamentos:
 *
 * - **Pagamentos** recorta por `dueDate` — responde "o que vence", que é a
 *   pergunta da cobrança.
 * - **Carteira** recorta por `paidDate` — responde "o que entrou e saiu", que
 *   é a pergunta do caixa.
 *
 * Somar recebimento por vencimento e chamar de "entrou" conta dinheiro que não
 * chegou. É o erro mais comum em tela financeira, e é silencioso: os números
 * parecem plausíveis.
 */
export interface WalletOverview {
  /** Recebido de clientes no período (por data de pagamento). */
  inflowAmount: number;
  inflowCount: number;
  /** Despesas pagas no período (por data de pagamento). */
  outflowAmount: number;
  outflowCount: number;
  /** `inflow - outflow`. Negativo é resultado válido, não erro. */
  balance: number;
}

/** Um mês da linha do tempo de despesas — `GET /api/v1/expenses/timeline`. */
export interface ExpenseTimelinePoint {
  /** `yyyy-MM`. */
  month: string;
  overdueAmount: number;
  upcomingAmount: number;
  paidAmount: number;
}

/** Entradas × saídas por mês, composto no front a partir das duas linhas. */
export interface FlowTimelinePoint {
  month: string;
  inflowAmount: number;
  outflowAmount: number;
}
