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
  STACK_GAP,
  STATUS_COLORS,
  baseBarOptions,
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
          backgroundColor: STATUS_COLORS.overdue,
          ...BAR_SPEC,
          ...STACK_GAP,
        },
        {
          label: "Previsto",
          data: points.map((point) => point.upcomingAmount),
          backgroundColor: STATUS_COLORS.upcoming,
          ...BAR_SPEC,
          ...STACK_GAP,
        },
        {
          label: "Recebido",
          data: points.map((point) => point.paidAmount),
          backgroundColor: STATUS_COLORS.paid,
          ...BAR_SPEC,
          ...STACK_GAP,
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
