import { describe, expect, it } from "vitest";
import {
  buildClientReview,
  splitBlankOptional,
  totalMissing,
  type ClientReviewInput,
  type ReviewSection,
  type ReviewSectionKey,
} from "./review";
import type { DisabilityPeriodDraft } from "./disabilityPeriods";
import {
  addressInitial,
  interviewInitial,
  personalInitial,
  professionalInitial,
  serviceInitial,
} from "./schemas";

/** Valores em branco, como o formulário nasce — os do schema (puro, roda em Node). */
const blank = (): ClientReviewInput => ({
  service: { ...serviceInitial },
  personal: { ...personalInitial },
  professional: { ...professionalInitial },
  addresses: [{ label: "Endereço 1", values: { ...addressInitial }, hasInput: false }],
  interview: { values: { ...interviewInitial }, hasInput: false },
  disability: null,
  documents: [],
  simulations: [],
});

const sectionOf = (sections: ReviewSection[], key: ReviewSectionKey) => {
  const found = sections.find((entry) => entry.key === key);
  if (!found) throw new Error(`seção ${key} ausente`);
  return found;
};

const itemOf = (
  sections: ReviewSection[],
  key: ReviewSectionKey,
  label: string,
) => {
  const found = sectionOf(sections, key)
    .groups.flatMap((group) => group.items)
    .find((entry) => entry.label === label);
  if (!found) throw new Error(`item ${label} ausente em ${key}`);
  return found;
};

describe("a revisão do cadastro", () => {
  it("lista as seções na ordem do formulário", () => {
    const keys = buildClientReview(blank()).map((section) => section.key);
    expect(keys).toEqual([
      "service",
      "personal",
      "professional",
      "address",
      "interview",
      "documents",
    ]);
  });

  it("mostra todos os campos das três seções do POST, mesmo vazios", () => {
    const review = buildClientReview(blank());
    const labels = (key: ReviewSectionKey) =>
      sectionOf(review, key).groups.flatMap((group) =>
        group.items.map((entry) => entry.label),
      );

    expect(labels("service")).toEqual([
      "Benefício pretendido",
      "Situação",
      "Tipo de cliente",
      "Cliente isento do serviço?",
    ]);
    expect(labels("personal")).toHaveLength(17);
    expect(labels("personal")).toContain("Gênero");
    expect(labels("professional")).toContain("Senha do INSS (meu INSS)");
  });

  it("agrupa os dados pessoais e profissionais como o formulário", () => {
    const review = buildClientReview(blank());
    const titles = (key: ReviewSectionKey) =>
      sectionOf(review, key).groups.map((group) => group.title);

    expect(titles("personal")).toEqual([
      "Identificação",
      "Documento de identidade",
      "Contato",
      "Recado",
    ]);
    expect(titles("professional")).toEqual([
      "Trabalho",
      "Tempo de contribuição",
      "Meu INSS",
    ]);
  });

  it("conta como faltando os nove obrigatórios do POST /clients", () => {
    const review = buildClientReview(blank());
    expect(totalMissing(review)).toBe(9);
    expect(sectionOf(review, "service").missing).toBe(2);
    expect(sectionOf(review, "personal").missing).toBe(6);
    expect(sectionOf(review, "professional").missing).toBe(1);
  });

  it("opcional vazio é vazio, não faltando", () => {
    const review = buildClientReview(blank());
    expect(itemOf(review, "personal", "RG").state).toBe("empty");
    expect(itemOf(review, "service", "Tipo de cliente").state).toBe("empty");
  });

  it("traduz as chaves dos enums para o rótulo da tela", () => {
    const input = blank();
    input.service.benefit = "APOSENTADORIA_POR_DEFICIENCIA";
    input.personal.gender = "FEMININO";
    input.personal.maritalStatus = "CASADO";
    const review = buildClientReview(input);

    expect(itemOf(review, "service", "Benefício pretendido").value).toBe(
      "Aposentadoria por deficiência",
    );
    expect(itemOf(review, "personal", "Gênero").value).toBe("Feminino");
    expect(itemOf(review, "personal", "Estado civil").value).toBe("Casado(a)");
  });

  it("escreve data no formato brasileiro e chave liga/desliga como Sim/Não", () => {
    const input = blank();
    input.personal.birthDate = "1970-05-20";
    input.personal.isWhatsapp = true;
    const review = buildClientReview(input);

    expect(itemOf(review, "personal", "Data de nascimento").value).toBe(
      "20/05/1970",
    );
    expect(itemOf(review, "personal", "Idade").value).toMatch(/^\d+ anos$/);
    expect(itemOf(review, "personal", "É WhatsApp?").value).toBe("Sim");
    expect(itemOf(review, "personal", "Pessoa com deficiência?").value).toBe(
      "Não",
    );
  });

  it("nunca mostra a senha do INSS", () => {
    const input = blank();
    input.professional.inssPassword = "segredo-123";
    const senha = itemOf(
      buildClientReview(input),
      "professional",
      "Senha do INSS (meu INSS)",
    );

    expect(senha.state).toBe("filled");
    expect(senha.value).not.toContain("segredo");
  });

  it("junta o tempo de contribuição numa frase", () => {
    const input = blank();
    input.professional.contributionYears = "33";
    input.professional.contributionMonths = "1";
    input.professional.contributionDays = "5";
    expect(
      itemOf(buildClientReview(input), "professional", "Tempo de contribuição")
        .value,
    ).toBe("33 anos, 1 mês e 5 dias");

    const soAnos = blank();
    soAnos.professional.contributionYears = "1";
    expect(
      itemOf(buildClientReview(soAnos), "professional", "Tempo de contribuição")
        .value,
    ).toBe("1 ano");
  });
});

