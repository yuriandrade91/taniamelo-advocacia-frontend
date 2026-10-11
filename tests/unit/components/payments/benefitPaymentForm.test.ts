import { describe, expect, it } from "vitest";
import {
  emptyBenefitPayment,
  toBenefitPaymentRequest,
  toBenefitReceivedPatch,
  validateBenefitPayment,
} from "@/components/payments/benefitPaymentForm";

const TODAY = "2026-10-05";
const valid = {
  ...emptyBenefitPayment(),
  clientId: "c-1",
  clientName: "Maria",
  description: "Atrasados",
  amount: "4.200,00",
  expectedDate: "2026-10-20",
};

describe("validateBenefitPayment", () => {
  it("um lançamento completo passa", () => {
    expect(validateBenefitPayment(valid, TODAY)).toEqual({});
  });

  it("vazio acusa cliente, descrição, valor e previsão", () => {
    const errors = validateBenefitPayment(emptyBenefitPayment(), TODAY);
    expect(Object.keys(errors).sort()).toEqual(["amount", "clientName", "description", "expectedDate"].sort());
  });

  it("valor precisa ser número positivo", () => {
    expect(validateBenefitPayment({ ...valid, amount: "abc" }, TODAY).amount).toBe("Valor inválido.");
    expect(validateBenefitPayment({ ...valid, amount: "0" }, TODAY).amount).toBe("O valor deve ser maior que zero.");
  });

  it("recebido pede uma data que não esteja no futuro", () => {
    const received = { ...valid, isReceived: true, receivedDate: "2026-12-01" };
    expect(validateBenefitPayment(received, TODAY).receivedDate).toBeDefined();
    expect(validateBenefitPayment({ ...received, receivedDate: "2026-10-01" }, TODAY)).toEqual({});
  });
});

describe("payloads", () => {
  it("o POST leva o valor em número e a previsão como vencimento, sem status", () => {
    const body = toBenefitPaymentRequest({ ...valid, installmentNumber: "2", installmentTotal: "10" });
    expect(body).toMatchObject({ description: "Atrasados", amount: 4200, dueDate: "2026-10-20", installmentNumber: 2, installmentTotal: 10 });
    expect(body).not.toHaveProperty("status");
  });

  it("o PATCH de recebido só existe quando o cliente já recebeu", () => {
    expect(toBenefitReceivedPatch(valid)).toBeNull();
    expect(toBenefitReceivedPatch({ ...valid, isReceived: true, receivedDate: "2026-10-01" })).toEqual({
      status: "PAGO",
      paidDate: "2026-10-01",
    });
  });
});
