/**
 * O andamento do processo no INSS: esteira, situação atual, rascunho,
 * validação e payload.
 *
 * Funções puras, como `disabilityPeriods`: a lista de eventos é um array na
 * tela e as regras são testáveis sem montar componente.
 *
 * ## Evento, não etapa
 *
 * A esteira do benefício (`stage/stages.ts`) é um funil: o cliente está numa
 * etapa e anda para a próxima. O processo no INSS não é assim — depois do
 * requerimento pode vir exigência ou a decisão direto; uma exigência cumprida
 * pode render outra; o indeferimento abre recurso, e o recurso pode trazer
 * exigência de novo. Então o que se grava é o **evento**, com a data em que
 * aconteceu no INSS, e a situação atual é o evento mais recente.
 */
import type { RequestStageKey } from "@/enums/requestStage/RequestStage";
import {
  REQUEST_STAGES as INSS_STAGES,
  REQUEST_STAGE_TONE as INSS_TONE,
  requestStageKeyOf as inssStepKeyOf,
  type RequestStageTone as InssTone,
} from "@/components/clients/stage/requestStages";
import { daysBetween } from "@/lib/period";

export { INSS_STAGES, INSS_TONE, inssStepKeyOf, type InssTone };

/** Protocolo do INSS tem 9 a 10 dígitos; a folga cobre pontuação e prefixo. */
export const PROTOCOL_MAX_LENGTH = 30;
export const NOTES_MAX_LENGTH = 500;

/** O que o evento mais recente diz sobre o processo, em uma frase. */
const STATUS_PHRASE: Record<RequestStageKey, string> = {
  REQUERIMENTO: "Requerido — aguardando análise do INSS",
  EXIGENCIA: "Em exigência — o INSS aguarda o cumprimento",
  CUMPRIMENTO_DE_EXIGENCIA: "Exigência cumprida — aguardando análise do INSS",
  DEFERIMENTO: "Deferido",
  INDEFERIMENTO: "Indeferido",
  RECURSO: "Em recurso — aguardando julgamento",
};

/**
 * O passo que costuma vir depois — só a sugestão do "Registrar andamento".
 * A pessoa troca no select; nada aqui proíbe outro caminho.
 */
const SUGGESTED_NEXT: Record<RequestStageKey, RequestStageKey | null> = {
  REQUERIMENTO: "EXIGENCIA",
  EXIGENCIA: "CUMPRIMENTO_DE_EXIGENCIA",
  CUMPRIMENTO_DE_EXIGENCIA: "DEFERIMENTO",
  DEFERIMENTO: null,
  INDEFERIMENTO: "RECURSO",
  RECURSO: "DEFERIMENTO",
};

/** O primeiro evento de um processo é o requerimento; depois, o que costuma seguir. */
export const suggestedNextStep = (last?: RequestStageKey | null): RequestStageKey | null =>
  last ? SUGGESTED_NEXT[last] : "REQUERIMENTO";

type DatedStep = { step: string; occurredOn: string; createdAt?: string };

/**
 * Do mais recente para o mais antigo: pela data do evento no INSS e, no
 * mesmo dia, pela ordem de registro — exigência e cumprimento no mesmo dia
 * acontecem, e a ordem de quem registrou é a única pista.
 */
