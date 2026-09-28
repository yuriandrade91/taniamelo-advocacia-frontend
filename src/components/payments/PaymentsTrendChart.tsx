"use client";

import { useMemo } from "react";
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { ChartCard } from "@/components/charts/ChartCard";
import {
  LINE_SPEC,
  STATUS_COLORS,
  areaFill,
  baseLineOptions,
} from "@/components/charts/chartTheme";
import { formatMonthAxis } from "@/components/wallet/walletOverview";
import { formatBRLCompact } from "@/lib/format";
import type { PaymentTimelinePoint } from "@/interfaces/payment/OfficePayment.interface";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
);

/**
 * Evolução do que foi efetivamente recebido, mês a mês.
 *
 * Linha porque a pergunta é **mudança ao longo do tempo** — a inclinação é a
 * informação, e é isso que a linha desenha e a barra não. Fica ao lado do
 * empilhado, que responde outra coisa (composição do mês).
 *
 * Série única: sem legenda, o título nomeia o que está plotado. A área é uma
 * lavagem a 10% da própria cor, não um bloco — o preenchimento existe para dar
 * peso à linha, não para competir com ela.
 */

export type PaymentsTrendChartProps = {
  points: PaymentTimelinePoint[];
  isSample?: boolean;
};

export function PaymentsTrendChart({
  points,
  isSample,
}: PaymentsTrendChartProps) {
  const data = useMemo(
    () => ({
      labels: points.map((point) => formatMonthAxis(point.month)),
      datasets: [
        {
          label: "Recebido",
          data: points.map((point) => point.paidAmount),
          borderColor: STATUS_COLORS.paid,
          backgroundColor: areaFill(STATUS_COLORS.paid),
          pointBackgroundColor: STATUS_COLORS.paid,
          fill: true,
          ...LINE_SPEC,
        },
      ],
    }),
    [points],
  );

  const options = useMemo(
    () => baseLineOptions({ formatValue: formatBRLCompact }),
    [],
  );

  return (
    <ChartCard
      title="Evolução do recebido"
      subtitle="Quanto entrou em cada mês."
      isSample={isSample}
      isEmpty={points.length === 0}
    >
      <Line data={data} options={options} />
    </ChartCard>
  );
}
