import { describe, expect, it } from "vitest";
import {
  createdRange,
  lastMonths,
  monthKey,
  toSituationCounts,
  withMovingAverage,
  stateOf,
  worstOf,
} from "@/components/reports/reportSeries";

describe("lastMonths", () => {
  it("termina no mês pedido e atravessa a virada do ano", () => {
    expect(lastMonths({ year: 2026, month: 2 }, 4).map(monthKey)).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
    ]);
  });
});

describe("createdRange", () => {
  it("cobre o mês inteiro", () => {
    expect(createdRange({ year: 2026, month: 2 })).toEqual({
      createdFrom: "2026-02-01",
      createdTo: "2026-02-28",
    });
  });
});

describe("toSituationCounts", () => {
  it("mantém a ordem da esteira e zera o que faltou", () => {
    const result = toSituationCounts({
      BENEFICIO_CONCLUIDO: 4,
      FORMULARIO_PREENCHIDO: 7,
    });
    expect(result.map((r) => r.key)).toEqual([
      "FORMULARIO_PREENCHIDO",
      "ANALISE_DOCUMENTAL",
      "PLANEJAMENTO_EM_EXECUCAO",
      "PLANEJAMENTO_CONCLUIDO",
      "BENEFICIO_FUTURO",
      "BENEFICIO_CONCLUIDO",
    ]);
    expect(result.map((r) => r.count)).toEqual([7, 0, 0, 0, 0, 4]);
  });
});

describe("withMovingAverage", () => {
  const point = (month: string, verified: number, potential: number) => ({
    month,
    verified,
    potential,
  });

  it("usa os meses de base e devolve só os visíveis", () => {
    const result = withMovingAverage(
      [
        point("2026-01", 1, 2), // 3
        point("2026-02", 3, 3), // 6
        point("2026-03", 4, 5), // 9
        point("2026-04", 0, 0), // 0
      ],
      2,
    );
    expect(result.map((r) => r.month)).toEqual(["2026-03", "2026-04"]);
    expect(result.map((r) => r.average)).toEqual([6, 5]);
  });

  it("arredonda para uma casa", () => {
    const [last] = withMovingAverage(
      [point("a", 1, 0), point("b", 1, 0), point("c", 0, 0)],
      1,
    );
    expect(last.average).toBe(0.7);
  });
});

describe("estado da carga", () => {
  const ok = { status: "fulfilled", value: 1 } as const;
  const fail = { status: "rejected", reason: new Error("x") } as const;

  it("ready sem falha, error se tudo falhou, partial no meio", () => {
    expect(stateOf([ok, ok])).toBe("ready");
    expect(stateOf([fail, fail])).toBe("error");
    expect(stateOf([ok, fail])).toBe("partial");
  });

  it("o pior de dois blocos: um só com erro já é parcial", () => {
    expect(worstOf("error", "error")).toBe("error");
    expect(worstOf("error", "ready")).toBe("partial");
    expect(worstOf("partial", "ready")).toBe("partial");
    expect(worstOf("loading", "ready")).toBe("loading");
    expect(worstOf("ready", "ready")).toBe("ready");
  });
});
