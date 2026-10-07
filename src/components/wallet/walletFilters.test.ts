import { describe, expect, it } from "vitest";
import { bucketLabel, KIND_META } from "./entryKind";
import { expenseFilters, revenueFilters } from "./walletFilters";

describe("o vocabulário de cada lado da Carteira", () => {
  it("pago na saída, recebido na entrada; o resto é igual", () => {
    expect(bucketLabel("saida", "paid")).toBe("Pago");
    expect(bucketLabel("entrada", "paid")).toBe("Recebido");
    expect(bucketLabel("entrada", "overdue")).toBe("Atrasado");
    expect(bucketLabel("saida", "upcoming")).toBe("Previsto");
    expect(KIND_META.saida.partyLabel).toBe("Fornecedor");
    expect(KIND_META.entrada.partyLabel).toBe("Cliente");
  });
});

describe("filtros da Carteira", () => {
  it("categoria só existe na saída", () => {
    expect("category" in expenseFilters).toBe(true);
    expect("category" in revenueFilters).toBe(false);
  });

  it("o status fala a língua de cada aba", () => {
    expect(expenseFilters.bucket.options.map((o) => o.label)).toContain("Pago");
    expect(revenueFilters.bucket.options.map((o) => o.label)).toContain("Recebido");
  });
});