export const latestFirst = <T extends DatedStep>(items: readonly T[]): T[] =>
  [...items].sort(
    (a, b) =>
      b.occurredOn.localeCompare(a.occurredOn) || (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
  );

export type InssStatus = {
  key: RequestStageKey;
  label: string;
  phrase: string;
  tone: InssTone;
  since: string;
  /** Dias desde a exigência — só quando ela é a situação atual. */
  openDays: number | null;
};

/** Onde o processo está: o evento mais recente. `null` sem nenhum evento. */
export function inssStatusOf(items: readonly DatedStep[], today: string): InssStatus | null {
  const latest = latestFirst(items).find((item) => inssStepKeyOf(item.step));
  const key = inssStepKeyOf(latest?.step);
  if (!latest || !key) return null;
  return {
    key,
    label: INSS_STAGES.find((stage) => stage.key === key)?.label ?? latest.step,
    phrase: STATUS_PHRASE[key],
    tone: INSS_TONE[key],
    since: latest.occurredOn,
    openDays: key === "EXIGENCIA" ? Math.max(0, daysBetween(latest.occurredOn, today)) : null,
  };
}

/** Quantas vezes cada etapa aconteceu — "Exigência ×2" na esteira. */
export function stepCounts(items: readonly { step: string }[]): Partial<Record<RequestStageKey, number>> {
  const counts: Partial<Record<RequestStageKey, number>> = {};
  for (const item of items) {
    const key = inssStepKeyOf(item.step);
    if (key) counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

// ── Edição ──

export type InssStepDraft = {
  /** Chave de lista no React. Local, não vem do servidor. */
  key: string;
  /** `id` do backend; `null` até o evento ser gravado. */
  id: string | null;
  /** `""` enquanto nada foi escolhido. */
  step: "" | RequestStageKey;
  /** `YYYY-MM-DD` */
  occurredOn: string;
  protocol: string;
  notes: string;
};

export type InssStepErrors = Partial<Record<"step" | "occurredOn" | "protocol" | "notes", string>>;

let counter = 0;
const nextKey = () => {
  counter += 1;
  return `inss-step-${counter}`;
};

/** Um evento novo, já com a etapa que costuma seguir a `after`. */
export function newInssStep(after?: RequestStageKey | null): InssStepDraft {
  return {
    key: nextKey(),
    id: null,
    step: suggestedNextStep(after) ?? "",
    occurredOn: "",
    protocol: "",
    notes: "",
  };
}

export function inssDraftFromResponse(source: {
  id?: string;
  step?: string;
  occurredOn?: string;
  protocol?: string | null;
  notes?: string | null;
}): InssStepDraft {
  return {
    key: nextKey(),
    id: source.id ?? null,
    step: inssStepKeyOf(source.step) ?? "",
    occurredOn: source.occurredOn ?? "",
    protocol: source.protocol ?? "",
    notes: source.notes ?? "",
  };
}

/**
 * Valida cada evento. Diferente dos períodos de deficiência, um rascunho em
 * branco **não** é ignorado: ele só existe porque a pessoa clicou em
 * "Registrar andamento", e salvar calado sem ele seria perder o que ela
 * pretendia gravar. Para desistir, há o "Remover".
 *
 * @param today `YYYY-MM-DD` — por parâmetro, para o teste não depender do relógio.
 */
export function validateInssSteps(
  drafts: readonly InssStepDraft[],
  today: string,
): Record<string, InssStepErrors> {
  const result: Record<string, InssStepErrors> = {};
  for (const draft of drafts) {
    const errors: InssStepErrors = {};
    if (!draft.step) errors.step = "Escolha a etapa.";
    if (!draft.occurredOn) errors.occurredOn = "Informe a data.";
    else if (draft.occurredOn > today) errors.occurredOn = "A data não pode estar no futuro.";
    if (draft.protocol.trim().length > PROTOCOL_MAX_LENGTH) {
      errors.protocol = `Use até ${PROTOCOL_MAX_LENGTH} caracteres.`;
    }
    if (draft.notes.trim().length > NOTES_MAX_LENGTH) {
      errors.notes = `Use até ${NOTES_MAX_LENGTH} caracteres.`;
    }
    if (Object.keys(errors).length > 0) result[draft.key] = errors;
  }
  return result;
}

export type InssStepRequest = {
  step: RequestStageKey;
  occurredOn: string;
  /** Ausentes quando em branco — o backend grava `null`. */
  protocol?: string;
  notes?: string;
};

/** O corpo do POST/PUT. Chame só com o rascunho validado (`step` preenchido). */
export function toInssStepRequest(draft: InssStepDraft): InssStepRequest {
  const body: InssStepRequest = { step: draft.step as RequestStageKey, occurredOn: draft.occurredOn };
  const protocol = draft.protocol.trim();
  const notes = draft.notes.trim();
  if (protocol) body.protocol = protocol;
  if (notes) body.notes = notes;
  return body;
}

/**
 * Os rascunhos que precisam ir ao servidor: os novos e os gravados que
 * mudaram. Comparar pelo corpo da requisição faz espaço a mais no fim de uma
 * observação não contar como mudança.
 */
export function changedInssSteps(
  drafts: readonly InssStepDraft[],
  saved: readonly Parameters<typeof inssDraftFromResponse>[0][],
): InssStepDraft[] {
  const stored = new Map(
    saved.map((item) => [item.id, JSON.stringify(toInssStepRequest(inssDraftFromResponse(item)))]),
  );
  return drafts.filter(
    (draft) => !draft.id || stored.get(draft.id) !== JSON.stringify(toInssStepRequest(draft)),
  );
}
