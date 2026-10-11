import type { ExpenseCategoryTotal } from "@/interfaces/finance/OfficeExpense.interface";

/**
 * As séries do caixa do escritório para os gráficos — Relatórios e o cartão
 * de despesas da Home.
 *
 * Entradas e saídas chegam em duas linhas do tempo (`/revenues/timeline` e
 * `/expenses/timeline`), ambas recortadas por **data de pagamento**: é o que
 * entrou e saiu do caixa. A composição (somar, acumular, fatiar) fica no front
 * porque é aritmética sobre o que o servidor já agregou — uma rota a mais
 * para calcular `a - b` seria superfície de API sem regra de negócio própria.
 */

export type BalanceSlice = { label: string; percentage: number };

/**
 * Converte os totais por categoria em fatias para o `MonthlyBalance`.
 *
 * Ordena por valor decrescente — num gráfico de rosca, a maior fatia primeiro
 * é o que permite ler a ordem sem conferir a legenda.
 *
 * As porcentagens são arredondadas para inteiro e por isso podem somar 99 ou
 * 101. É aceitável num gráfico e melhor que exibir "23,4%" numa legenda de
 * cinco linhas; o valor exato está no total, que não é arredondado.
 */
export function toBalanceSlices(
  byCategory: readonly ExpenseCategoryTotal[],
): BalanceSlice[] {
  const total = byCategory.reduce((sum, item) => sum + item.amount, 0);
  if (total <= 0) return [];

  return [...byCategory]
    .sort((a, b) => b.amount - a.amount)
    .map((item) => ({
      label: item.category,
      percentage: Math.round((item.amount / total) * 100),
    }));
}

/**
 * Junta as duas linhas do tempo num só eixo de meses.
 *
 * Une pelos meses presentes em **qualquer** das duas: um mês só com despesa
 * precisa aparecer, senão o gráfico esconde exatamente o mês ruim. O que falta
 * de um lado entra como zero, não como buraco.
 */
export function buildFlowTimeline(
  payments: readonly { month: string; paidAmount: number }[],
  expenses: readonly { month: string; paidAmount: number }[],
): { month: string; inflowAmount: number; outflowAmount: number }[] {
  const months = new Set<string>();
  for (const point of payments) months.add(point.month);
  for (const point of expenses) months.add(point.month);

  const inflow = new Map(payments.map((p) => [p.month, p.paidAmount]));
  const outflow = new Map(expenses.map((e) => [e.month, e.paidAmount]));

  return [...months].sort().map((month) => ({
    month,
    inflowAmount: inflow.get(month) ?? 0,
    outflowAmount: outflow.get(month) ?? 0,
  }));
}

/**
 * Saldo acumulado ao longo dos meses.
 *
 * O card mostra o saldo **do mês**; esta série mostra para onde o caixa está
 * indo. São perguntas diferentes: três meses positivos seguidos e um negativo
 * podem somar um acumulado ainda confortável, e é o acumulado que diz se dá
 * para respirar.
 *
 * Começa do zero no primeiro mês da janela — é saldo do período, não saldo
 * bancário. Rotular como "saldo em conta" seria mentira: o servidor não sabe o
 * que havia antes da janela.
 */
export function toCumulativeBalance(
  flow: readonly { month: string; inflowAmount: number; outflowAmount: number }[],
): { month: string; cumulative: number }[] {
  let running = 0;
  return flow.map((point) => {
    running += point.inflowAmount - point.outflowAmount;
    return { month: point.month, cumulative: running };
  });
}
