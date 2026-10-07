"use client";

import { useMemo } from "react";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
  Tooltip,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { ChartCard } from "@/components/charts/ChartCard";
import {
  BAR_SPEC,
  REPORT_BAR,
  STATUS_COLORS,
  baseBarOptions,
  barColors,
} from "@/components/charts/chartTheme";
import { formatMonthAxis } from "@/components/wallet/walletOverview";
import { formatBRLCompact } from "@/lib/format";
import type { PaymentTimelinePoint } from "@/interfaces/payment/OfficePayment.interface";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

/**
 * Pipeline de recebimentos por mês de vencimento.
 *
 * Empilhado porque as três parcelas somam o total do mês — a altura da coluna
 * é o quanto vence, e a divisão mostra em que estado está. Barras lado a lado
 * dariam a comparação entre estados, que não é a pergunta.
 *
 * Os segmentos são separados por 2px na cor da superfície, não por contorno:
 * contorno adiciona tinta que não é dado.
 */

export type PaymentsTimelineChartProps = {
  /** Ainda carregando: o cartão mostra o skeleton no lugar do gráfico. */
  isLoading?: boolean;
  points: PaymentTimelinePoint[];
  isEmpty?: boolean;
  emptyMessage?: string;
  isSample?: boolean;
};

const LEGEND = [
  { label: "Atrasado", color: STATUS_COLORS.overdue },
  { label: "Previsto", color: STATUS_COLORS.upcoming },
  { label: "Recebido", color: STATUS_COLORS.paid },
];

export function PaymentsTimelineChart({
  isLoading = false,
  points,
  isEmpty,
  emptyMessage,
  isSample,
}: PaymentsTimelineChartProps) {
  const data = useMemo(
    () => ({
      labels: points.map((point) => formatMonthAxis(point.month)),
      datasets: [
        {
          label: "Atrasado",
          data: points.map((point) => point.overdueAmount),
          ...barColors(STATUS_COLORS.overdue),
          ...BAR_SPEC,
          ...REPORT_BAR,
        },
        {
          label: "Previsto",
          data: points.map((point) => point.upcomingAmount),
          ...barColors(STATUS_COLORS.upcoming),
          ...BAR_SPEC,
          ...REPORT_BAR,
        },
        {
          label: "Recebido",
          data: points.map((point) => point.paidAmount),
          ...barColors(STATUS_COLORS.paid),
          ...BAR_SPEC,
          ...REPORT_BAR,
        },
      ],
    }),
    [points],
  );

  const options = useMemo(
    () => baseBarOptions({ formatValue: formatBRLCompact, stacked: true }),
    [],
  );

  return (
    <ChartCard
      isLoading={isLoading}
      title="Recebimentos por mês de vencimento"
      subtitle="Quanto vence em cada mês e em que estado está."
      legend={LEGEND}
      isSample={isSample}
      isEmpty={isEmpty ?? points.length === 0}
      emptyMessage={emptyMessage}
    >
      <Bar data={data} options={options} />
    </ChartCard>
  );
}
