import { describe, expect, it } from "vitest";
import {
  convertibleIntervals,
  disabilityDraftFromResponse,
  hasAnyDisabilityInput,
  hasDisabilityInput,
  newDisabilityPeriod,
  toDisabilityPeriodRequest,
  validateDisabilityPeriods,
  type DisabilityPeriodDraft,
} from "./disabilityPeriods";

const HOJE = "2026-08-27";

function draft(over: Partial<DisabilityPeriodDraft> = {}): DisabilityPeriodDraft {
  return { ...newDisabilityPeriod(), ...over };
}

describe("o intervalo em branco", () => {
  it("começa em aberto: é o caso comum e a primeira opção da tela", () => {
    const novo = newDisabilityPeriod();
    expect(novo.ongoing).toBe(true);
    expect(novo.endedOn).toBe("");
    expect(novo.id).toBeNull();
  });

  it("tem chave única, para o React não confundir duas linhas", () => {
    expect(newDisabilityPeriod().key).not.toBe(newDisabilityPeriod().key);
  });

  it("em branco não conta como preenchido", () => {
    expect(hasDisabilityInput(newDisabilityPeriod())).toBe(false);
    expect(hasAnyDisabilityInput([newDisabilityPeriod()])).toBe(false);
    expect(hasDisabilityInput(draft({ grade: "LEVE" }))).toBe(true);
  });
});

describe("a validação de um intervalo", () => {
  it("em branco não reprova: seção opcional não barra cadastro completo", () => {
    expect(validateDisabilityPeriods([newDisabilityPeriod()], HOJE)).toEqual({});
  });

  it("cobra o grau e a data de início de quem foi mexido", () => {
    const d = draft({ startedOn: "2010-01-01" });
    expect(validateDisabilityPeriods([d], HOJE)[d.key].grade).toMatch(/grau/i);

    const e = draft({ grade: "LEVE" });
    expect(validateDisabilityPeriods([e], HOJE)[e.key].startedOn).toMatch(
      /início/i,
    );
  });

  it("recusa início no futuro", () => {
    const d = draft({ grade: "LEVE", startedOn: "2030-01-01" });
    expect(validateDisabilityPeriods([d], HOJE)[d.key].startedOn).toMatch(
      /futuro/i,
    );
  });

  it("em aberto não pede data de cessação", () => {
    const d = draft({ grade: "GRAVE", startedOn: "2010-01-01", ongoing: true });
    expect(validateDisabilityPeriods([d], HOJE)).toEqual({});
  });

  it("desmarcar \"se mantém\" torna a cessação obrigatória", () => {
    const d = draft({ grade: "GRAVE", startedOn: "2010-01-01", ongoing: false });
    expect(validateDisabilityPeriods([d], HOJE)[d.key].endedOn).toMatch(
      /cessação/i,
    );
  });

  it("recusa cessação anterior ao início", () => {
    const d = draft({
      grade: "LEVE",
      startedOn: "2010-06-01",
      ongoing: false,
      endedOn: "2010-01-01",
    });
    expect(validateDisabilityPeriods([d], HOJE)[d.key].endedOn).toMatch(
      /anterior/i,
    );
  });

  it("recusa cessação no futuro apontando a opção certa", () => {
    const d = draft({
      grade: "LEVE",
      startedOn: "2010-01-01",
      ongoing: false,
      endedOn: "2030-01-01",
    });
    // Quem data a cessação à frente está querendo dizer "ainda está em curso".
    expect(validateDisabilityPeriods([d], HOJE)[d.key].endedOn).toMatch(
      /se mantém/i,
    );
  });

  it("cessação no mesmo dia do início é válida: um dia de intervalo", () => {
    const d = draft({
      grade: "LEVE",
      startedOn: "2010-01-01",
      ongoing: false,
      endedOn: "2010-01-01",
    });
    expect(validateDisabilityPeriods([d], HOJE)).toEqual({});
  });
});

