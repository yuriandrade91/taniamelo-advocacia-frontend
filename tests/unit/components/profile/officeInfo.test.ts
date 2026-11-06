import { describe, expect, it } from "vitest";
import { LOGO_MAX_BYTES, logoFileError, officeValue, sendLabel } from "@/components/profile/officeInfo";
import type { Office } from "@/interfaces/tenant/Tenant.interface";

const office = (patch: Partial<Office> = {}): Office => ({
  id: "t1",
  slug: "tania",
  razaoSocial: "Tania Melo Advocacia",
  cnpj: "12.345.678/0001-90",
  status: "ativo",
  ...patch,
});

describe("arquivo da logo, antes de enviar", () => {
  it("aceita PNG, JPEG e WebP de até 2 MB", () => {
    for (const type of ["image/png", "image/jpeg", "image/webp"]) {
      expect(logoFileError({ type, size: LOGO_MAX_BYTES }), type).toBeNull();
    }
  });

  it("recusa SVG e o que não é imagem, que o servidor recusaria", () => {
    // SVG é documento: pode levar script, e a logo sai numa rota pública.
    for (const type of ["image/svg+xml", "application/pdf", ""]) {
      expect(logoFileError({ type, size: 10 }), type).toMatch(/PNG, JPEG ou WebP/);
    }
  });

  it("recusa acima de 2 MB sem gastar o envio", () => {
    expect(logoFileError({ type: "image/png", size: LOGO_MAX_BYTES + 1 })).toBe("A logo pode ter até 2 MB.");
  });
});

describe("dados do escritório na tela", () => {
  it("o telefone com o 55 do Brasil aparece como número nacional", () => {
    expect(officeValue(office({ telefone: "+551133334444" }), "telefone")).toBe("(11) 3333-4444");
    expect(officeValue(office({ telefone: "11987654321" }), "telefone")).toBe("(11) 98765-4321");
  });

  it("o que veio vazio vira traço, não espaço em branco", () => {
    expect(officeValue(office({ responsavel: null }), "responsavel")).toBe("—");
    expect(officeValue(office({ email: "   " }), "email")).toBe("—");
    expect(officeValue(office(), "cnpj")).toBe("12.345.678/0001-90");
  });
});

describe("rótulo do envio", () => {
  it("diz se é a primeira logo ou uma troca, e quando está enviando", () => {
    expect(sendLabel(false, false)).toBe("Enviar logo");
    expect(sendLabel(false, true)).toBe("Trocar logo");
    expect(sendLabel(true, true)).toBe("Enviando...");
  });
});
