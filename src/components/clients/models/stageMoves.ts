import type { Stage } from "./kit";

/**
 * O que significa ir de uma etapa da esteira para outra.
 *
 * Função pura, para a regra ser testada sem montar o popover e para a tela
 * nunca discordar de si mesma: o botão, o aviso e o diálogo de confirmação
 * leem o mesmo plano.
 *
 * - `none`: nada muda (mesma etapa).
 * - `advance`: a próxima etapa — o caminho normal, sem perguntar nada.
 * - `skip`: para a frente **pulando** etapas — pede confirmação e
 *   justificativa (`StageMoveDialog`), nomeando as etapas puladas. Pular é
 *   permitido (há caso real: o benefício sai antes de
 *   o planejamento ser formalizado), mas raramente é o que se quis clicar.
 * - `regress`: para trás — pede justificativa (`StageMoveDialog`).
 *
 * Etapa desconhecida (`step 0`, rótulo fora do enum) conta como "antes da
 * primeira": ir dela para a etapa 3 pula as etapas 1 e 2.
 */

export type StageMoveKind = "none" | "advance" | "skip" | "regress";

export type StageMove = {
  kind: StageMoveKind;
  /** As etapas entre a atual e a escolhida, na ordem — só em `skip`. */
  skipped: Stage[];
};

/**
 * Quantas etapas para a frente ainda contam como andar normal. Acima disso é
 * pular. Constante nomeada para a regra ser encontrada (e mudada) num lugar só.
 */
export const MAX_STEPS_WITHOUT_CONFIRMATION = 1;

export function planStageMove(
  current: Stage,
  target: Stage,
  stages: readonly Stage[],
): StageMove {
  if (target.key === current.key || target.step === 0) {
    return { kind: "none", skipped: [] };
  }
  if (target.step < current.step) return { kind: "regress", skipped: [] };

  const distance = target.step - current.step;
  if (distance <= MAX_STEPS_WITHOUT_CONFIRMATION) {
    return { kind: "advance", skipped: [] };
  }
  return {
    kind: "skip",
    skipped: stages.filter(
      (stage) => stage.step > current.step && stage.step < target.step,
    ),
  };
}

/**
 * "A", "A e B", "A, B e C" — a lista das etapas puladas no texto do aviso.
 * `Intl.ListFormat` em pt-BR faz exatamente isso, e acerta a conjunção.
 */
export function listStageNames(stages: readonly Stage[]): string {
  return new Intl.ListFormat("pt-BR", { style: "long", type: "conjunction" }).format(
    stages.map((stage) => stage.label),
  );
}

/**
 * As etapas que o cliente **pulou** de verdade, lidas da trilha de situação.
 *
 * Pulada = etapa anterior à atual (ou qualquer uma, se a atual é a última)
 * que nunca aparece na trilha — nem como situação nova, nem como anterior. A
 * primeira linha da trilha é o cadastro, então a etapa de entrada conta como
 * visitada.
 *
 * Sem trilha (cadastro antigo, de antes do histórico existir) não há como
 * saber: devolve nada, em vez de acusar um pulo que não se pode provar.
 */
export function trailSkippedStages(
  trail: readonly { currentSituation: string; previousSituation?: string | null }[],
  current: Stage,
  stages: readonly Stage[],
  stageOfLabel: (label: string) => Stage,
): Stage[] {
  if (trail.length === 0 || current.step === 0) return [];
  const visited = new Set<string>([current.key]);
  for (const entry of trail) {
    visited.add(stageOfLabel(entry.currentSituation).key);
    if (entry.previousSituation) visited.add(stageOfLabel(entry.previousSituation).key);
  }
  return stages.filter((stage) => stage.step < current.step && !visited.has(stage.key));
}
