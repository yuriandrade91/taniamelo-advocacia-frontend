import { describe, expect, it } from "vitest";
import {
  toAddressRequest,
  toCreateRequest,
  toInterviewRequest,
  toPatchRequest,
  toPersonalDataRequest,
  toProfessionalDataRequest,
} from "./payloads";
import { serviceInitial } from "./sections/ServiceSection";
import { personalInitial } from "./sections/PersonalDataSection";
import { professionalInitial } from "./sections/ProfessionalDataSection";
import { addressInitial } from "./sections/AddressSection";
import { interviewInitial } from "./sections/InterviewSection";

const service = { ...serviceInitial, benefit: "APOSENTADORIA_RURAL", situation: "ANALISE_DOCUMENTAL" };
const personal = {
  ...personalInitial,
  fullName: "  Maria Aparecida  ",
  birthDate: "1961-03-12",
  cpf: "390.533.447-05",
  motherName: "Josefa da Silva",
  mobilePhone: "(31) 98888-1111",
  gender: "FEMININO",
};
const professional = { ...professionalInitial, inssPassword: "inss@123" };

describe("toCreateRequest", () => {
  it("apara espaços do nome", () => {
    expect(toCreateRequest(service, personal, professional).fullName).toBe(
      "Maria Aparecida",
    );
  });

  it("manda a CHAVE do enum, não o label", () => {
    const body = toCreateRequest(service, personal, professional);
    expect(body.benefit).toBe("APOSENTADORIA_RURAL");
    expect(body.gender).toBe("FEMININO");
  });

  it("campo opcional vazio some do JSON — não vai como string vazia", () => {
    const body = toCreateRequest(service, personal, professional);
    // A asserção é sobre o JSON serializado, que é o que a API recebe:
    // `undefined` é descartado por JSON.stringify, `""` não seria.
    const json = JSON.parse(JSON.stringify(body));
    expect("rg" in json).toBe(false);
    expect("email" in json).toBe(false);
    expect("profession" in json).toBe(false);
  });

  it("inclui a senha do INSS, que é obrigatória no create", () => {
    expect(toCreateRequest(service, personal, professional).inssPassword).toBe(
      "inss@123",
    );
  });
});

describe("toPatchRequest", () => {
  it("leva só os quatro campos que o PATCH aceita", () => {
    const json = JSON.parse(JSON.stringify(toPatchRequest(service)));
    expect(Object.keys(json).sort()).toEqual([
      "benefit",
      "notBillable",
      "situation",
    ]);
  });
});

describe("toProfessionalDataRequest", () => {
  it("manda o tempo de contribuição como três números", () => {
    const json = JSON.parse(
      JSON.stringify(
        toProfessionalDataRequest({
          ...professional,
          contributionYears: "33",
          contributionMonths: "11",
          contributionDays: "5",
        }),
      ),
    );
    expect(json.contributionYears).toBe(33);
    expect(json.contributionMonths).toBe(11);
    expect(json.contributionDays).toBe(5);
  });

  it("nunca envia os derivados — contributionInMonths e contributionTime saem do servidor", () => {
    const json = JSON.parse(
      JSON.stringify(
        toProfessionalDataRequest({
          ...professional,
          contributionYears: "33",
        }),
      ),
    );
    expect("contributionInMonths" in json).toBe(false);
    expect("contributionTime" in json).toBe(false);
  });

  it("tempo em branco SOME do JSON — não vira 0", () => {
    // Os três ausentes significam "não informado"; zero significa "não
    // contribuiu". Era essa distinção que o texto livre apagava, devolvendo 0
    // para "nao informado".
    const json = JSON.parse(
      JSON.stringify(toProfessionalDataRequest({ ...professional })),
    );
    expect("contributionYears" in json).toBe(false);
    expect("contributionMonths" in json).toBe(false);
    expect("contributionDays" in json).toBe(false);
  });

  it("zero informado VAI — é diferente de não informar", () => {
    const json = JSON.parse(
      JSON.stringify(
        toProfessionalDataRequest({
          ...professional,
          contributionYears: "0",
          contributionMonths: "0",
          contributionDays: "0",
        }),
      ),
    );
    expect(json.contributionYears).toBe(0);
    expect(json.contributionMonths).toBe(0);
    expect(json.contributionDays).toBe(0);
  });

  it("senha em branco SOME do JSON — não vai como string vazia", () => {
    // O campo nasce vazio na edição, porque a senha não volta em resposta
    // nenhuma desde que saiu do GET. Mandá-la vazia apagaria o acesso do
    // cliente ao INSS toda vez que alguém salvasse a aba. Ausente, o backend
    // mantém a que está gravada.
    const json = JSON.parse(
      JSON.stringify(
        toProfessionalDataRequest({ ...professional, inssPassword: "   " }),
      ),
    );
    expect("inssPassword" in json).toBe(false);
  });

  it("senha preenchida VAI — senão seria impossível trocá-la", () => {
    const json = JSON.parse(
      JSON.stringify(
        toProfessionalDataRequest({
          ...professional,
          inssPassword: "nova-senha",
        }),
      ),
    );
    expect(json.inssPassword).toBe("nova-senha");
  });
});

describe("toAddressRequest", () => {
  it("normaliza a UF para maiúsculas", () => {
    const body = toAddressRequest({
      ...addressInitial,
      street: " Rua das Acácias ",
      city: " Belo Horizonte ",
      state: "mg",
    });
    expect(body.state).toBe("MG");
    expect(body.street).toBe("Rua das Acácias");
    expect(body.city).toBe("Belo Horizonte");
  });
});

describe("toInterviewRequest", () => {
  it("converte datetime-local para ISO com fuso", () => {
    const body = toInterviewRequest({
      ...interviewInitial,
      occurredAt: "2026-09-02T14:30",
      durationMinutes: "45",
      content: "<p>ok</p>",
    });
    expect(body.occurredAt).toMatch(/^\d{4}-\d{2}-\d{2}T.*Z$/);
    expect(body.durationMinutes).toBe(45);
  });

  it("sem data e sem duração, os dois somem do JSON", () => {
    const json = JSON.parse(
      JSON.stringify(
        toInterviewRequest({ ...interviewInitial, content: "<p>ok</p>" }),
      ),
    );
    expect("occurredAt" in json).toBe(false);
    expect("durationMinutes" in json).toBe(false);
  });
});

describe("toPersonalDataRequest", () => {
  it("mantém os obrigatórios e descarta os vazios", () => {
    const json = JSON.parse(JSON.stringify(toPersonalDataRequest(personal)));
    expect(json.fullName).toBe("Maria Aparecida");
    expect(json.gender).toBe("FEMININO");
    expect("nationality" in json).toBe(false);
  });
});
