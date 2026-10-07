import { describe, expect, it } from "vitest";
import {
  EMPTY_VALUE,
  cpfOf,
  display,
  formatDate,
  isExempt,
  isLead,
  updatedOf,
} from "./clientDisplay";

describe("display", () => {
  it("vazio, nulo e só espaços viram o mesmo traço", () => {
    expect(display(undefined)).toBe(EMPTY_VALUE);
    expect(display(null)).toBe(EMPTY_VALUE);
    expect(display("   ")).toBe(EMPTY_VALUE);
    expect(display("Aposentadoria por idade")).toBe("Aposentadoria por idade");
  });
});

describe("formatDate", () => {
  it("instante válido vira dd/mm/aaaa; inválido vira o traço", () => {
    expect(formatDate("2026-03-15T15:00:00Z")).toBe("15/03/2026");
    expect(formatDate("não é data")).toBe(EMPTY_VALUE);
    expect(formatDate(undefined)).toBe(EMPTY_VALUE);
  });
});

describe("updatedOf", () => {
  it("só mostra quando mudou depois do registro", () => {
    const at = "2026-03-15T15:00:00Z";
    expect(updatedOf({ createdAt: at, updatedAt: at })).toBe(EMPTY_VALUE);
    expect(updatedOf({ createdAt: at })).toBe(EMPTY_VALUE);
    expect(updatedOf({ createdAt: at, updatedAt: "2026-04-02T15:00:00Z" })).toBe("02/04/2026");
  });
});

describe("cpfOf", () => {
  it("mascara o CPF; sem CPF, string vazia (o CopyableValue põe o traço)", () => {
    expect(cpfOf({ cpf: "12345678901" })).toBe("123.456.789-01");
    expect(cpfOf({ cpf: "" })).toBe("");
  });
});

describe("isLead / isExempt", () => {
  it("potencial é lead, pelo rótulo ou pela chave", () => {
    expect(isLead({ clientType: "Potencial" })).toBe(true);
    expect(isLead({ clientType: "POTENCIAL" })).toBe(true);
    expect(isLead({ clientType: "Verificado" })).toBe(false);
    expect(isLead({})).toBe(false);
  });

  it("isento é o notBillable da API; ausente não é isento", () => {
    expect(isExempt({ notBillable: true })).toBe(true);
    expect(isExempt({ notBillable: false })).toBe(false);
    expect(isExempt({})).toBe(false);
  });
});
