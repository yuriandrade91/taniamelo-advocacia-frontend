import { describe, expect, it } from "vitest";
import {
  BLANK,
  genderEnding,
  maritalWord,
  qualificationText,
  type QualificationInput,
} from "./qualification";

const empty: QualificationInput = {
  fullName: "",
  nationality: "",
  gender: "",
  maritalStatus: "",
  profession: "",
  birthDate: "",
  motherName: "",
  cpf: "",
  rg: "",
  rgIssuer: "",
  nitPis: "",
  street: "",
  addressNumber: "",
  neighborhood: "",
  city: "",
  state: "",
  zipCode: "",
  mobilePhone: "",
  email: "",
};

describe("qualificação da parte", () => {
  it("monta o parágrafo completo, concordando no feminino", () => {
    const text = qualificationText({
      ...empty,
      fullName: "Maria Aparecida da Silva",
      nationality: "Brasileira",
      gender: "FEMININO",
      maritalStatus: "CASADO",
      profession: "Costureira",
      birthDate: "1965-05-20",
      motherName: "Ana Rosa da Silva",
      cpf: "390.533.447-05",
      rg: "12.345.678-9",
      rgIssuer: "SSP/MG",
      nitPis: "123.45678.90-1",
      street: "Rua das Flores",
      addressNumber: "123",
      neighborhood: "Centro",
      city: "Belo Horizonte",
      state: "MG",
      zipCode: "30110-012",
      mobilePhone: "(31) 98888-7777",
      email: "maria@gmail.com",
    });

    expect(text).toBe(
      "MARIA APARECIDA DA SILVA, brasileira, casada, costureira, nascida em " +
        "20/05/1965, filha de Ana Rosa da Silva, inscrita no CPF sob o nº " +
        "390.533.447-05, portadora do RG nº 12.345.678-9 SSP/MG, NIT/PIS nº " +
        "123.45678.90-1, residente e domiciliada na Rua das Flores, nº 123, " +
        "bairro Centro, Belo Horizonte/MG, CEP 30110-012, telefone " +
        "(31) 98888-7777, e-mail maria@gmail.com.",
    );
  });

  it("concorda no masculino e usa o(a) sem gênero", () => {
    expect(genderEnding("MASCULINO")).toBe("o");
    expect(genderEnding("")).toBe("o(a)");
    expect(maritalWord("VIUVO", "FEMININO")).toBe("viúva");
    expect(maritalWord("VIUVO", "MASCULINO")).toBe("viúvo");
    expect(maritalWord("SOLTEIRO", "")).toBe("solteiro(a)");
    expect(qualificationText({ ...empty, gender: "MASCULINO" })).toContain(
      "nascido em",
    );
  });

  it("lacuna vazia vira traço para preencher à mão", () => {
    const text = qualificationText(empty);
    expect(text.startsWith(`${BLANK}, ${BLANK.toLowerCase()}`)).toBe(true);
    expect(text).toContain(`CPF sob o nº ${BLANK}`);
    expect(text).toContain("nascido(a) em");
  });
});
