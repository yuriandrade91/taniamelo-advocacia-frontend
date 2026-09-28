import { describe, expect, it } from "vitest";
import {
  formatMonthLabel,
  monthName,
  monthRange,
  shiftMonth,
} from "./period";

describe("monthRange", () => {
  it("cobre o mês inteiro", () => {
    expect(monthRange({ year: 2026, month: 9 })).toEqual({
      from: "2026-09-01",
      to: "2026-09-30",
    });
  });

  it("resolve fevereiro sem tabela de bissexto", () => {
    expect(monthRange({ year: 2026, month: 2 }).to).toBe("2026-02-28");
    expect(monthRange({ year: 2024, month: 2 }).to).toBe("2024-02-29");
  });

  it("preenche zero à esquerda", () => {
    expect(monthRange({ year: 2026, month: 1 })).toEqual({
      from: "2026-01-01",
      to: "2026-01-31",
    });
  });
});

describe("shiftMonth", () => {
  it("anda para frente e para trás dentro do ano", () => {
    expect(shiftMonth({ year: 2026, month: 5 }, 1)).toEqual({ year: 2026, month: 6 });
    expect(shiftMonth({ year: 2026, month: 5 }, -1)).toEqual({ year: 2026, month: 4 });
  });

  it("vira o ano em dezembro → janeiro", () => {
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
  });

  it("vira o ano em janeiro → dezembro", () => {
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
  });

  it("aguenta salto maior que um ano", () => {
    expect(shiftMonth({ year: 2026, month: 3 }, 14)).toEqual({ year: 2027, month: 5 });
    expect(shiftMonth({ year: 2026, month: 3 }, -14)).toEqual({ year: 2025, month: 1 });
  });

  it("delta zero não move", () => {
    expect(shiftMonth({ year: 2026, month: 7 }, 0)).toEqual({ year: 2026, month: 7 });
  });
});

describe("rótulos", () => {
  it("formata mês e ano", () => {
    expect(formatMonthLabel({ year: 2026, month: 3 })).toBe("Março de 2026");
    expect(monthName({ year: 2026, month: 3 })).toBe("Março");
  });
});
