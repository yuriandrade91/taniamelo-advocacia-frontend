import { describe, expect, it } from "vitest";
import type { ClientPaymentResponse } from "@/interfaces/client/ClientSubResources.interface";
import { agreementOf, agreementTotals, installmentCounts } from "@/components/payments/installmentTrail";

const installment = (n: number, extra: Partial<ClientPaymentResponse> = {}) =>
  ({
    id: `p${n}`,
    description: `Acordo - ${n}/4`,
    amount: 100,
    dueDate: `2026-0${n}-10`,
    status: "Pendente",
    installmentNumber: n,
    installmentTotal: 4,
    ...extra,
  }) as ClientPaymentResponse;

describe("agreementOf", () => {
  it("casa as parcelas pelo total e pela descrição sem o número", () => {
    const other = { ...installment(2), description: "Outro acordo 2/4", id: "x" };
    const byNumber = agreementOf(installment(1), [installment(1), installment(2), installment(3), other]);
    expect([...byNumber.keys()].sort()).toEqual([1, 2, 3]);
    expect(byNumber.get(2)?.id).toBe("p2");
  });

  it("total diferente é outro acordo", () => {
    const byNumber = agreementOf(installment(1), [installment(2, { installmentTotal: 6 })]);
    expect(byNumber.has(2)).toBe(false);
  });

  it("a parcela da tela é sempre a que vale", () => {
    const fromScreen = installment(1, { amount: 999 });
    expect(agreementOf(fromScreen, [installment(1)]).get(1)?.amount).toBe(999);
  });
});

describe("agreementTotals", () => {
  it("soma o lançado não cancelado, separa o recebido e conta as não lançadas", () => {
    const byNumber = new Map([
      [1, installment(1, { status: "Pago" })],
      [2, installment(2)],
      [3, installment(3, { status: "Cancelado" })],
    ]);
    expect(agreementTotals(byNumber, 4)).toEqual({ total: 200, received: 100, remaining: 100, missing: 1 });
  });
});

describe("installmentCounts", () => {
  it("conta recebidas, atrasadas e a vencer, sem as canceladas", () => {
    const byNumber = new Map([
      [1, installment(1, { status: "Pago" })],
      [2, installment(2, { overdue: true })],
      [3, installment(3)],
      [4, installment(4, { status: "Cancelado" })],
    ]);
    expect(installmentCounts(byNumber)).toEqual({ paid: 1, overdue: 1, upcoming: 1 });
  });
});
