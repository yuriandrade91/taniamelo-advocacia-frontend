import type { FinanceSummary } from "@/interfaces/finance/Finance.interface";
import { formatBRL, formatBRLCompact } from "@/lib/format";

/**
 * Os números do resumo do mês da Carteira — puros e testados; o desenho é o
 * `WalletMonthSummary`.
 *
 * Dois recortes, cada um no seu papel:
 * - **Entradas / Saídas / Saldo**: caixa, pelo que foi pago no mês (os cards de antes);
 * - **Previsto / Atrasado**: por vencimento, o que vence no mês e ainda não
 *   foi pago — "Previsto" é o mesmo status da tabela.
 *
 * A projeção soma ao saldo tudo o que ainda falta no mês (previsto e
 * atrasado), dos dois lados: "como o mês fecha se tudo for quitado".
 */

export type Amount = { amount: number; count: number };

export type MonthSummary = {
  /** Recebido no mês (caixa). `null` se a rota não respondeu. */
  inflow: Amount | null;
  /** Pago no mês (caixa). */
  outflow: Amount | null;
  /** A receber / a pagar com vencimento no mês, ainda no prazo. */
  expectedIn: Amount | null;
  expectedOut: Amount | null;
  /** Venceu no mês e não foi pago. */
  overdueIn: Amount | null;
  overdueOut: Amount | null;
  /** Entradas − saídas do caixa. */
  balance: number | null;
  /** Saldo + (previsto + atrasado a receber) − (previsto + atrasado a pagar). */
  projected: number | null;
};

const upcoming = (s: FinanceSummary | null): Amount | null =>
  s ? { amount: s.upcomingAmount, count: s.upcomingCount } : null;

const overdue = (s: FinanceSummary | null): Amount | null =>
  s ? { amount: s.overdueAmount, count: s.overdueCount } : null;

const paid = (s: FinanceSummary | null): Amount | null =>
  s ? { amount: s.paidAmount, count: s.paidCount } : null;

/**
 * `paid*`: resumos por data de pagamento (caixa); `due*`: por vencimento.
 * Qualquer um `null` (carregando ou sem resposta) deixa `null` o que depende
 * dele — "não sei" não vira zero.
 */
export function buildMonthSummary(props: {
  paidRevenue: FinanceSummary | null;
  paidExpense: FinanceSummary | null;
  dueRevenue: FinanceSummary | null;
  dueExpense: FinanceSummary | null;
}): MonthSummary {
  const inflow = paid(props.paidRevenue);
  const outflow = paid(props.paidExpense);
  const expectedIn = upcoming(props.dueRevenue);
  const expectedOut = upcoming(props.dueExpense);
  const overdueIn = overdue(props.dueRevenue);
  const overdueOut = overdue(props.dueExpense);

  const balance = inflow && outflow ? inflow.amount - outflow.amount : null;
  const projected =
    balance !== null && expectedIn && expectedOut && overdueIn && overdueOut
      ? balance + expectedIn.amount + overdueIn.amount - expectedOut.amount - overdueOut.amount
      : null;

  return { inflow, outflow, expectedIn, expectedOut, overdueIn, overdueOut, balance, projected };
}

// ── Exibição ──

/** "R$ 1.500" / "−R$ 1.500"; sem número, "—". */
export function money(value: number | null | undefined, { plus = false } = {}): string {
  if (value === null || value === undefined) return "—";
  const body = formatBRLCompact(Math.abs(value));
  if (value < 0) return `−${body}`;
  return plus && value > 0 ? `+${body}` : body;
}

/** Valor com centavos, para o `title` do número arredondado. */
export const exact = (value: number | null | undefined) =>
  value === null || value === undefined ? undefined : formatBRL(value);

export const countLabel = (amount: Amount | null, verb = "") =>
  amount
    ? `${amount.count} ${amount.count === 1 ? "lançamento" : "lançamentos"}${verb ? ` ${verb}` : ""}`
    : "";

/** Saldo e projeção: perigo no negativo — negativo é resultado, não erro. */
export const balanceTone = (value: number | null) => (value !== null && value < 0 ? "text-danger" : "text-primary");

/**
 * Quanto de um lado do mês já se realizou: pago ÷ (pago + previsto +
 * atrasado). Sem movimento, 0.
 */
export function realized(done: Amount | null, expected: Amount | null, overdue: Amount | null): number {
  const total = (done?.amount ?? 0) + (expected?.amount ?? 0) + (overdue?.amount ?? 0);
  return total > 0 ? (done?.amount ?? 0) / total : 0;
}

export const percent = (fraction: number) => `${Math.round(fraction * 100)}%`;

/** O mês está fechando positivo ou negativo, pelo saldo do caixa. */
export function balanceStatus(balance: number | null): { dot: string; label: string } {
  if (balance === null) return { dot: "bg-gray-100/50", label: "Sem dados" };
  return balance < 0 ? { dot: "bg-danger", label: "Negativo" } : { dot: "bg-success", label: "Positivo" };
}
