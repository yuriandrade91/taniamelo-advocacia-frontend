import {
  SITUATION_ENTRIES,
  SituationLabelByKey,
  getSituationKeyByLabel,
  type SituationKey,
} from "@/enums/situation/Situation";

/**
 * As seis etapas da esteira — a situação do cliente vista como andamento.
 *
 * A ordem é a do enum (`SITUATION_ENTRIES`) e é ela que dá a posição na
 * esteira, o "n/6" da lista de Clientes e a cor na rampa (`stageRamp`, pelo
 * `step`). Eram duas declarações, uma na lista e outra no quadro da Home, cada
 * uma com o seu formato.
 */
export type Stage = {
  key: SituationKey | "OUTRA";
  label: string;
  /** Rótulo curto, para botão e trilha: "Documentos", "Planejado". */
  short: string;
  /** 1 a 6 na ordem da esteira; 0 quando a etapa não é conhecida. */
  step: number;
};

export type KnownStage = Stage & { key: SituationKey };

const SHORT_LABEL: Record<SituationKey, string> = {
  FORMULARIO_PREENCHIDO: "Formulário",
  ANALISE_DOCUMENTAL: "Documentos",
  PLANEJAMENTO_EM_EXECUCAO: "Planejando",
  PLANEJAMENTO_CONCLUIDO: "Planejado",
  BENEFICIO_FUTURO: "Futuro",
  BENEFICIO_CONCLUIDO: "Concluído",
};

/** As seis etapas, na ordem fixa da esteira. */
export const STAGES: readonly KnownStage[] = SITUATION_ENTRIES.map(([key, label], index) => ({
  key,
  label,
  short: SHORT_LABEL[key],
  step: index + 1,
}));

const UNKNOWN_STAGE: Stage = { key: "OUTRA", label: "Sem etapa", short: "Sem etapa", step: 0 };

/** A API devolve o rótulo; aceita também a chave, por tolerância. */
export function stageOf(situation?: string): Stage {
  if (!situation) return UNKNOWN_STAGE;
  const key = getSituationKeyByLabel(situation) ?? STAGES.find((s) => s.key === situation)?.key;
  return STAGES.find((s) => s.key === key) ?? { ...UNKNOWN_STAGE, label: situation, short: situation };
}

/** A etapa seguinte na esteira, ou `null` na última. */
export const nextStageOf = (key: SituationKey): KnownStage | null =>
  STAGES[STAGES.findIndex((s) => s.key === key) + 1] ?? null;

/** O aviso da mudança de etapa — o mesmo na lista de Clientes e no quadro da Home. */
export const situationChangedMessage = (clientName: string, situation: SituationKey) =>
  `Situação de ${clientName} atualizada para "${SituationLabelByKey[situation]}".`;
