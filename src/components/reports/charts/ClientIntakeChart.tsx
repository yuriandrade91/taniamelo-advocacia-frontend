"use client";

import { useMemo } from "react";
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from "chart.js";
import { Chart } from "react-chartjs-2";
import { ChartCard } from "@/components/charts/ChartCard";
import {
  BAR_SPEC,
  REPORT_BAR,
  CLIENT_TYPE_COLORS,
  LINE_SPEC,
  SINGLE_SERIES_COLOR,
  baseBarOptions,
  barColors,
} from "@/components/charts/chartTheme";
import { formatMonthAxis } from "@/components/wallet/walletOverview";
import type { IntakeTrendPoint } from "../reportSeries";

// Gráfico misto: os controllers precisam estar registrados, não só os
// elementos — é o `type` de cada dataset que escolhe qual desenha.
ChartJS.register(
  BarController,
  BarElement,
  CategoryScale,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
);

/**
 * Entrada de cadastros por mês — barra empilhada com linha
 * (https://www.chartjs.org/docs/latest/samples/other-charts/stacked-bar-line.html).
 *
 * **As barras** somam o total do mês: a altura é quantos cadastros entraram, a
 * divisão é quantos já são clientes (Verificado) e quantos ainda são contato
 * (Potencial).
 *
 * **A linha é a média móvel de 3 meses do total**, e não o total do mês: o
 * total já é a altura da pilha, e uma linha repetindo esse número seria tinta
 * sem dado. A média diz se o mês foi ponto fora da curva ou tendência. Mesma
 * unidade, mesmo eixo — nada de segundo eixo y.
 *
 * O tipo é o **de hoje**, não o do mês do cadastro: o backend não guarda
 * quando um potencial virou verificado. Um mês antigo tende a parecer mais
 * "verificado" que um recente — o subtítulo diz isso.
 */

const LEGEND = [
  { label: "Verificado", color: CLIENT_TYPE_COLORS.verified },
  { label: "Potencial", color: CLIENT_TYPE_COLORS.potential },
  { label: "Média de 3 meses", color: SINGLE_SERIES_COLOR },
];

export type ClientIntakeChartProps = {
  points: IntakeTrendPoint[];
  isLoading?: boolean;
};

export function ClientIntakeChart({
  points,
  isLoading = false,
}: ClientIntakeChartProps) {
  const isEmpty =
    !isLoading && points.every((p) => p.verified + p.potential === 0);

  const data = useMemo<ChartData<"bar" | "line", number[], string>>(
    () => ({
      labels: points.map((p) => formatMonthAxis(p.month)),
      datasets: [
        {
          type: "line" as const,
          label: "Média de 3 meses",
          data: points.map((p) => p.average),
          borderColor: SINGLE_SERIES_COLOR,
          backgroundColor: SINGLE_SERIES_COLOR,
          pointBackgroundColor: SINGLE_SERIES_COLOR,
          ...LINE_SPEC,
          // `order` menor desenha por cima: a linha não some atrás das barras.
          order: 0,
          // A linha não entra na pilha — senão ela somaria nas barras.
          stack: "media",
        },
        {
          type: "bar" as const,
          label: "Verificado",
          data: points.map((p) => p.verified),
          ...barColors(CLIENT_TYPE_COLORS.verified),
          ...BAR_SPEC,
          ...REPORT_BAR,
          // Só o segmento de cima tem a ponta arredondada.
          borderRadius: 0,
          order: 1,
          stack: "cadastros",
        },
        {
          type: "bar" as const,
          label: "Potencial",
          data: points.map((p) => p.potential),
          ...barColors(CLIENT_TYPE_COLORS.potential),
          ...BAR_SPEC,
          ...REPORT_BAR,
          order: 1,
          stack: "cadastros",
        },
      ],
    }),
    [points],
  );

  const options = useMemo(
    () =>
      baseBarOptions({
        stacked: true,
        formatValue: (value) => String(Math.round(value)),
        tooltipLabel: (raw, label) =>
          label === "Média de 3 meses"
            ? `${label}: ${raw.toLocaleString("pt-BR")}`
            : `${label}: ${raw}`,
      }) as ChartOptions<"bar" | "line">,
    [],
  );

  return (
    <ChartCard
      isLoading={isLoading}
      title="Novos cadastros por mês"
      subtitle="Pela data de cadastro; o tipo é o atual."
      legend={LEGEND}
      height={240}
      isEmpty={isEmpty}
      emptyMessage="Nenhum cadastro no período."
    >
      <Chart type="bar" data={data} options={options} />
    </ChartCard>
  );
}
