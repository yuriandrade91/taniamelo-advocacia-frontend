import { describe, expect, it } from "vitest";
import {
  amountTextOf,
  enumKeyOf,
  flagOf,
  numberTextOf,
  optionalInteger,
  optionalText,
  textOf,
} from "@/lib/formValues";
import { parseAmountBRL } from "@/lib/format";
import { getPaymentMethodKeyByLabel } from "@/enums/payment/Payment";

describe("API → campo", () => {
  it("ausente vira vazio, e zero sobrevive", () => {
    expect(textOf(undefined)).toBe("");
    expect(textOf(null)).toBe("");
    expect(textOf("Maria")).toBe("Maria");
    expect(numberTextOf(0)).toBe("0");
    expect(numberTextOf(undefined)).toBe("");
    expect(numberTextOf(Number.NaN)).toBe("");
    expect(flagOf(undefined)).toBe(false);
    expect(flagOf(true)).toBe(true);
  });
});

describe("amountTextOf", () => {
  it("usa vírgula decimal, que é o que o AmountField lê de volta", () => {
    expect(amountTextOf(1234.5)).toBe("1234,50");
  });

  it("não põe separador de milhar — o parse devolveria 1234 no lugar de 1234,56", () => {
    expect(amountTextOf(1234.56)).not.toContain(".");
  });

  it("ida e volta preserva o valor", () => {
    for (const amount of [0.01, 99.9, 1234.56, 1000000]) {
      expect(parseAmountBRL(amountTextOf(amount))).toBeCloseTo(amount, 2);
    }
  });

  it("ausente vira vazio, não 'NaN' nem '0,00'", () => {
    expect(amountTextOf(undefined)).toBe("");
    expect(amountTextOf(null)).toBe("");
    expect(amountTextOf(Number.NaN)).toBe("");
  });
});

describe("enumKeyOf", () => {
  it("troca o rótulo que a API devolve pela chave do select", () => {
    expect(enumKeyOf("Boleto", getPaymentMethodKeyByLabel)).toBe("BOLETO");
  });

  it("aceita a chave pronta — o backend aceita as duas na escrita", () => {
    expect(enumKeyOf("BOLETO", getPaymentMethodKeyByLabel)).toBe("BOLETO");
  });

  it("o que não é rótulo nem chave vira vazio, e o select mostra 'Selecione'", () => {
    expect(enumKeyOf("Cheque especial", getPaymentMethodKeyByLabel)).toBe("");
    expect(enumKeyOf(undefined, getPaymentMethodKeyByLabel)).toBe("");
  });
});

describe("campo → API", () => {
  it("texto vazio some do JSON; o resto vai aparado", () => {
    expect(optionalText("   ")).toBeUndefined();
    expect(optionalText(" Pix ")).toBe("Pix");
  });

  it("inteiro do campo; vazio ou quebrado vira undefined", () => {
    expect(optionalInteger("3")).toBe(3);
    expect(optionalInteger("")).toBeUndefined();
    expect(optionalInteger("1.5")).toBeUndefined();
  });
});
