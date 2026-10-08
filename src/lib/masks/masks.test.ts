import { describe, expect, it } from "vitest";
import { maskCEP, maskCPF, maskCTPS, maskMobile, maskEmail, maskNIT, maskRG, maskPhone } from "./masks";

describe("máscaras", () => {
  it("CPF", () => {
    expect(maskCPF("52998224725")).toBe("529.982.247-25");
    expect(maskCPF("529.982")).toBe("529.982");
    expect(maskCPF("abc529")).toBe("529");
  });

  it("RG", () => {
    expect(maskRG("123456789")).toBe("12.345.678-9");
  });

  it("celular e telefone fixo", () => {
    expect(maskMobile("31988881111")).toBe("(31) 98888-1111");
    expect(maskPhone("3133334444")).toBe("(31) 3333-4444");
    expect(maskMobile("319888811119999")).toHaveLength(15);
  });

  it("e-mail perde os espaços", () => {
    expect(maskEmail(" ana @ x.com ")).toBe("ana@x.com");
  });

  it("NIT/PIS", () => {
    expect(maskNIT("12345678901")).toBe("123.45678.90-1");
  });

  it("CEP para em 8 dígitos", () => {
    expect(maskCEP("30140071")).toBe("30140-071");
    expect(maskCEP("301400719999")).toBe("30140-071");
  });

  it("CTPS: só o número, até 8 dígitos (a série tem campo próprio)", () => {
    expect(maskCTPS("1234567")).toBe("1234567");
    expect(maskCTPS("1234567/12345 MG")).toBe("12345671");
  });
});
