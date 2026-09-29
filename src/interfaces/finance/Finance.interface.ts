/**
 * O que receita, despesa e pagamento respondem igual.
 *
 * As três áreas do financeiro somam dinheiro do mesmo jeito — o que venceu e
 * não foi pago, o que ainda vai vencer, o que foi pago — e o backend devolve
 * as três no mesmo `FinanceSummaryDTO`/`FinanceTimelinePointDTO`. Escrever o
 * tipo três vezes é como um deles ganha um campo que os outros não têm e os
 * componentes de gráfico passam a servir só a um.
 */

/**
 * Totais de um período. Os três baldes são **disjuntos**: uma linha está em
 * exatamente um deles, e cancelado fica fora dos três e fora do total. Somar
 * `overdue + upcoming + paid` dá `total` — se não der, o servidor mudou e o
 * gráfico está mentindo.
 */
export interface FinanceSummary {
  overdueAmount: number;
  overdueCount: number;
  upcomingAmount: number;
  upcomingCount: number;
  paidAmount: number;
  paidCount: number;
  totalAmount: number;
}

/**
 * Um mês da série. Vem preenchido mesmo sem movimento, zerado: mês omitido
 * faria o gráfico colar dois meses distantes lado a lado e sumir justamente
 * com o mês vazio, que costuma ser o que interessa.
 */
export interface FinanceTimelinePoint {
  /** `yyyy-MM`. */
  month: string;
  overdueAmount: number;
  upcomingAmount: number;
  paidAmount: number;
}

/**
 * Recorte de período das três listas.
 *
 * `dueFrom`/`dueTo` e `paidFrom`/`paidTo` são **mutuamente exclusivos** — o
 * servidor responde 400 se vierem os dois. Não é implicância: competência
 * ("o que vence no mês") e caixa ("o que entrou e saiu no mês") dão números
 * diferentes, e escolher um por conta própria devolve uma resposta plausível
 * para uma pergunta que ninguém fez.
 */
export interface FinancePeriodFilter {
  dueFrom?: string;
  dueTo?: string;
  paidFrom?: string;
  paidTo?: string;
}
