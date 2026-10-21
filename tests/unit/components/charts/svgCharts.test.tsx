import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BarChart, HBarList, Legend, LineChart, Meter, SegmentBar, Sparkline } from "@/components/charts/svgCharts";

describe("gráficos em SVG", () => {
  const labels = ["jan", "fev", "mar"];

  it("linha e barras, claras e escuras, empilhadas ou não", () => {
    const series = [
      { label: "Entradas", values: [3, 0, 5], tone: "success" as const },
      { label: "Saídas", values: [1, -2, undefined as unknown as number], tone: "danger" as const },
    ];
    const { rerender } = render(<LineChart labels={labels} series={series} area />);
    rerender(<LineChart labels={labels} series={series} dark />);
    rerender(<BarChart labels={labels} series={series} stacked />);
    rerender(<BarChart labels={labels} series={series} dark />);
    expect(screen.getAllByText("fev")).not.toHaveLength(0);
  });

  it("sparkline com um ponto, vários e nenhum", () => {
    const { rerender, container } = render(<Sparkline values={[4]} />);
    rerender(<Sparkline values={[1, 1, 1]} area={false} tone="danger" />);
    rerender(<Sparkline values={[]} height={20} />);
    expect(container.querySelector("svg")).toBeNull();
  });

  it("lista de barras, medidor, segmentos e legenda", () => {
    render(
      <>
        <HBarList items={[{ label: "A", value: 3 }, { label: "B", value: 0, tone: "danger" }]} dark />
        <HBarList items={[]} />
        <Meter value={5} max={0} />
        <Meter value={150} max={100} tone="success" />
        <SegmentBar segments={[{ label: "x", value: 1, tone: "primary" }, { label: "y", value: 0, tone: "danger" }]} />
        <Legend items={[{ label: "Pago", tone: "success", value: "R$ 1" }, { label: "Aberto", tone: "previsto" }]} dark />
      </>,
    );
    expect(screen.getByText("Pago")).toBeInTheDocument();
    expect(screen.getByText("R$ 1")).toBeInTheDocument();
  });
});
