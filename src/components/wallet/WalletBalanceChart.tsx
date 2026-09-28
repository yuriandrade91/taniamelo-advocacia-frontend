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
  SINGLE_SERIES_COLOR,
  areaFill,
  baseLineOptions,
} from "@/components/charts/chartTheme";
import { formatBRLCompact } from "@/lib/format";
import { formatMonthAxis, toCumulativeBalance } from "./walletOverview";
import type { FlowTimelinePoint } from "@/interfaces/finance/OfficeExpense.interface";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
);

/**
 * Saldo acumulado da janela.
 *
 * Linha, e **não** uma terceira série no gráfico de barras ao lado: lá o saldo
 * precisaria de escala própria, e duas escalas no mesmo gráfico é o erro que
 * mais distorce leitura. Separado, cada um mantém um eixo só.
 *
 * O subtítulo diz "no período" de propósito — a série começa do zero no
 * primeiro mês da janela, então não é saldo bancário. O servidor não sabe o
 * que havia antes.
 */

export type WalletBalanceChartProps = {
  points: FlowTimelinePoint[];
  isSample?: boolean;
};

export function WalletBalanceChart({
  points,
  isSample,
}: WalletBalanceChartProps) {
  const series = useMemo(() => toCumulativeBalance(points), [points]);

  const data = useMemo(
    () => ({
      labels: series.map((point) => formatMonthAxis(point.month)),
      datasets: [
        {
          label: "Saldo acumulado",
          data: series.map((point) => point.cumulative),
          borderColor: SINGLE_SERIES_COLOR,
          backgroundColor: areaFill(SINGLE_SERIES_COLOR),
          pointBackgroundColor: SINGLE_SERIES_COLOR,
          fill: true,
          ...LINE_SPEC,
        },
      ],
    }),
    [series],
  );

  const options = useMemo(
    () => baseLineOptions({ formatValue: formatBRLCompact }),
    [],
  );

  return (
    <ChartCard
      title="Saldo acumulado"
      subtitle="Somado mês a mês, no período — não é saldo em conta."
      isSample={isSample}
      isEmpty={series.length === 0}
    >
      <Line data={data} options={options} />
    </ChartCard>
  );
}
