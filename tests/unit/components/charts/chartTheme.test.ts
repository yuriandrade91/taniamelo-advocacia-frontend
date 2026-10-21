import { describe, expect, it } from "vitest";
import type { TooltipItem } from "chart.js";
import { baseBarOptions, baseLineOptions, barColors, areaFill } from "@/components/charts/chartTheme";

/** O item do tooltip do Chart.js, só com o que o callback lê. */
const item = (parsed: { x?: number; y?: number | null }, label?: string, indexAxis?: "x" | "y") =>
  ({ parsed, dataset: { label }, chart: { options: { indexAxis } } }) as unknown as TooltipItem<"bar">;

const money = (v: number) => `R$ ${v}`;

describe("chartTheme", () => {

  it("tooltip da barra lê x na barra deitada e y na em pé", () => {
    const label = baseBarOptions({ formatValue: money }).plugins!.tooltip!.callbacks!.label as (i: TooltipItem<"bar">) => string;
    expect(label(item({ x: 0, y: 7 }, "Pago"))).toBe("Pago: R$ 7");
    expect(label(item({ x: 9, y: 2 }, "Pago", "y"))).toBe("Pago: R$ 9");
    expect(label(item({ y: null }))).toBe(": R$ 0");
  });

  it("rótulo próprio do tooltip e do eixo", () => {
    const options = baseBarOptions({ formatValue: money, stacked: true, tooltipLabel: (raw, series) => `${series}=${raw}` });
    const label = options.plugins!.tooltip!.callbacks!.label as (i: TooltipItem<"bar">) => string;
    expect(label(item({ y: 3 }, "A"))).toBe("A=3");
    const tick = (options.scales!.y as { ticks: { callback: (v: string | number) => string } }).ticks.callback;
    expect(tick("12")).toBe("R$ 12");
  });

  it("linha: mesmo tooltip, com e sem rótulo próprio", () => {
    const plain = baseLineOptions({ formatValue: money });
    const label = plain.plugins!.tooltip!.callbacks!.label as unknown as (i: TooltipItem<"bar">) => string;
    expect(label(item({ y: 5 }, "Entradas"))).toBe("Entradas: R$ 5");
    expect(label(item({ y: null }))).toBe(": R$ 0");
    const custom = baseLineOptions({ formatValue: money, tooltipLabel: (raw) => `~${raw}` });
    expect((custom.plugins!.tooltip!.callbacks!.label as unknown as (i: TooltipItem<"bar">) => string)(item({ y: 1 }))).toBe("~1");
    const tick = (custom.scales!.y as { ticks: { callback: (v: string | number) => string } }).ticks.callback;
    expect(tick(4)).toBe("R$ 4");
  });

  it("cores derivadas", () => {
    expect(areaFill("#123456")).toBe("#1234561A");
    expect(barColors("#123456")).toMatchObject({ backgroundColor: expect.any(String) });
  });
});
