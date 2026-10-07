"use client";

import { useMemo } from "react";
import { ArcElement, Chart as ChartJS, Tooltip } from "chart.js";
import { Doughnut } from "react-chartjs-2";

// Registro dos elementos usados pelo doughnut (tree-shaking do Chart.js v4).
ChartJS.register(ArcElement, Tooltip);

/**
 * O anel do Balanço. Separado do cartão por ser quem traz o Chart.js: o cartão
 * aparece com a página, e só o anel vem sob demanda.
 */
export default function BalanceDoughnut({ slices }: { slices: readonly { label: string; percentage: number; color: string }[] }) {
  const data = useMemo(
    () => ({
      labels: slices.map((s) => s.label),
      datasets: [
        {
          data: slices.map((s) => s.percentage),
          backgroundColor: slices.map((s) => s.color),
          borderWidth: 0,
          // Espessura do anel: quanto maior, mais fino o donut.
          cutout: "68%",
        },
      ],
    }),
    [slices],
  );
  return <Doughnut data={data} options={OPTIONS} />;
}

const OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  // A legenda é desenhada ao lado, em HTML.
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: { label?: string; parsed: number }) => ` ${ctx.label ?? ""}: ${ctx.parsed}%`,
      },
    },
  },
};
