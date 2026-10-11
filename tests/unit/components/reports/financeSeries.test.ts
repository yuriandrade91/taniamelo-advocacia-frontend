import { describe, expect, it } from "vitest";
import {
  buildFlowTimeline,
  toBalanceSlices,
  toCumulativeBalance,
} from "@/components/reports/financeSeries";

describe("toBalanceSlices", () => {
  it("ordena da maior para a menor", () => {
    const slices = toBalanceSlices([
      { category: "Marketing", amount: 100 },
      { category: "Aluguel", amount: 600 },
      { category: "Software", amount: 300 },
    ]);
    expect(slices.map((s) => s.label)).toEqual([
      "Aluguel",
      "Software",
      "Marketing",
    ]);
    expect(slices[0].percentage).toBe(60);
  });

  it("lista vazia ou total zero não vira gráfico", () => {
    expect(toBalanceSlices([])).toEqual([]);
    expect(toBalanceSlices([{ category: "Aluguel", amount: 0 }])).toEqual([]);
  });

  it("não muta a entrada ao ordenar", () => {
    const input = [
      { category: "A", amount: 1 },
      { category: "B", amount: 2 },
    ];
    toBalanceSlices(input);
    expect(input.map((i) => i.category)).toEqual(["A", "B"]);
  });
});

describe("buildFlowTimeline", () => {
  it("une os meses das duas séries", () => {
    const result = buildFlowTimeline(
      [{ month: "2026-01", paidAmount: 100 }],
      [{ month: "2026-02", paidAmount: 50 }],
    );
    expect(result).toEqual([
      { month: "2026-01", inflowAmount: 100, outflowAmount: 0 },
      { month: "2026-02", inflowAmount: 0, outflowAmount: 50 },
    ]);
  });

  it("mês só com despesa aparece — é justamente o mês ruim", () => {
    const result = buildFlowTimeline([], [{ month: "2026-03", paidAmount: 900 }]);
    expect(result).toHaveLength(1);
    expect(result[0].outflowAmount).toBe(900);
  });

  it("ordena por mês", () => {
    const result = buildFlowTimeline(
      [{ month: "2026-03", paidAmount: 1 }, { month: "2026-01", paidAmount: 2 }],
      [],
    );
    expect(result.map((r) => r.month)).toEqual(["2026-01", "2026-03"]);
  });

  it("duas séries vazias não viram gráfico", () => {
    expect(buildFlowTimeline([], [])).toEqual([]);
  });
});

describe("toCumulativeBalance", () => {
  it("acumula mês a mês", () => {
    const result = toCumulativeBalance([
      { month: "2026-01", inflowAmount: 100, outflowAmount: 40 },
      { month: "2026-02", inflowAmount: 80, outflowAmount: 30 },
    ]);
    expect(result.map((r) => r.cumulative)).toEqual([60, 110]);
  });

  it("mês negativo derruba o acumulado sem zerá-lo", () => {
    const result = toCumulativeBalance([
      { month: "2026-01", inflowAmount: 100, outflowAmount: 40 },
      { month: "2026-02", inflowAmount: 10, outflowAmount: 200 },
    ]);
    expect(result.map((r) => r.cumulative)).toEqual([60, -130]);
  });

  it("começa do zero — é saldo do período, não saldo bancário", () => {
    const result = toCumulativeBalance([
      { month: "2026-01", inflowAmount: 0, outflowAmount: 0 },
    ]);
    expect(result[0].cumulative).toBe(0);
  });

  it("série vazia devolve série vazia", () => {
    expect(toCumulativeBalance([])).toEqual([]);
  });
});
