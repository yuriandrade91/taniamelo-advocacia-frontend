import type { MonthRef } from "@/lib/period";
import type { BalanceSlice } from "@/components/reports/financeSeries";
import type {
  IntakeTrendPoint,
  SituationCount,
} from "@/components/reports/reportSeries";
import type { AppointmentTimelinePoint } from "@/interfaces/appointment/Appointment.interface";
import type { PaymentTimelinePoint } from "@/interfaces/payment/OfficePayment.interface";
import type {
  FlowTimelinePoint,
  OfficeExpenseSummary,
} from "@/interfaces/finance/OfficeExpense.interface";

/**
 * O que a página de Relatórios entrega a cada visão.
 *
 * Tudo já vem carregado e na forma de série; a visão só desenha. As séries
 * mensais usam a chave `YYYY-MM` — `formatMonthAxis` (em `@/lib/period`) a
 * transforma em "out/26".
 *
 * Os gráficos das visões usam as primitivas de `@/components/charts/svgCharts`
 * (SVG e CSS próprios, com as cores dos tokens) — não o Chart.js.
 */

export type { LoadState as ReportsLoadState } from "../reportSeries";
import type { LoadState } from "../reportSeries";

export type ReportViewProps = {
  /** Mês escolhido no seletor (o fim de todas as janelas). */
  month: MonthRef;
  /** "mai/26 – out/26": a janela de 6 meses das séries financeiras. */
  windowLabel: string;
  /**
   * Financeiro só para ADMIN. Sem permissão, as séries financeiras vêm vazias
   * e a visão **não** deve mostrar a parte financeira (nem zerada).
   */
  canSeeFinance: boolean;
  state: LoadState;
  /** Clientes e agenda ainda carregando. */
  isLoading: boolean;
  /** Financeiro ainda carregando. */
  isFinanceLoading: boolean;

  // ── Financeiro (6 meses até `month`) ──
  /** Pagamentos aos clientes por vencimento: atrasado, a vencer, pago por mês. */
  payments: PaymentTimelinePoint[];
  /** Carteira por pagamento: entradas e saídas do escritório por mês. */
  flow: FlowTimelinePoint[];
  /** Saldo acumulado mês a mês (entradas − saídas, somando). */
  cumulative: { month: string; cumulative: number }[];
  /** Despesas pagas nos 6 meses, com `byCategory` e `paidAmount`. */
  expenses: OfficeExpenseSummary | null;
  /** Composição das despesas por categoria, em %, maior primeiro. */
  expenseSlices: BalanceSlice[];

  // ── Clientes e agenda ──
  /** Clientes por etapa da esteira, na ordem do funil (não por tamanho). */
  situations: SituationCount[];
  /** Cadastros por mês (verificado, potencial) + média móvel de 3 meses. */
  intake: IntakeTrendPoint[];
  /** Compromissos por mês no ano até `month`, por status. */
  agenda: AppointmentTimelinePoint[];
};
