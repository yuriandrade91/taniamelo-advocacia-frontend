import { describe, expect, it } from "vitest";
import {
  cepPatch,
  decodeCepLookup,
  encodeCepLookup,
  isCepLocked,
  type CepFillable,
} from "./cepAutofill";

const empty: CepFillable = {
  zipCode: "30240-000",
  street: "",
  neighborhood: "",
  city: "",
  state: "",
};

describe("cepPatch", () => {
  it("preenche rua, bairro, cidade e UF com o que o CEP traz", () => {
    expect(
      cepPatch(empty, {
        zipCode: "30240-000",
        street: "Rua dos Timbiras",
        complement: "lado ímpar",
        neighborhood: "Funcionários",
        city: "Belo Horizonte",
        state: "MG",
      }),
    ).toEqual({
      zipCode: "30240-000",
      street: "Rua dos Timbiras",
      neighborhood: "Funcionários",
      city: "Belo Horizonte",
      state: "MG",
    });
  });

  it("CEP novo substitui o endereço anterior", () => {
    const previous = {
      ...empty,
      street: "Rua Velha",
      neighborhood: "Centro",
      city: "Contagem",
      state: "MG",
    };
    const next = cepPatch(previous, {
      zipCode: "01310-100",
      street: "Avenida Paulista",
      complement: null,
      neighborhood: "Bela Vista",
      city: "São Paulo",
      state: "SP",
    });
    expect(next.street).toBe("Avenida Paulista");
    expect(next.city).toBe("São Paulo");
  });

  it("CEP de município inteiro (sem rua nem bairro) não apaga o que foi digitado", () => {
    const typed = { ...empty, street: "Rua das Flores", neighborhood: "Centro" };
    const next = cepPatch(typed, {
      zipCode: "35460-000",
      street: "",
      complement: null,
      neighborhood: null,
      city: "Brumadinho",
      state: "mg",
    });
    expect(next).toEqual({
      zipCode: "35460-000",
      street: "Rua das Flores",
      neighborhood: "Centro",
      city: "Brumadinho",
      state: "MG",
    });
  });

  it("não devolve complemento: o do CEP não é o apartamento do cliente", () => {
    const next = cepPatch(empty, {
      zipCode: "30240-000",
      street: "Rua X",
      complement: "até 999 - lado par",
      neighborhood: "B",
      city: "C",
      state: "MG",
    });
    expect(next).not.toHaveProperty("complement");
  });
});

describe("isCepLocked", () => {
  const found = {
    zipCode: "30240-000",
    street: "Rua dos Timbiras",
    complement: null,
    neighborhood: "Funcionários",
    city: "Belo Horizonte",
    state: "MG",
  };
  const filled = cepPatch(empty, found);

  it("trava o que veio do CEP enquanto o CEP for o mesmo", () => {
    expect(isCepLocked(found, filled, "street")).toBe(true);
    expect(isCepLocked(found, filled, "city")).toBe(true);
    expect(isCepLocked(found, filled, "state")).toBe(true);
  });

  it("CEP trocado (ou incompleto) destrava", () => {
    expect(
      isCepLocked(found, { ...filled, zipCode: "30240-00" }, "street"),
    ).toBe(false);
  });

  it("não trava o que o CEP não trouxe: a pessoa precisa completar", () => {
    const city = { ...found, street: "", neighborhood: null };
    const values = cepPatch(empty, city);
    expect(isCepLocked(city, values, "street")).toBe(false);
    expect(isCepLocked(city, values, "neighborhood")).toBe(false);
    expect(isCepLocked(city, values, "city")).toBe(true);
  });

  it("valores que não são os do CEP não travam (ex.: aba que herdou outro endereço)", () => {
    expect(
      isCepLocked(found, { ...filled, street: "Rua Outra" }, "street"),
    ).toBe(false);
  });

  it("sem consulta, nada trava", () => {
    expect(isCepLocked(null, filled, "street")).toBe(false);
  });
});

describe("encodeCepLookup / decodeCepLookup", () => {
  it("vai e volta sem perder campo", () => {
    const found = {
      zipCode: "30240-000",
      street: "Rua dos Timbiras",
      complement: null,
      neighborhood: "Funcionários",
      city: "Belo Horizonte",
      state: "MG",
    };
    expect(decodeCepLookup(encodeCepLookup(found))).toEqual(found);
  });

  it("vazio ou ilegível não trava nada", () => {
    expect(encodeCepLookup(null)).toBe("");
    expect(decodeCepLookup("")).toBeNull();
    expect(decodeCepLookup(undefined)).toBeNull();
    expect(decodeCepLookup("{quebrado")).toBeNull();
  });
});
