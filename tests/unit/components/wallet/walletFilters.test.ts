import { describe, expect, it } from "vitest";
import { bucketLabel, KIND_META } from "@/components/wallet/entryKind";
import { expenseFilters, revenueFilters } from "@/components/wallet/walletFilters";

describe("o vocabulário de cada lado da Carteira", () => {
  it("pago na saída, recebido na entrada; o resto é igual", () => {
    expect(bucketLabel("expense", "paid")).toBe("Pago");
    expect(bucketLabel("income", "paid")).toBe("Recebido");
    expect(bucketLabel("income", "overdue")).toBe("Atrasado");
    expect(bucketLabel("expense", "upcoming")).toBe("Previsto");
    expect(KIND_META.expense.partyLabel).toBe("Fornecedor");
    expect(KIND_META.income.partyLabel).toBe("Cliente");
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