describe("as seções opcionais na revisão", () => {
  it("endereço em branco não cobra nada", () => {
    const address = sectionOf(buildClientReview(blank()), "address");
    expect(address.missing).toBe(0);
    expect(address.groups[0].emptyMessage).toMatch(/nenhum endereço/i);
  });

  it("endereço começado cobra logradouro, cidade e UF, e marca o principal", () => {
    const input = blank();
    input.addresses = [
      {
        label: "Endereço 1",
        values: { ...addressInitial, street: "Rua das Flores" },
        hasInput: true,
      },
      {
        label: "Endereço 2",
        values: { ...addressInitial, isPrimary: false },
        hasInput: false,
      },
    ];
    const address = sectionOf(buildClientReview(input), "address");

    expect(address.groups).toHaveLength(1);
    expect(address.groups[0].title).toBe("Endereço 1 · principal");
    expect(address.missing).toBe(2);
  });

  it("entrevista começada exige o conteúdo e mostra o relato sem HTML", () => {
    const vazia = blank();
    vazia.interview = {
      values: { occurredAt: "2026-10-01T14:30:00", durationMinutes: "45", content: "" },
      hasInput: true,
    };
    const semRelato = buildClientReview(vazia);
    expect(itemOf(semRelato, "interview", "Conteúdo").state).toBe("missing");
    expect(itemOf(semRelato, "interview", "Data e hora").value).toBe(
      "01/10/2026 às 14:30",
    );
    expect(itemOf(semRelato, "interview", "Duração (minutos)").value).toBe(
      "45 min",
    );

    const comRelato = blank();
    comRelato.interview = {
      values: {
        occurredAt: "",
        durationMinutes: "",
        content: "<p>Trouxe a CTPS.</p><p>Falta o CNIS &amp; laudo.</p>",
      },
      hasInput: true,
    };
    expect(
      itemOf(buildClientReview(comRelato), "interview", "Conteúdo").value,
    ).toBe("Trouxe a CTPS.\nFalta o CNIS & laudo.");
  });

  it("a deficiência só entra quando a seção aparece no formulário", () => {
    expect(
      buildClientReview(blank()).some((s) => s.key === "disability"),
    ).toBe(false);

    const input = blank();
    input.disability = [];
    const review = buildClientReview(input);
    expect(review.map((s) => s.key)[1]).toBe("disability");
    expect(sectionOf(review, "disability").groups[0].emptyMessage).toMatch(
      /nenhum período/i,
    );
  });

  it("cada período mostra grau, início e cessação", () => {
    const period = (extra: Partial<DisabilityPeriodDraft>) => ({
      key: "k",
      id: null,
      grade: "" as const,
      startedOn: "",
      ongoing: true,
      endedOn: "",
      ...extra,
    });
    const input = blank();
    input.disability = [
      period({ key: "a", grade: "GRAVE", startedOn: "2010-01-01" }),
      period({ key: "b", grade: "LEVE", startedOn: "2001-03-02", ongoing: false }),
      period({ key: "c" }),
    ];
    const disability = sectionOf(buildClientReview(input), "disability");

    expect(disability.groups.map((group) => group.title)).toEqual([
      "Período 1",
      "Período 2",
    ]);
    expect(disability.groups[0].items.map((entry) => entry.value)).toEqual([
      "Grave",
      "01/01/2010",
      "Mantém-se até hoje",
    ]);
    // Cessou, mas a data não veio: é o que o salvamento recusaria.
    expect(disability.missing).toBe(1);
  });

  it("arquivos listam o nome, e documento sem tipo é pendência", () => {
    const input = blank();
    input.documents = [
      { file: new File(["x"], "rg.pdf"), documentType: "", notes: "" },
    ];
    input.simulations = [
      {
        file: new File(["x"], "simulacao.pdf"),
        simulationDate: "2026-09-30",
        version: "2",
        // Vínculos e descrição são obrigatórios no envio (`simulationErrors`):
        // sem eles a simulação entra na revisão como pendência, não como linha.
        vinculos: "3",
        notes: "CNIS de setembro",
        isPrincipal: true,
      },
    ];
    const files = sectionOf(buildClientReview(input), "documents");

    expect(files.groups[0].items[0]).toMatchObject({
      label: "rg.pdf",
      state: "missing",
    });
    expect(files.groups[1].items[0].value).toBe(
      "de 30/09/2026 · versão 2 · 3 vínculos · principal",
    );
    // A pendência é o documento sem tipo; a simulação está completa.
    expect(files.missing).toBe(1);
  });
});

describe("a revisão compacta", () => {
  it("separa os opcionais em branco numa lista de rótulos", () => {
    const input = blank();
    input.personal.fullName = "Maria";
    const identificacao = buildClientReview(input)
      .find((section) => section.key === "personal")!
      .groups.find((group) => group.title === "Identificação")!;

    const { shown, blank: emBranco } = splitBlankOptional(identificacao.items);

    // Preenchido e obrigatórios faltando continuam como campo...
    expect(shown.map((entry) => entry.label)).toEqual([
      "Nome completo",
      "Data de nascimento",
      "Nome da mãe",
      "CPF",
      "Gênero",
      "Pessoa com deficiência?",
    ]);
    // ...e os opcionais vazios viram só o nome, na ordem do formulário.
    expect(emBranco).toEqual(["Idade", "Estado civil", "Nacionalidade"]);
  });

  it("nenhum campo some: mostrados + em branco = todos", () => {
    for (const section of buildClientReview(blank())) {
      for (const group of section.groups) {
        const { shown, blank: emBranco } = splitBlankOptional(group.items);
        expect(shown.length + emBranco.length).toBe(group.items.length);
      }
    }
  });
});
