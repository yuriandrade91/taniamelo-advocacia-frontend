import { describe, expect, it } from "vitest";
import { STAGES, stageOf } from "@/components/clients/stage/stages";
import {
  MAX_STEPS_WITHOUT_CONFIRMATION,
  listStageNames,
  planStageMove,
  trailReachedAt,
  trailSkippedStages,
} from "@/components/clients/stage/stageMoves";

/**
 * A regra que decide se mudar de etapa pede confirmação.
 *
 * O cartão, o aviso "vamos pedir confirmação" e o diálogo leem o mesmo
 * plano — se a regra errar, os três erram juntos, e o escritório pula etapa
 * sem perceber (ou é interrompido a cada clique normal).
 */

const stage = (step: number) => STAGES[step - 1];
const keys = (list: readonly { key: string }[]) => list.map((s) => s.key);

describe("planStageMove", () => {
  it("mesma etapa não é mudança", () => {
    expect(planStageMove(stage(2), stage(2), STAGES)).toEqual({ kind: "none", skipped: [] });
  });

  it("a próxima etapa é o caminho normal, sem confirmação", () => {
    expect(MAX_STEPS_WITHOUT_CONFIRMATION).toBe(1);
    expect(planStageMove(stage(2), stage(3), STAGES)).toEqual({ kind: "advance", skipped: [] });
  });

  it("pular para a frente lista as etapas puladas, na ordem", () => {
    const move = planStageMove(stage(1), stage(4), STAGES);
    expect(move.kind).toBe("skip");
    expect(keys(move.skipped)).toEqual([
      "ANALISE_DOCUMENTAL",
      "PLANEJAMENTO_EM_EXECUCAO",
    ]);
  });

  it("pular uma única etapa também pede confirmação", () => {
    const move = planStageMove(stage(3), stage(5), STAGES);
    expect(move.kind).toBe("skip");
    expect(keys(move.skipped)).toEqual(["PLANEJAMENTO_CONCLUIDO"]);
  });

  it("voltar é retrocesso, qualquer que seja a distância", () => {
    expect(planStageMove(stage(5), stage(4), STAGES).kind).toBe("regress");
    expect(planStageMove(stage(6), stage(1), STAGES)).toEqual({ kind: "regress", skipped: [] });
  });

  it("situação desconhecida conta como antes da primeira etapa", () => {
    const unknown = stageOf("Arquivado");
    expect(unknown.step).toBe(0);
    expect(planStageMove(unknown, stage(1), STAGES).kind).toBe("advance");
    expect(keys(planStageMove(unknown, stage(3), STAGES).skipped)).toEqual([
      "FORMULARIO_PREENCHIDO",
      "ANALISE_DOCUMENTAL",
    ]);
  });

  it("etapa desconhecida como destino não é uma mudança possível", () => {
    expect(planStageMove(stage(2), stageOf("Arquivado"), STAGES).kind).toBe("none");
  });
});

describe("listStageNames", () => {
  it("junta os nomes como se fala: vírgula e 'e' no fim", () => {
    expect(listStageNames([stage(2)])).toBe("Análise documental");
    expect(listStageNames([stage(2), stage(3)])).toBe(
      "Análise documental e Planejamento em execução",
    );
    expect(listStageNames([stage(2), stage(3), stage(4)])).toBe(
      "Análise documental, Planejamento em execução e Planejamento concluído",
    );
  });
});

describe("trailSkippedStages", () => {
  const label = (step: number) => stage(step).label;
  /** Uma linha da trilha: de `from` (ou cadastro, sem `from`) para `to`. */
  const entry = (to: number, from?: number) => ({
    currentSituation: label(to),
    previousSituation: from ? label(from) : null,
  });
  const skipped = (trail: ReturnType<typeof entry>[], current: number) =>
    keys(trailSkippedStages(trail, stage(current), STAGES, stageOf));

  it("caminho completo, etapa a etapa, não pula nada", () => {
    expect(skipped([entry(1), entry(2, 1), entry(3, 2)], 3)).toEqual([]);
  });

  it("um salto deixa para trás as etapas do meio", () => {
    expect(skipped([entry(1), entry(4, 1)], 4)).toEqual([
      "ANALISE_DOCUMENTAL",
      "PLANEJAMENTO_EM_EXECUCAO",
    ]);
  });

  it("na última etapa, as puladas continuam marcadas (o resto é concluído)", () => {
    expect(skipped([entry(1), entry(2, 1), entry(6, 2)], 6)).toEqual([
      "PLANEJAMENTO_EM_EXECUCAO",
      "PLANEJAMENTO_CONCLUIDO",
      "BENEFICIO_FUTURO",
    ]);
  });

  it("o cadastro já numa etapa adiantada conta as anteriores como puladas", () => {
    expect(skipped([entry(3)], 3)).toEqual(["FORMULARIO_PREENCHIDO", "ANALISE_DOCUMENTAL"]);
  });

  it("etapa visitada antes de um retrocesso não é pulada", () => {
    // 1 → 4 (pula 2 e 3) → volta para 2 → 3: agora 2 e 3 foram feitas.
    expect(skipped([entry(1), entry(4, 1), entry(2, 4), entry(3, 2)], 3)).toEqual([]);
  });

  it("sem trilha (cadastro antigo) não acusa pulo nenhum", () => {
    expect(skipped([], 5)).toEqual([]);
  });

  it("situação atual desconhecida não marca nada", () => {
    expect(trailSkippedStages([entry(1)], stageOf("Arquivado"), STAGES, stageOf)).toEqual([]);
  });
});

describe("trailReachedAt", () => {
  const at = (step: number, changedAt: string) => ({ currentSituation: stage(step).label, changedAt });
  const keyOf = (entry: ReturnType<typeof at>) => stageOf(entry.currentSituation).key;

  it("cada etapa leva a data em que o cliente chegou a ela", () => {
    const reached = trailReachedAt([at(1, "2026-08-01T12:00:00Z"), at(2, "2026-08-10T12:00:00Z")], keyOf);
    expect(Object.fromEntries(reached)).toEqual({
      FORMULARIO_PREENCHIDO: "2026-08-01T12:00:00Z",
      ANALISE_DOCUMENTAL: "2026-08-10T12:00:00Z",
    });
  });

  it("voltou e avançou de novo: vale a chegada mais recente, em qualquer ordem da trilha", () => {
    const trail = [at(2, "2026-09-20T12:00:00Z"), at(3, "2026-09-05T12:00:00Z"), at(2, "2026-08-10T12:00:00Z")];
    expect(trailReachedAt(trail, keyOf).get("ANALISE_DOCUMENTAL")).toBe("2026-09-20T12:00:00Z");
  });

  it("etapa pulada não tem data", () => {
    expect(trailReachedAt([at(1, "2026-08-01T12:00:00Z"), at(4, "2026-08-10T12:00:00Z")], keyOf).has("ANALISE_DOCUMENTAL")).toBe(false);
  });

  it("linha que não diz a etapa fica de fora", () => {
    expect(trailReachedAt([{ changedAt: "2026-08-01T12:00:00Z" }], () => undefined).size).toBe(0);
  });
});
