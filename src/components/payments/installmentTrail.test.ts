import { describe, expect, it } from "vitest";
import type { ClientPaymentResponse } from "@/interfaces/client/ClientSubResources.interface";
import { agreementOf, agreementTotals } from "./installmentTrail";

const parcela = (n: number, extra: Partial<ClientPaymentResponse> = {}) =>
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
    const outra = { ...parcela(2), description: "Outro acordo 2/4", id: "x" };
    const byNumber = agreementOf(parcela(1), [parcela(1), parcela(2), parcela(3), outra]);
    expect([...byNumber.keys()].sort()).toEqual([1, 2, 3]);
    expect(byNumber.get(2)?.id).toBe("p2");
  });

  it("total diferente é outro acordo", () => {
    const byNumber = agreementOf(parcela(1), [parcela(2, { installmentTotal: 6 })]);
    expect(byNumber.has(2)).toBe(false);
  });

  it("a parcela da tela é sempre a que vale", () => {
    const daTela = parcela(1, { amount: 999 });
    expect(agreementOf(daTela, [parcela(1)]).get(1)?.amount).toBe(999);
  });
});

describe("agreementTotals", () => {
  it("soma o lançado não cancelado, separa o recebido e conta as não lançadas", () => {
    const byNumber = new Map([
      [1, parcela(1, { status: "Pago" })],
      [2, parcela(2)],
      [3, parcela(3, { status: "Cancelado" })],
    ]);
    expect(agreementTotals(byNumber, 4)).toEqual({ total: 200, received: 100, remaining: 100, missing: 1 });
  });
});