describe("a sobreposição entre intervalos", () => {
  const grave = draft({
    grade: "GRAVE",
    startedOn: "1990-01-01",
    ongoing: false,
    endedOn: "1999-12-31",
  });

  it("intervalo dentro de outro é recusado, nomeando o conflitante", () => {
    const dentro = draft({
      grade: "LEVE",
      startedOn: "1995-01-01",
      ongoing: false,
      endedOn: "1996-01-01",
    });
    const errors = validateDisabilityPeriods([grave, dentro], HOJE);
    expect(errors[dentro.key].startedOn).toContain("01/01/1990");
    // E não acusa os dois lados: quem chega depois na lista recebe o erro.
    expect(errors[grave.key]).toBeUndefined();
  });

  it("encostar no dia seguinte é permitido; no mesmo dia, não", () => {
    const seguinte = draft({ grade: "LEVE", startedOn: "2000-01-01" });
    expect(validateDisabilityPeriods([grave, seguinte], HOJE)).toEqual({});

    const mesmoDia = draft({ grade: "LEVE", startedOn: "1999-12-31" });
    expect(
      validateDisabilityPeriods([grave, mesmoDia], HOJE)[mesmoDia.key].startedOn,
    ).toMatch(/sobrep/i);
  });

  it("dois em aberto sempre colidem, sem precisar de regra própria", () => {
    // Ambos se estendem até hoje, então têm necessariamente dias em comum.
    const a = draft({ grade: "GRAVE", startedOn: "1990-01-01", ongoing: true });
    const b = draft({ grade: "LEVE", startedOn: "2020-01-01", ongoing: true });
    expect(validateDisabilityPeriods([a, b], HOJE)[b.key].startedOn).toMatch(
      /sobrep/i,
    );
  });

  it("não acusa sobreposição contra um intervalo sem data de início", () => {
    const semData = draft({ grade: "LEVE" });
    const valido = draft({ grade: "GRAVE", startedOn: "2010-01-01" });
    const errors = validateDisabilityPeriods([semData, valido], HOJE);
    expect(errors[valido.key]).toBeUndefined();
  });
});

describe("o que entra no cálculo", () => {
  it("intervalo pela metade fica fora", () => {
    // Um total que muda de valor conforme a pessoa termina de digitar a data
    // seria pior que não mostrar total.
    expect(
      convertibleIntervals(
        [
          draft({ grade: "LEVE" }),
          draft({ startedOn: "2010-01-01" }),
          draft({ grade: "GRAVE", startedOn: "2010-01-01", ongoing: false }),
        ],
        HOJE,
      ),
    ).toEqual([]);
  });

  it("intervalo completo entra, com o fim resolvido", () => {
    const abertos = convertibleIntervals(
      [draft({ grade: "GRAVE", startedOn: "2010-01-01", ongoing: true })],
      HOJE,
    );
    expect(abertos).toEqual([
      { grade: "GRAVE", startedOn: "2010-01-01", endedOn: null },
    ]);

    const fechados = convertibleIntervals(
      [
        draft({
          grade: "LEVE",
          startedOn: "2010-01-01",
          ongoing: false,
          endedOn: "2015-01-01",
        }),
      ],
      HOJE,
    );
    expect(fechados[0].endedOn).toBe("2015-01-01");
  });

  it("início no futuro fica fora", () => {
    expect(
      convertibleIntervals(
        [draft({ grade: "LEVE", startedOn: "2030-01-01", ongoing: true })],
        HOJE,
      ),
    ).toEqual([]);
  });
});

describe("o payload", () => {
  it("em aberto OMITE endedOn — ausência é a afirmação de que não cessou", () => {
    const body = toDisabilityPeriodRequest(
      draft({ grade: "GRAVE", startedOn: "2010-01-01", ongoing: true }),
    );
    expect(body).toEqual({ grade: "GRAVE", startedOn: "2010-01-01" });
    expect("endedOn" in body).toBe(false);
  });

  it("cessado envia a data", () => {
    expect(
      toDisabilityPeriodRequest(
        draft({
          grade: "LEVE",
          startedOn: "2010-01-01",
          ongoing: false,
          endedOn: "2015-06-30",
        }),
      ),
    ).toEqual({ grade: "LEVE", startedOn: "2010-01-01", endedOn: "2015-06-30" });
  });

  it("marcar \"se mantém\" descarta a data que estava digitada", () => {
    // Senão um intervalo em aberto iria para o servidor com cessação.
    const body = toDisabilityPeriodRequest(
      draft({
        grade: "LEVE",
        startedOn: "2010-01-01",
        ongoing: true,
        endedOn: "2015-06-30",
      }),
    );
    expect("endedOn" in body).toBe(false);
  });
});

describe("a volta do servidor", () => {
  it("converte o label do grau na chave do enum", () => {
    const d = disabilityDraftFromResponse({
      id: "abc",
      grade: "Moderada",
      startedOn: "2010-01-01",
      endedOn: "2015-01-01",
      ongoing: false,
    });
    expect(d.grade).toBe("MODERADA");
    expect(d.id).toBe("abc");
    expect(d.ongoing).toBe(false);
    expect(d.endedOn).toBe("2015-01-01");
  });

  it("sem endedOn volta como em aberto", () => {
    const d = disabilityDraftFromResponse({
      id: "x",
      grade: "Grave",
      startedOn: "2010-01-01",
      endedOn: null,
    });
    expect(d.ongoing).toBe(true);
    expect(d.endedOn).toBe("");
  });

  it("ida e volta preserva o payload", () => {
    const body = { grade: "LEVE", startedOn: "2010-01-01", endedOn: "2015-01-01" };
    expect(
      toDisabilityPeriodRequest(
        disabilityDraftFromResponse({
          grade: "Leve",
          startedOn: "2010-01-01",
          endedOn: "2015-01-01",
          ongoing: false,
        }),
      ),
    ).toEqual(body);
  });
});
