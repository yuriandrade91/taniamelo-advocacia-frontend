import { describe, expect, it } from "vitest";
import {
  personalInitial,
  professionalInitial,
  professionalSchema,
  serviceInitial,
  serviceSchema,
} from "@/components/clients/form/schemas";
import { sectionFill, sheetProgress, toUpdateRequest } from "@/components/clients/details/clientSheet";

const sections = {
  service: { ...serviceInitial, benefit: "APOSENTADORIA_RURAL", situation: "ANALISE_DOCUMENTAL" },
  personal: {
    ...personalInitial,
    fullName: "Maria",
    birthDate: "1961-03-12",
    cpf: "390.533.447-05",
    motherName: "Josefa",
    mobilePhone: "(31) 98888-1111",
    gender: "FEMININO",
    rgIssuer: "SSP/MG",
    rgIssueDate: "2001-05-10",
  },
  professional: { ...professionalInitial },
};

describe("toUpdateRequest — o PUT é substituição total", () => {
  it("devolve o que a ficha não desenha (notas, responsável) como veio", () => {
    const body = toUpdateRequest(sections, { notes: "Ligar à tarde", responsibleUserId: "u-1" });
    expect(body.notes).toBe("Ligar à tarde");
    expect(body.responsibleUserId).toBe("u-1");
  });

  it("leva órgão emissor e emissão do RG — antes o PUT os apagava", () => {
    const body = toUpdateRequest(sections, {});
    expect(body.rgIssuer).toBe("SSP/MG");
    expect(body.rgIssueDate).toBe("2001-05-10");
  });

  it("a senha só vai quando digitada: vazia mantém a gravada", () => {
    expect("inssPassword" in toUpdateRequest(sections, {})).toBe(false);
    const typed = toUpdateRequest(
      { ...sections, professional: { ...professionalInitial, inssPassword: "nova" } },
      {},
    );
    expect(typed.inssPassword).toBe("nova");
  });

  it("devolve a etapa no INSS — ausente, o backend a apagaria", () => {
    expect(toUpdateRequest(sections, { requestStage: "Exigência" }).requestStage).toBe("Exigência");
    // Sem etapa (ainda não foi ao INSS), vai nulo explícito: continua sem etapa.
    expect(toUpdateRequest(sections, {}).requestStage).toBeNull();
  });

  it("notas ausentes não viram `null` no JSON", () => {
    const body = toUpdateRequest(sections, { notes: undefined });
    expect(JSON.parse(JSON.stringify(body))).not.toHaveProperty("notes");
  });
});

describe("sheetProgress", () => {
  it("conta os campos de texto preenchidos", () => {
    expect(sheetProgress({ service: serviceInitial, personal: personalInitial, professional: professionalInitial })).toBe(0);
    expect(sheetProgress(sections)).toBeGreaterThan(30);
  });
});

describe("sectionFill — o \"6/7\" ao lado do nome da seção", () => {
  it("conta só os campos de texto: a chave (isento) tem \"não\" como resposta", () => {
    const { filled, total } = sectionFill(serviceSchema, serviceInitial);
    // `notBillable` é booleano e fica de fora do total.
    expect(total).toBe(Object.keys(serviceSchema).length - 1);
    expect(filled).toBe(0);
  });

  it("espaço em branco não conta como preenchido", () => {
    expect(sectionFill(serviceSchema, { ...serviceInitial, benefit: "   " }).filled).toBe(0);
    expect(sectionFill(serviceSchema, { ...serviceInitial, benefit: "x" }).filled).toBe(1);
  });

  it("`skip` tira do total o que a ficha não recebe (a senha do INSS)", () => {
    const all = sectionFill(professionalSchema, professionalInitial);
    const withoutPassword = sectionFill(professionalSchema, professionalInitial, ["inssPassword"]);
    expect(withoutPassword.total).toBe(all.total - 1);
  });
});
