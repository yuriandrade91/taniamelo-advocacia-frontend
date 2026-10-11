import { describe, expect, it } from "vitest";
import {
  INSS_STAGES,
  NOTES_MAX_LENGTH,
  changedInssSteps,
  inssDraftFromResponse,
  inssStatusOf,
  inssStepKeyOf,
  latestFirst,
  newInssStep,
  stepCounts,
  suggestedNextStep,
  toInssStepRequest,
  validateInssSteps,
  type InssStepDraft,
} from "@/components/clients/inss/inssSteps";

/**
 * A esteira do INSS: onde o processo está, o que a tela sugere em seguida e
 * o que vai ao servidor. A situação atual é o selo da seção na ficha — se ela
 * errar, o escritório lê "Deferido" num processo que ainda está em exigência.
 */

const TODAY = "2026-10-10";

const draft = (over: Partial<InssStepDraft> = {}): InssStepDraft => ({
  ...newInssStep(),
  occurredOn: "2026-09-01",
  ...over,
});

describe("as etapas", () => {
  it("seguem a ordem que o escritório conta, de 1 a 6", () => {
    expect(INSS_STAGES.map((stage) => [stage.step, stage.label])).toEqual([
      [1, "Requerimento"],
      [2, "Exigência"],
      [3, "Cumprimento de exigência"],
      [4, "Deferimento"],
      [5, "Indeferimento"],
      [6, "Recurso"],
    ]);
  });

  it("a API devolve o rótulo; a chave também é aceita", () => {
    expect(inssStepKeyOf("Cumprimento de exigência")).toBe("CUMPRIMENTO_DE_EXIGENCIA");
    expect(inssStepKeyOf("RECURSO")).toBe("RECURSO");
    expect(inssStepKeyOf("Perícia")).toBeNull();
    expect(inssStepKeyOf(undefined)).toBeNull();
  });
});

describe("suggestedNextStep", () => {
  it("o processo começa pelo requerimento", () => {
    expect(suggestedNextStep(null)).toBe("REQUERIMENTO");
    expect(newInssStep().step).toBe("REQUERIMENTO");
  });

  it("depois, o que costuma seguir", () => {
    expect(suggestedNextStep("REQUERIMENTO")).toBe("EXIGENCIA");
    expect(suggestedNextStep("EXIGENCIA")).toBe("CUMPRIMENTO_DE_EXIGENCIA");
    expect(suggestedNextStep("INDEFERIMENTO")).toBe("RECURSO");
  });

  it("deferido não sugere nada: a pessoa escolhe, se houver o que registrar", () => {
    expect(suggestedNextStep("DEFERIMENTO")).toBeNull();
    expect(newInssStep("DEFERIMENTO").step).toBe("");
  });
});

describe("latestFirst", () => {
  it("ordena pela data no INSS e, no mesmo dia, pela ordem de registro", () => {
    const items = [
      { step: "Requerimento", occurredOn: "2026-03-01", createdAt: "2026-03-01T10:00:00Z" },
      { step: "Exigência", occurredOn: "2026-05-02", createdAt: "2026-05-02T09:00:00Z" },
      { step: "Cumprimento de exigência", occurredOn: "2026-05-02", createdAt: "2026-05-02T15:00:00Z" },
    ];
    expect(latestFirst(items).map((item) => item.step)).toEqual([
      "Cumprimento de exigência",
      "Exigência",
      "Requerimento",
    ]);
  });

  it("não mexe na lista recebida", () => {
    const items = [
      { step: "Requerimento", occurredOn: "2026-03-01" },
      { step: "Exigência", occurredOn: "2026-05-02" },
    ];
    latestFirst(items);
    expect(items[0].step).toBe("Requerimento");
  });
});

