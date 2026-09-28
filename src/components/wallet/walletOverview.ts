import type {
  ExpenseCategoryTotal,
  OfficeExpenseSummary,
  WalletOverview,
} from "@/interfaces/finance/OfficeExpense.interface";

/**
 * Compõe a visão de caixa do escritório a partir dos dois resumos.
 *
 * Fica no front, e não numa terceira rota `/wallet/summary`, porque é
 * subtração: um endpoint a mais para calcular `a - b` seria superfície de API
 * sem regra de negócio própria. Se um dia entrar reconciliação bancária ou
 * conta a conta, aí sim vira recurso no servidor.
 *
 * **Os dois resumos precisam vir recortados por data de pagamento**
 * (`paidFrom`/`paidTo`), não por vencimento. Chamar esta função com resumos
 * por vencimento devolve um "saldo" de dinheiro que não passou pelo caixa.
 * A função não tem como checar isso — quem chama é responsável, e é por isso
 * que a página pede os dois com o mesmo par de datas.
 *
 * ## A entrada que saiu daqui
 *
 * Até agora esta função recebia o resumo de `client_payments` como entrada do
 * escritório. Estava errado, e do jeito mais caro possível: `client_payments`
 * guarda o que o **INSS paga ao cliente** — atrasados, benefício. Somar isso
 * como receita mostrava o dinheiro dos clientes como faturamento do
 * escritório, inflado por um fator que depende só do tamanho dos atrasados.
 * O saldo ficava plausível, positivo e completamente falso.
 *
 * A receita de verdade é o honorário, que hoje **não tem tabela** — nem
 * `client_payments` (é do cliente), nem nada. Enquanto não tiver, `inflow` é
 * zero e a tela diz que é ausência de fonte, não ausência de receita.
 */
export function buildWalletOverview(
  revenues: { paidAmount: number; paidCount: number } | null,
  expenses: OfficeExpenseSummary | null,
): WalletOverview {
  const inflowAmount = revenues?.paidAmount ?? 0;
  const inflowCount = revenues?.paidCount ?? 0;
  const outflowAmount = expenses?.paidAmount ?? 0;
  const outflowCount = expenses?.paidCount ?? 0;

  return {
    inflowAmount,
    inflowCount,
    outflowAmount,
    outflowCount,
    // Negativo é resultado válido: mês em que se gastou mais do que entrou.
    balance: inflowAmount - outflowAmount,
  };
}

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

/** `2026-03` → `mar/26`, rótulo curto para o eixo. */
const SHORT_MONTHS = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

export function formatMonthAxis(month: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return month;
  const [, year, monthNumber] = match;
  return `${SHORT_MONTHS[Number(monthNumber) - 1]}/${year.slice(2)}`;
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
