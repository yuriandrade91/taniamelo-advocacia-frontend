import { describe, expect, it } from "vitest";
import {
  buildFlowTimeline,
  buildWalletOverview,
  formatMonthAxis,
  toBalanceSlices,
  toCumulativeBalance,
} from "./walletOverview";
import type { OfficePaymentSummary } from "@/interfaces/payment/OfficePayment.interface";
import type { OfficeExpenseSummary } from "@/interfaces/finance/OfficeExpense.interface";

const payments = (paidAmount: number, paidCount = 1): OfficePaymentSummary => ({
  overdueAmount: 999,
  overdueCount: 9,
  upcomingAmount: 999,
  upcomingCount: 9,
  paidAmount,
  paidCount,
  totalAmount: 0,
});

const expenses = (paidAmount: number, paidCount = 1): OfficeExpenseSummary => ({
  overdueAmount: 777,
  overdueCount: 7,
  upcomingAmount: 777,
  upcomingCount: 7,
  paidAmount,
  paidCount,
  totalAmount: 0,
  byCategory: [],
});

describe("buildWalletOverview", () => {
  it("saldo é entrada menos saída", () => {
    const result = buildWalletOverview(payments(10000), expenses(4000));
    expect(result.inflowAmount).toBe(10000);
    expect(result.outflowAmount).toBe(4000);
    expect(result.balance).toBe(6000);
  });

  it("saldo negativo é resultado válido, não erro", () => {
    expect(buildWalletOverview(payments(1000), expenses(2500)).balance).toBe(
      -1500,
    );
  });

  it("usa só o que foi PAGO — atrasado e a vencer não entram no caixa", () => {
    // Os resumos trazem overdue/upcoming preenchidos de propósito.
    const result = buildWalletOverview(payments(100), expenses(40));
    expect(result.inflowAmount).toBe(100);
    expect(result.outflowAmount).toBe(40);
  });

  it("endpoint ausente vira zero, não NaN", () => {
    const result = buildWalletOverview(null, null);
    expect(result).toEqual({
      inflowAmount: 0,
      inflowCount: 0,
      outflowAmount: 0,
      outflowCount: 0,
      balance: 0,
    });
  });

  it("só um dos dois disponível ainda compõe", () => {
    expect(buildWalletOverview(payments(500), null).balance).toBe(500);
    expect(buildWalletOverview(null, expenses(500)).balance).toBe(-500);
  });
});

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

describe("formatMonthAxis", () => {
  it("encurta para o eixo", () => {
    expect(formatMonthAxis("2026-03")).toBe("mar/26");
    expect(formatMonthAxis("2026-12")).toBe("dez/26");
  });

  it("fora do formato volta como veio", () => {
    expect(formatMonthAxis("marco")).toBe("marco");
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
