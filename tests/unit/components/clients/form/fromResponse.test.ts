import { describe, expect, it } from "vitest";
import {
  instantToLocalInput,
  toAddressValues,
  toInterviewValues,
  toPersonalValues,
  toProfessionalValues,
  toServiceValues,
} from "@/components/clients/form/fromResponse";
import type { ClientDetails } from "@/interfaces/client/Client.interface";
import type { ClientAddressResponse } from "@/interfaces/client/ClientSubResources.interface";

const client = (extra: Partial<ClientDetails> = {}): ClientDetails =>
  ({
    id: "c-1",
    fullName: "Maria Aparecida",
    birthDate: "1966-04-12",
    cpf: "123.456.789-09",
    motherName: "Ana",
    mobilePhone: "(11) 99999-0000",
    gender: "Feminino",
    benefit: "Aposentadoria por idade",
    situation: "Análise documental",
    ...extra,
  }) as ClientDetails;

describe("rótulo → chave", () => {
  it("converte o label que a API devolve na chave que o select usa", () => {
    const values = toServiceValues(client());
    expect(values.benefit).toBe("APOSENTADORIA_POR_IDADE");
    expect(values.situation).toBe("ANALISE_DOCUMENTAL");
  });

  it("aceita a chave quando ela já vem assim", () => {
    // O backend aceita os dois na escrita (@JsonCreator); um registro gravado
    // por outro caminho pode voltar com a chave. Devolver "" apagaria a seleção.
    const values = toServiceValues(
      client({ benefit: "APOSENTADORIA_RURAL" as ClientDetails["benefit"] }),
    );
    expect(values.benefit).toBe("APOSENTADORIA_RURAL");
  });

  it("devolve vazio para valor irreconhecível, em vez de propagar lixo", () => {
    const values = toServiceValues(
      client({ situation: "coisa nenhuma" as ClientDetails["situation"] }),
    );
    expect(values.situation).toBe("");
  });

  it("converte gênero e estado civil", () => {
    const values = toPersonalValues(
      client({ maritalStatus: "Casado(a)" as ClientDetails["maritalStatus"] }),
    );
    expect(values.gender).toBe("FEMININO");
    expect(values.maritalStatus).not.toBe("");
  });
});

describe("campos ausentes", () => {
  it("vira string vazia, nunca undefined", () => {
    const values = toPersonalValues(client());
    // `value={undefined}` torna o input não-controlado e o React reclama na
    // primeira digitação.
    for (const value of Object.values(values)) {
      expect(value === undefined).toBe(false);
    }
    expect(values.rg).toBe("");
    expect(values.email).toBe("");
  });

  it("switch ausente vira false, não undefined", () => {
    const values = toPersonalValues(client());
    expect(values.isWhatsapp).toBe(false);
    expect(values.hasDisability).toBe(false);
  });

  it("preserva o zero, que é valor legítimo", () => {
    const values = toInterviewValues({
      id: "i-1",
      content: "x",
      durationMinutes: 0,
    });
    expect(values.durationMinutes).toBe("0");
  });
});

describe("dados profissionais", () => {
  it("lê do ClientDetails quando o sub-recurso não foi buscado", () => {
    const values = toProfessionalValues(
      client({ profession: "Costureira", nitPis: "12345678901" }),
    );
    expect(values.profession).toBe("Costureira");
    expect(values.nitPis).toBe("123.45678.90-1");
  });

  it("CTPS não é mascarada na carga: a máscara corta no 8º dígito", () => {
    // Registro antigo com número, série e UF no mesmo campo chega inteiro — a
    // ficha abre o que está gravado, não uma versão truncada dele.
    const values = toProfessionalValues(client({ ctps: "1234567/00123 MG" }));
    expect(values.ctps).toBe("1234567/00123 MG");
  });
});

describe("máscaras na carga", () => {
  it("o que vem cru da API abre com a máscara do campo", () => {
    const values = toPersonalValues(
      client({ cpf: "48670715791", rg: "123456789", mobilePhone: "31999990000" }),
    );
    expect(values.cpf).toBe("486.707.157-91");
    expect(values.rg).toBe("12.345.678-9");
    expect(values.mobilePhone).toBe("(31) 99999-0000");
  });

  it("telefone gravado com DDI fica como está", () => {
    // `+5531999990000` é aceito pelo backend; a máscara brasileira o leria
    // como DDD 55 e gravaria de volta um telefone que ninguém digitou.
    const values = toPersonalValues(client({ mobilePhone: "+5531999990000" }));
    expect(values.mobilePhone).toBe("+5531999990000");
  });
});

describe("endereço", () => {
  const address = (extra: Partial<ClientAddressResponse> = {}) =>
    ({
      id: "a-1",
      street: "Rua A",
      city: "São Paulo",
      state: "SP",
      ...extra,
    }) as ClientAddressResponse;

  it("converte o tipo de endereço para chave", () => {
    const values = toAddressValues(address({ addressType: "Residencial" }));
    expect(values.addressType).toBe("RESIDENCIAL");
  });

  it("isPrimary ausente vira false — não presume principal", () => {
    expect(toAddressValues(address()).isPrimary).toBe(false);
  });
});

describe("instantToLocalInput", () => {
  it("converte Instant para o horário local do campo", () => {
    // O campo espera `YYYY-MM-DDTHH:mm` sem fuso. Recortar a string do ISO
    // daria o horário UTC — uma entrevista das 15h apareceria às 18h.
    const local = instantToLocalInput("2026-03-12T18:00:00Z");
    expect(local).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(local).not.toContain("Z");
    expect(local.length).toBe(16);
  });

  it("devolve vazio para ausente ou inválido", () => {
    expect(instantToLocalInput(undefined)).toBe("");
    expect(instantToLocalInput(null)).toBe("");
    expect(instantToLocalInput("lixo")).toBe("");
  });
});
