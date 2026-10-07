import { describe, expect, it } from "vitest";
import { rulesOf, validateValues } from "@/components/ui/form/schema";
import {
  addressInitial,
  addressSchema,
  hasAddressInput,
  hasInterviewInput,
  interviewInitial,
  interviewSchema,
  personalInitial,
  personalSchema,
  professionalEditRules,
  professionalInitial,
  professionalSchema,
  serviceInitial,
  serviceSchema,
} from "./schemas";

/**
 * As regras do cliente vêm do schema, e o schema é o mesmo no cadastro e na
 * ficha — testar aqui é testar as duas telas.
 */

const validPerson = {
  ...personalInitial,
  fullName: "Maria Aparecida",
  birthDate: "1961-03-12",
  cpf: "390.533.447-05",
  motherName: "Josefa da Silva",
  mobilePhone: "(31) 98888-1111",
  gender: "FEMININO",
};

const errorsOf = <V extends Record<string, string | boolean>>(schema: Parameters<typeof rulesOf>[0], values: V) =>
  validateValues(rulesOf(schema) as never, values);

describe("dados pessoais", () => {
  it("um cadastro mínimo válido passa", () => {
    expect(errorsOf(personalSchema, validPerson)).toEqual({});
  });

  it("os @NotBlank/@NotNull do DTO são obrigatórios", () => {
    const errors = errorsOf(personalSchema, personalInitial);
    expect(Object.keys(errors).sort()).toEqual(
      ["birthDate", "cpf", "fullName", "gender", "mobilePhone", "motherName"].sort(),
    );
    expect(errors.gender).toBe("Selecione o gênero.");
  });

  it("CPF com dígito verificador errado é barrado (o mesmo algoritmo do backend)", () => {
    expect(errorsOf(personalSchema, { ...validPerson, cpf: "390.533.447-06" }).cpf).toBe("CPF inválido.");
  });

  it("nascimento no futuro e emissão do RG no futuro são barrados", () => {
    const errors = errorsOf(personalSchema, { ...validPerson, birthDate: "2999-01-01", rgIssueDate: "2999-01-01" });
    expect(errors.birthDate).toMatch(/futuro/);
    expect(errors.rgIssueDate).toBe("Emissão do RG não pode estar no futuro.");
  });

  it("opcionais só validam quando preenchidos", () => {
    expect(errorsOf(personalSchema, { ...validPerson, email: "", referencePhone: "" })).toEqual({});
    const errors = errorsOf(personalSchema, { ...validPerson, email: "sem-arroba", referencePhone: "123" });
    expect(errors.email).toBe("E-mail inválido.");
    expect(errors.referencePhone).toBe("Telefone inválido.");
  });
});

describe("dados profissionais", () => {
  it("a senha do INSS é obrigatória no cadastro", () => {
    expect(errorsOf(professionalSchema, professionalInitial).inssPassword).toBe("O campo Senha do INSS é obrigatório.");
  });

  it("na ficha a senha é opcional (vazia = mantém a gravada)", () => {
    expect(validateValues(professionalEditRules, professionalInitial)).toEqual({});
  });

  it("tempo de contribuição respeita as faixas do backend", () => {
    const errors = validateValues(professionalEditRules, {
      ...professionalInitial,
      contributionYears: "131",
      contributionMonths: "12",
      contributionDays: "30",
    });
    expect(errors).toEqual({
      contributionYears: "Anos: no máximo 130.",
      contributionMonths: "Meses: no máximo 11.",
      contributionDays: "Dias: no máximo 29.",
    });
  });

  it("NIT e CTPS validam o tamanho", () => {
    const errors = validateValues(professionalEditRules, { ...professionalInitial, nitPis: "123", ctps: "12" });
    expect(errors.nitPis).toBe("NIT/PIS deve ter 11 dígitos.");
    expect(errors.ctps).toBe("CTPS inválida.");
  });
});

describe("atendimento", () => {
  it("benefício e situação são obrigatórios", () => {
    expect(errorsOf(serviceSchema, serviceInitial)).toEqual({
      benefit: "Selecione o benefício pretendido.",
      situation: "Selecione a situação.",
    });
  });
});

describe("endereço", () => {
  it("logradouro, cidade e UF são obrigatórios; UF tem duas letras; CEP oito dígitos", () => {
    const errors = errorsOf(addressSchema, { ...addressInitial, state: "M", zipCode: "3014" });
    expect(errors.street).toBeDefined();
    expect(errors.city).toBeDefined();
    expect(errors.state).toBe("UF inválida.");
    expect(errors.zipCode).toBe("CEP deve ter 8 dígitos.");
  });

  it("isPrimary nasce verdadeiro e não conta como preenchimento", () => {
    expect(addressInitial.isPrimary).toBe(true);
    expect(hasAddressInput(addressInitial)).toBe(false);
    expect(hasAddressInput({ ...addressInitial, city: "BH" })).toBe(true);
  });
});

describe("entrevista", () => {
  it("o editor vazio (`<p></p>`) não conta como entrevista preenchida", () => {
    expect(hasInterviewInput({ ...interviewInitial, content: "<p></p>" })).toBe(false);
    expect(errorsOf(interviewSchema, { ...interviewInitial, content: "<p></p>" })).toEqual({});
  });

  it("mexeu na entrevista: o conteúdo passa a ser obrigatório", () => {
    const errors = errorsOf(interviewSchema, { ...interviewInitial, durationMinutes: "30", content: "<p> </p>" });
    expect(errors.content).toBe("O campo Conteúdo da entrevista é obrigatório.");
  });

  it("duração precisa ser positiva", () => {
    const errors = errorsOf(interviewSchema, { ...interviewInitial, durationMinutes: "0", content: "<p>ok</p>" });
    expect(errors.durationMinutes).toBe("Duração deve ser um número de minutos maior que zero.");
  });
});
