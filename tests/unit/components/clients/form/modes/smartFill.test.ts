import { describe, expect, it } from "vitest";
import { extractClientData, titleCase, type SmartFieldKey } from "@/components/clients/form/modes/smartFill";

const valueOf = (text: string, key: SmartFieldKey) =>
  extractClientData(text).find((field) => field.key === key)?.value;

const WHATSAPP = `Boa tarde doutora! Segue os dados da minha mãe:
Nome: MARIA APARECIDA DA SILVA
CPF 390.533.447-05
nascida em 20/05/1965
mãe: Ana Rosa da Silva
cel (31) 98888-7777
email maria.silva@gmail.com
Rua das Flores, 123 - bairro Centro, Belo Horizonte/MG CEP 30110-012
casada, trabalha como costureira, NIT 123.45678.90-1
Ela quer aposentadoria por idade`;

describe("extrair dados de uma mensagem colada", () => {
  const fields = extractClientData(WHATSAPP);
  const get = (key: SmartFieldKey) => fields.find((field) => field.key === key);

  it("reconhece os dados pessoais", () => {
    expect(get("fullName")?.value).toBe("Maria Aparecida da Silva");
    expect(get("cpf")?.value).toBe("390.533.447-05");
    expect(get("birthDate")?.value).toBe("1965-05-20");
    expect(get("birthDate")?.display).toBe("20/05/1965");
    expect(get("motherName")?.value).toBe("Ana Rosa da Silva");
    expect(get("mobilePhone")?.value).toBe("(31) 98888-7777");
    expect(get("email")?.value).toBe("maria.silva@gmail.com");
    expect(get("maritalStatus")?.value).toBe("CASADO");
  });

  it("reconhece endereço, trabalho e benefício", () => {
    expect(get("street")?.value).toBe("Rua das Flores");
    expect(get("addressNumber")?.value).toBe("123");
    expect(get("city")?.value).toBe("Belo Horizonte");
    expect(get("state")?.value).toBe("MG");
    expect(get("zipCode")?.value).toBe("30110-012");
    expect(get("profession")?.value).toBe("Costureira");
    expect(get("nitPis")?.value).toBe("123.45678.90-1");
    expect(get("benefit")?.value).toBe("APOSENTADORIA_POR_IDADE");
    expect(get("benefit")?.display).toBe("Aposentadoria por idade");
  });

  it("guarda o trecho de onde tirou cada valor, e diz para qual formulário vai", () => {
    expect(get("cpf")?.source).toContain("390.533.447-05");
    expect(get("street")?.target).toBe("address");
    expect(get("nitPis")?.target).toBe("professional");
    expect(get("benefit")?.target).toBe("service");
  });
});

describe("as regras que evitam confusão", () => {
  it("celular sem rótulo não vira CPF, e CPF sem pontuação só com rótulo", () => {
    const text = "contato 31988887777";
    expect(valueOf(text, "cpf")).toBeUndefined();
    expect(valueOf(text, "mobilePhone")).toBe("(31) 98888-7777");
    expect(valueOf("cpf: 39053344705", "cpf")).toBe("390.533.447-05");
  });

  it("o celular nunca é o mesmo número do CPF", () => {
    const text = "CPF 390.533.447-05";
    expect(valueOf(text, "mobilePhone")).toBeUndefined();
  });

  it("filiação: a mãe é quem vem depois do 'e'", () => {
    const text = "filho de José Pereira e Joana Pereira, nascido 01/02/1960";
    expect(valueOf(text, "motherName")).toBe("Joana Pereira");
    expect(valueOf(text, "gender")).toBe("MASCULINO");
  });

  it("recusa data impossível e data recente demais para ser nascimento", () => {
    expect(valueOf("nasc 31/02/1970", "birthDate")).toBeUndefined();
    const thisYear = new Date().getFullYear();
    expect(
      valueOf(`consulta em 10/03/${thisYear}`, "birthDate"),
    ).toBeUndefined();
  });

  it("benefício mais específico vence: professor antes de tempo de contribuição", () => {
    expect(
      valueOf(
        "aposentadoria por tempo de contribuição do professor",
        "benefit",
      ),
    ).toBe("APOSENTADORIA_POR_TEMPO_PROFESSOR");
    expect(valueOf("quer se aposentar como PcD", "benefit")).toBe(
      "APOSENTADORIA_POR_DEFICIENCIA",
    );
  });

  it("UF tem que existir", () => {
    expect(valueOf("Cidade Xyz/ZZ", "state")).toBeUndefined();
    expect(valueOf("Contagem - MG", "city")).toBe("Contagem");
  });

  it("texto vazio não inventa nada", () => {
    expect(extractClientData("")).toEqual([]);
    expect(extractClientData("oi, tudo bem?")).toEqual([]);
  });
});

describe("nome em caixa de título", () => {
  it("mantém as preposições minúsculas", () => {
    expect(titleCase("MARIA DAS DORES E SILVA")).toBe(
      "Maria das Dores e Silva",
    );
  });
});
