import { describe, expect, it } from "vitest";
import { canRegister, dueLabel, installmentOf, moneyOf, type Payment } from "@/components/payments/paymentDisplay";

const base = {
  id: "p",
  clientId: "c",
  clientName: "Maria",
  description: "Parcela",
  amount: 1500,
  dueDate: "2026-10-10",
  status: "Pendente",
  overdue: false,
} as Payment;

describe("paymentDisplay", () => {
  it("registrar recebimento só em atrasado e a vencer", () => {
    expect(canRegister(base)).toBe(true);
    expect(canRegister({ ...base, overdue: true })).toBe(true);
    expect(canRegister({ ...base, status: "Pago" })).toBe(false);
    expect(canRegister({ ...base, status: "Cancelado" })).toBe(false);
  });

  it("valor exato, ou travessão sem valor", () => {
    expect(moneyOf(base)).toMatch(/R\$\s1\.500,00/);
    expect(moneyOf({ ...base, amount: undefined })).toBe("—");
  });

  it("parcela só quando há número e total", () => {
    expect(installmentOf({ ...base, installmentNumber: 2, installmentTotal: 10 })).toEqual({ n: 2, total: 10 });
    expect(installmentOf(base)).toBeNull();
  });

  it("a frase do prazo, contada sobre o texto da data", () => {
    expect(dueLabel(base, "2026-10-05")).toBe("vence em 5 dias");
    expect(dueLabel(base, "2026-10-09")).toBe("vence amanhã");
    expect(dueLabel(base, "2026-10-10")).toBe("vence hoje");
    expect(dueLabel({ ...base, overdue: true }, "2026-10-11")).toBe("atrasado há 1 dia");
    expect(dueLabel({ ...base, overdue: true }, "2026-10-15")).toBe("atrasado há 5 dias");
    expect(dueLabel({ ...base, status: "Pago", paidDate: "2026-10-08" }, "2026-10-15")).toBe("recebido em 08/10/2026");
    expect(dueLabel({ ...base, status: "Cancelado" }, "2026-10-15")).toBe("cancelado");
  });
});
