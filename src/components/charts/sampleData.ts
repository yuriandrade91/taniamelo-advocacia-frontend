import { currentMonth, shiftMonth } from "@/lib/period";
import type { PaymentTimelinePoint } from "@/interfaces/payment/OfficePayment.interface";
import type { FlowTimelinePoint } from "@/interfaces/finance/OfficeExpense.interface";

/**
 * Dados de exemplo dos gráficos financeiros.
 *
 * ## Por que existe, e o cuidado que veio junto
 *
 * As rotas de série mensal (`/payments/timeline`, `/expenses/timeline`) ainda
 * não existem. Sem elas os gráficos ficariam vazios e não daria para avaliar
 * layout, legibilidade nem escala — que é justamente o que se quer ver antes
 * de o backend subir.
 *
 * O risco de mock em tela financeira é conhecido: número plausível sem aviso
 * vira número repetido em reunião. Por isso **todo card alimentado daqui
 * carrega o selo "dados de exemplo"** (`isSample` no `ChartCard`), e a troca
 * pelo dado real é a remoção de um `??` — não uma reescrita.
 *
 * **Ponto único de exclusão:** quando as rotas subirem, apagar este arquivo e
 * seguir os erros de compilação leva a todos os pontos de uso.
 *
 * Os valores são deliberadamente irregulares (um mês fraco, um mês de pico, um
 * mês no vermelho): série lisa esconde exatamente os problemas de escala e de
 * rótulo que o mock deveria revelar.
 */

/** Últimos 6 meses terminando no mês de referência, em `yyyy-MM`. */
function lastSixMonths(reference = currentMonth()): string[] {
  return Array.from({ length: 6 }, (_, index) => {
    const ref = shiftMonth(reference, index - 5);
    return `${ref.year}-${String(ref.month).padStart(2, "0")}`;
  });
}

/** Pipeline de recebimentos por mês de vencimento. */
export function samplePaymentTimeline(): PaymentTimelinePoint[] {
  const months = lastSixMonths();
  const rows: [number, number, number][] = [
    // [atrasado, a vencer, recebido]
    [0, 0, 12400],
    [900, 0, 9800],
    [1800, 0, 15200],
    [2400, 0, 7300], // mês fraco
    [3100, 4200, 11900],
    [4500, 12800, 5400], // mês corrente: muito ainda a vencer
  ];
  return months.map((month, index) => ({
    month,
    overdueAmount: rows[index][0],
    upcomingAmount: rows[index][1],
    paidAmount: rows[index][2],
  }));
}

/** Entradas × saídas por mês, regime de caixa. */
export function sampleFlowTimeline(): FlowTimelinePoint[] {
  const months = lastSixMonths();
  const rows: [number, number][] = [
    [12400, 8600],
    [9800, 9100],
    [15200, 8900],
    [7300, 10400], // mês no vermelho — a série precisa ter um
    [11900, 9600],
    [5400, 7200],
  ];
  return months.map((month, index) => ({
    month,
    inflowAmount: rows[index][0],
    outflowAmount: rows[index][1],
  }));
}
