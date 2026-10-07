import { describe, expect, it } from "vitest";
import type { FinanceSummary } from "@/interfaces/finance/Finance.interface";
import {
  balanceStatus,
  balanceTone,
  buildMonthSummary,
  countLabel,
  money,
  percent,
  realized,
} from "./monthSummary";

const summary = (s: Partial<FinanceSummary>) =>
  ({
    paidAmount: 0,
    paidCount: 0,
    upcomingAmount: 0,
    upcomingCount: 0,
    overdueAmount: 0,
    overdueCount: 0,
    ...s,
  }) as FinanceSummary;

describe("buildMonthSummary", () => {
  it("saldo é caixa (pago) e a projeção soma o que falta dos dois lados", () => {
    const result = buildMonthSummary({
      paidRevenue: summary({ paidAmount: 5000, paidCount: 2 }),
      paidExpense: summary({ paidAmount: 2000, paidCount: 1 }),
      dueRevenue: summary({ upcomingAmount: 1000, overdueAmount: 500 }),
      dueExpense: summary({ upcomingAmount: 300, overdueAmount: 200 }),
    });
    expect(result.balance).toBe(3000);
    expect(result.projected).toBe(3000 + 1000 + 500 - 300 - 200);
    expect(result.inflow).toEqual({ amount: 5000, count: 2 });
  });

  it("sem resposta de um lado, o que depende dele fica nulo — não zero", () => {
    const result = buildMonthSummary({
      paidRevenue: summary({ paidAmount: 5000 }),
      paidExpense: null,
      dueRevenue: null,
      dueExpense: null,
    });
    expect(result.balance).toBeNull();
    expect(result.projected).toBeNull();
    expect(result.outflow).toBeNull();
  });
});

describe("exibição", () => {
  it("dinheiro arredondado, com sinal quando pedido e travessão sem número", () => {
    expect(money(1500)).toMatch(/R\$\s1\.500/);
    expect(money(-1500)).toMatch(/^−R\$/);
    expect(money(1500, { plus: true })).toMatch(/^\+R\$/);
    expect(money(null)).toBe("—");
  });

  it("realizado = pago ÷ (pago + previsto + atrasado), 0 sem movimento", () => {
    expect(realized({ amount: 50, count: 1 }, { amount: 25, count: 1 }, { amount: 25, count: 1 })).toBe(0.5);
    expect(realized(null, null, null)).toBe(0);
    expect(percent(0.456)).toBe("46%");
  });

  it("contagem no singular e no plural", () => {
    expect(countLabel({ amount: 1, count: 1 })).toBe("1 lançamento");
    expect(countLabel({ amount: 1, count: 3 }, "pagos")).toBe("3 lançamentos pagos");
    expect(countLabel(null)).toBe("");
  });

  it("negativo é perigo; sem dados é neutro", () => {
    expect(balanceTone(-1)).toBe("text-danger");
    expect(balanceTone(1)).toBe("text-primary");
    expect(balanceStatus(null).label).toBe("Sem dados");
    expect(balanceStatus(-5).label).toBe("Negativo");
    expect(balanceStatus(5).label).toBe("Positivo");
  });
});
