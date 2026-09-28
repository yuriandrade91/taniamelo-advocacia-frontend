import { describe, expect, it } from "vitest";
import {
  formatBRL,
  formatBRLCompact,
  formatDateBR,
  formatInstallment,
  parseAmountBRL,
} from "./format";

describe("formatBRL", () => {
  it("mantém os centavos — é valor que se confere contra extrato", () => {
    expect(formatBRL(1234.56)).toBe("R$ 1.234,56");
    expect(formatBRL(0)).toBe("R$ 0,00");
  });

  it("usa separador de milhar do pt-BR", () => {
    expect(formatBRL(1000000)).toBe("R$ 1.000.000,00");
  });
});

describe("formatBRLCompact", () => {
  it("arredonda — serve a indicador, não a linha auditável", () => {
    expect(formatBRLCompact(1234.56)).toBe("R$ 1.235");
    expect(formatBRLCompact(2684)).toBe("R$ 2.684");
  });
});

describe("formatDateBR", () => {
  it("converte ISO para dd/MM/yyyy", () => {
    expect(formatDateBR("2026-03-12")).toBe("12/03/2026");
  });

  it("não desloca o dia por fuso — o bug de new Date em UTC-3", () => {
    // Com `new Date("2026-01-01")` em UTC-3 isto viraria 31/12/2025.
    expect(formatDateBR("2026-01-01")).toBe("01/01/2026");
  });

  it("aceita timestamp completo e usa só a parte da data", () => {
    expect(formatDateBR("2026-03-12T23:30:00Z")).toBe("12/03/2026");
  });

  it("vazio e inválido viram travessão", () => {
    expect(formatDateBR(undefined)).toBe("—");
    expect(formatDateBR("")).toBe("—");
    expect(formatDateBR("12/03/2026")).toBe("—");
  });
});

describe("formatInstallment", () => {
  it("mostra parcela quando há as duas pontas", () => {
    expect(formatInstallment(2, 12)).toBe("2/12");
  });

  it("pagamento único vira travessão", () => {
    expect(formatInstallment(undefined, undefined)).toBe("—");
    expect(formatInstallment(1, undefined)).toBe("—");
  });
});

describe("parseAmountBRL", () => {
  it("padrão pt-BR: vírgula decimal, ponto de milhar", () => {
    expect(parseAmountBRL("1.234,56")).toBe(1234.56);
    expect(parseAmountBRL("1.234.567,89")).toBe(1234567.89);
    expect(parseAmountBRL("0,50")).toBe(0.5);
  });

  it("aceita o ponto decimal digitado no teclado numérico", () => {
    // Lido como milhar, isto viraria R$ 123.456 — cem vezes o valor.
    expect(parseAmountBRL("1234.56")).toBe(1234.56);
    expect(parseAmountBRL("10.5")).toBe(10.5);
  });

  it("ponto sozinho com 3 dígitos é milhar, não decimal", () => {
    expect(parseAmountBRL("1.234")).toBe(1234);
    expect(parseAmountBRL("1.234.567")).toBe(1234567);
  });

  it("ignora símbolo de moeda e espaços", () => {
    expect(parseAmountBRL("R$ 1.234,56")).toBe(1234.56);
    expect(parseAmountBRL("  250  ")).toBe(250);
  });

  it("entrada inválida é null, nunca zero", () => {
    // Zero é valor legítimo; confundir os dois esconderia o erro.
    expect(parseAmountBRL("")).toBeNull();
    expect(parseAmountBRL("abc")).toBeNull();
    expect(parseAmountBRL("R$")).toBeNull();
    expect(parseAmountBRL("0")).toBe(0);
  });

  it("aceita negativo", () => {
    expect(parseAmountBRL("-150,25")).toBe(-150.25);
  });
});