describe("inssStatusOf", () => {
  it("sem evento, não há situação", () => {
    expect(inssStatusOf([], TODAY)).toBeNull();
  });

  it("é o evento mais recente, não o último da lista", () => {
    const status = inssStatusOf(
      [
        { step: "Deferimento", occurredOn: "2026-09-20" },
        { step: "Requerimento", occurredOn: "2026-03-01" },
      ],
      TODAY,
    );
    expect(status).toMatchObject({ key: "DEFERIMENTO", tone: "granted", since: "2026-09-20", openDays: null });
  });

  it("em exigência, conta há quantos dias ela está aberta", () => {
    const status = inssStatusOf(
      [
        { step: "Requerimento", occurredOn: "2026-08-01" },
        { step: "Exigência", occurredOn: "2026-09-30" },
      ],
      TODAY,
    );
    expect(status).toMatchObject({ key: "EXIGENCIA", tone: "action", openDays: 10 });
  });

  it("indeferimento é decisão contrária", () => {
    expect(inssStatusOf([{ step: "Indeferimento", occurredOn: "2026-09-01" }], TODAY)?.tone).toBe("denied");
  });
});

describe("stepCounts", () => {
  it("conta quantas vezes cada etapa aconteceu", () => {
    expect(
      stepCounts([{ step: "Exigência" }, { step: "Cumprimento de exigência" }, { step: "Exigência" }]),
    ).toEqual({ EXIGENCIA: 2, CUMPRIMENTO_DE_EXIGENCIA: 1 });
  });
});

describe("validateInssSteps", () => {
  it("um evento completo passa", () => {
    expect(validateInssSteps([draft()], TODAY)).toEqual({});
  });

  it("rascunho em branco não é ignorado: a pessoa pediu para registrar", () => {
    const blank = draft({ step: "", occurredOn: "" });
    expect(validateInssSteps([blank], TODAY)[blank.key]).toEqual({
      step: "Escolha a etapa.",
      occurredOn: "Informe a data.",
    });
  });

  it("a data é a do INSS, e não pode estar no futuro", () => {
    const future = draft({ occurredOn: "2026-10-11" });
    expect(validateInssSteps([future], TODAY)[future.key]?.occurredOn).toBe("A data não pode estar no futuro.");
    expect(validateInssSteps([draft({ occurredOn: TODAY })], TODAY)).toEqual({});
  });

  it("observação longa demais é barrada no campo", () => {
    const long = draft({ notes: "x".repeat(NOTES_MAX_LENGTH + 1) });
    expect(validateInssSteps([long], TODAY)[long.key]?.notes).toBeDefined();
  });
});

describe("toInssStepRequest", () => {
  it("omite protocolo e observação em branco, e apara os preenchidos", () => {
    expect(toInssStepRequest(draft({ step: "EXIGENCIA", protocol: "  ", notes: "" }))).toEqual({
      step: "EXIGENCIA",
      occurredOn: "2026-09-01",
    });
    expect(toInssStepRequest(draft({ protocol: " 123456789 ", notes: " CTPS original " }))).toMatchObject({
      protocol: "123456789",
      notes: "CTPS original",
    });
  });
});

describe("changedInssSteps", () => {
  const saved = [{ id: "a", step: "Requerimento", occurredOn: "2026-03-01", protocol: "123", notes: null }];

  it("o gravado intocado não vai de novo; espaço a mais não conta como mudança", () => {
    const drafts = saved.map(inssDraftFromResponse);
    expect(changedInssSteps(drafts, saved)).toEqual([]);
    expect(changedInssSteps([{ ...drafts[0], protocol: "123 " }], saved)).toEqual([]);
  });

  it("vai o novo e o gravado que mudou", () => {
    const [stored] = saved.map(inssDraftFromResponse);
    const edited = { ...stored, occurredOn: "2026-03-02" };
    const fresh = draft({ step: "EXIGENCIA" });
    expect(changedInssSteps([fresh, edited], saved).map((item) => item.key)).toEqual([fresh.key, edited.key]);
  });
});
