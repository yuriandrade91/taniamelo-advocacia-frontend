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
  FLOW_COLORS,
  baseBarOptions,
} from "@/components/charts/chartTheme";
import { formatBRLCompact } from "@/lib/format";
import { formatMonthAxis } from "./walletOverview";
import type { FlowTimelinePoint } from "@/interfaces/finance/OfficeExpense.interface";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

/**
 * Entradas × saídas por mês — regime de caixa.
 *
 * Barras lado a lado, não empilhadas: entrada e saída não somam nada juntas.
 * Empilhá-las daria uma altura que não significa coisa alguma.
 *
 * **O saldo não vira uma terceira série neste gráfico.** Ele já está no card
 * acima, e desenhá-lo aqui pediria uma linha sobre barras — que, se ganhasse
 * escala própria, seria um gráfico de dois eixos, o erro que mais distorce
 * leitura. Mesma unidade, mesmo eixo, e a comparação já é visível na distância
 * entre as duas barras.
 */

export type WalletFlowChartProps = {
  points: FlowTimelinePoint[];
  isEmpty?: boolean;
  emptyMessage?: string;
  isSample?: boolean;
};

const LEGEND = [
  { label: "Entradas", color: FLOW_COLORS.inflow },
  { label: "Saídas", color: FLOW_COLORS.outflow },
];

export function WalletFlowChart({
  points,
  isEmpty,
  emptyMessage,
  isSample,
}: WalletFlowChartProps) {
  const data = useMemo(
    () => ({
      labels: points.map((point) => formatMonthAxis(point.month)),
      datasets: [
        {
          label: "Entradas",
          data: points.map((point) => point.inflowAmount),
          backgroundColor: FLOW_COLORS.inflow,
          ...BAR_SPEC,
        },
        {
          label: "Saídas",
          data: points.map((point) => point.outflowAmount),
          backgroundColor: FLOW_COLORS.outflow,
          ...BAR_SPEC,
        },
      ],
    }),
    [points],
  );

  const options = useMemo(
    () => baseBarOptions({ formatValue: formatBRLCompact }),
    [],
  );

  return (
    <ChartCard
      title="Entradas e saídas por mês"
      subtitle="Pelo que foi efetivamente pago em cada mês."
      legend={LEGEND}
      isSample={isSample}
      isEmpty={isEmpty ?? points.length === 0}
      emptyMessage={emptyMessage}
    >
      <Bar data={data} options={options} />
    </ChartCard>
  );
}
