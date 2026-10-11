import { describe, expect, it } from "vitest";

import {
  emptyPatch,
  paymentFormFrom,
  installmentStatus,
  paymentRules,
  toPaymentPatch,
  type PaymentFormValues,
} from "@/components/payments/paymentForm";
import { validateValues } from "@/components/ui/form/schema";
import type { ClientPaymentResponse } from "@/interfaces/client/ClientSubResources.interface";

const TODAY = "2026-09-29";

/** As regras que o formulário cobra, de uma vez sobre os valores — sem montar React. */
const validate = (values: PaymentFormValues) => validateValues(paymentRules(TODAY), values);

const installment: ClientPaymentResponse = {
  id: "p-1",
  description: "Atrasados da concessão",
  amount: 4200.5,
  installmentNumber: 1,
  installmentTotal: 3,
  dueDate: "2026-09-10",
  status: "Pendente",
  paymentMethod: "Pix",
  notes: "conferir extrato",
  overdue: true,
};

const form = (extra: Partial<PaymentFormValues> = {}): PaymentFormValues => ({
  ...paymentFormFrom(installment),
  ...extra,
});

describe("paymentFormFrom", () => {
  it("traz tudo que se edita, em texto", () => {
    expect(paymentFormFrom(installment)).toEqual({
      description: "Atrasados da concessão",
      amount: "4200,50",
      installmentNumber: "1",
      installmentTotal: "3",
      dueDate: "2026-09-10",
      isSettled: false,
      paidDate: "",
      paymentMethod: "PIX",
      notes: "conferir extrato",
      status: "Pendente",
    });
  });

  it("isSettled sai do status, não da data de pagamento", () => {
    // Cancelada com data antiga é caso real: cancelou-se depois de registrar.
    const cancelled = {
      ...installment,
      status: "Cancelado" as const,
      paidDate: "2026-08-01",
    };
    expect(paymentFormFrom(cancelled).isSettled).toBe(false);
    expect(
      paymentFormFrom({ ...installment, status: "Pago", paidDate: "2026-09-12" })
        .isSettled,
    ).toBe(true);
  });

  it("campos ausentes viram vazio, nunca undefined", () => {
    const lean: ClientPaymentResponse = {
      id: "p-2",
      description: "Benefício",
      dueDate: "2026-10-01",
      overdue: false,
    };
    const values = paymentFormFrom(lean);
    expect(values.amount).toBe("");
    expect(values.installmentNumber).toBe("");
    expect(values.paymentMethod).toBe("");
    expect(values.status).toBe("");
  });
});

describe("paymentRules", () => {
  it("aceita o registro como veio do servidor", () => {
    expect(validate(form())).toEqual({});
  });

  it("descrição vazia é erro", () => {
    expect(validate(form({ description: "  " })).description)
      .toBeTruthy();
  });

  it("valor zero é erro — o backend exige @DecimalMin(0.01)", () => {
    expect(validate(form({ amount: "0" })).amount).toBeTruthy();
  });

  it("parcela maior que o total é erro — '3/2' parece plausível na tabela", () => {
    const errors = validate(form({ installmentNumber: "3", installmentTotal: "2" }));
    expect(errors.installmentNumber).toBeTruthy();
  });

  it("marcar recebida sem data acusa a data", () => {
    const errors = validate(form({ isSettled: true, paidDate: "" }));
    expect(errors.paidDate).toBeTruthy();
  });
});

describe("installmentStatus", () => {
  it("a caixa manda em Pendente × Pago", () => {
    expect(installmentStatus(form({ isSettled: false }))).toBe("Pendente");
    expect(installmentStatus(form({ isSettled: true }))).toBe("Pago");
  });

  it("cancelada segue cancelada enquanto ninguém marca que entrou", () => {
    expect(installmentStatus(form({ status: "Cancelado" }))).toBe("Cancelado");
  });

  it("marcar recebida numa cancelada a reabre — é decisão explícita", () => {
    expect(
      installmentStatus(form({ status: "Cancelado", isSettled: true })),
    ).toBe("Pago");
  });
});

describe("toPaymentPatch", () => {
  it("sem mudança, patch vazio — PATCH que manda tudo enche a auditoria", () => {
    const patch = toPaymentPatch(form(), installment);
    expect(patch).toEqual({});
    expect(emptyPatch(patch)).toBe(true);
  });

  it("manda só o campo que mudou", () => {
    const patch = toPaymentPatch(form({ description: "Benefício de março" }), installment);
    expect(patch).toEqual({ description: "Benefício de março" });
  });

  it("valor vai como número, não como o texto digitado", () => {
    const patch = toPaymentPatch(form({ amount: "5.000,00" }), installment);
    expect(patch.amount).toBe(5000);
  });

  it("marcar recebida manda status e data juntos", () => {
    const patch = toPaymentPatch(
      form({ isSettled: true, paidDate: "2026-09-20" }),
      installment,
    );
    expect(patch).toMatchObject({ status: "Pago", paidDate: "2026-09-20" });
  });

  it("voltar para pendente manda o status e NÃO manda data", () => {
    // Mandar paidDate junto de Pendente é o caminho de "pendente com data de
    // pagamento" — estado contraditório que o backend limparia, mas que não
    // faz sentido enviar.
    const paid = { ...installment, status: "Pago" as const, paidDate: "2026-09-12" };
    const patch = toPaymentPatch(
      { ...paymentFormFrom(paid), isSettled: false },
      paid,
    );
    expect(patch.status).toBe("Pendente");
    expect(patch).not.toHaveProperty("paidDate");
  });

  it("corrigir só a data de uma parcela já paga manda só a data", () => {
    const paid = { ...installment, status: "Pago" as const, paidDate: "2026-09-12" };
    const patch = toPaymentPatch(
      { ...paymentFormFrom(paid), paidDate: "2026-09-15" },
      paid,
    );
    expect(patch).toEqual({ paidDate: "2026-09-15" });
  });

  it("editar a descrição de uma cancelada não a ressuscita", () => {
    const cancelled = { ...installment, status: "Cancelado" as const };
    const patch = toPaymentPatch(
      { ...paymentFormFrom(cancelled), description: "Texto novo" },
      cancelled,
    );
    expect(patch).toEqual({ description: "Texto novo" });
    expect(patch).not.toHaveProperty("status");
  });

  it("limpar a forma de pagamento manda undefined, não string vazia", () => {
    const patch = toPaymentPatch(form({ paymentMethod: "" }), installment);
    expect("paymentMethod" in patch).toBe(true);
    expect(patch.paymentMethod).toBeUndefined();
  });

  it("limpar a parcela manda undefined nos dois campos", () => {
    const patch = toPaymentPatch(
      form({ installmentNumber: "", installmentTotal: "" }),
      installment,
    );
    expect(patch.installmentNumber).toBeUndefined();
    expect(patch.installmentTotal).toBeUndefined();
  });

  it("espaço nas pontas da descrição não conta como mudança", () => {
    const patch = toPaymentPatch(
      form({ description: "  Atrasados da concessão  " }),
      installment,
    );
    expect(patch).toEqual({});
  });
});

