import {
  REQUEST_STAGE_ENTRIES,
  RequestStageLabelByKey,
  getRequestStageKeyByLabel,
  type RequestStageKey,
} from "@/enums/requestStage/RequestStage";
import type { ClientPatchRequest } from "@/interfaces/client/Client.interface";
import { validateJustification } from "@/lib/validators";

/**
 * A esteira do INSS — a etapa do requerimento (`requestStage`), paralela à
 * situação do benefício (`stages.ts`).
 *
 * Não é funil, e por isso não reaproveita `planStageMove`: deferimento e
 * indeferimento são desfechos alternativos do **mesmo** ponto (os dois têm a
 * ordem 4, como no backend), recurso só vem depois do indeferimento, e voltar
 * de recurso para exigência é caminho real do INSS, não retrocesso a
 * justificar. A ordem aqui serve para desenhar o trilho, não para medir avanço.
 */
export type RequestStage = {
  key: RequestStageKey;
  label: string;
  /** Rótulo curto, para botão: "Cumprimento". */
  short: string;
  /** Posição na lista de escolha, 1 a 6. */
  step: number;
  /** Ponto no trilho, 1 a 5 — a do `RequestStage.order` do backend. */
  order: number;
};

const SHORT_LABEL: Record<RequestStageKey, string> = {
  REQUERIMENTO: "Requerimento",
  EXIGENCIA: "Exigência",
  CUMPRIMENTO_DE_EXIGENCIA: "Cumprimento",
  DEFERIMENTO: "Deferimento",
  INDEFERIMENTO: "Indeferimento",
  RECURSO: "Recurso",
};

const ORDER: Record<RequestStageKey, number> = {
  REQUERIMENTO: 1,
  EXIGENCIA: 2,
  CUMPRIMENTO_DE_EXIGENCIA: 3,
  DEFERIMENTO: 4,
  INDEFERIMENTO: 4,
  RECURSO: 5,
};

export const REQUEST_STAGES: readonly RequestStage[] =
  REQUEST_STAGE_ENTRIES.map(([key, label], index) => ({
    key,
    label,
    short: SHORT_LABEL[key],
    step: index + 1,
    order: ORDER[key],
  }));

/** Quantos pontos tem o trilho: os dois desfechos dividem o quarto. */
export const REQUEST_STAGE_TRACK = 5;

/**
 * O tom de cada etapa — o mesmo no selo da lista, no cartão de mudar e na
 * linha do tempo. Exigência pede ação do escritório (prazo correndo);
 * deferimento e indeferimento são decisão; o resto é espera.
 */
export type RequestStageTone = "waiting" | "action" | "granted" | "denied";

export const REQUEST_STAGE_TONE: Record<RequestStageKey, RequestStageTone> = {
  REQUERIMENTO: "waiting",
  EXIGENCIA: "action",
  CUMPRIMENTO_DE_EXIGENCIA: "waiting",
  DEFERIMENTO: "granted",
  INDEFERIMENTO: "denied",
  RECURSO: "waiting",
};

/** A API devolve o rótulo; aceita também a chave, por tolerância. */
export const requestStageKeyOf = (
  value?: string | null,
): RequestStageKey | null => {
  if (!value) return null;
  return (
    getRequestStageKeyByLabel(value) ??
    REQUEST_STAGES.find((stage) => stage.key === value)?.key ??
    null
  );
};

/** A etapa da linha, ou `null` — o cliente ainda não foi ao INSS. */
export const requestStageOf = (value?: string | null): RequestStage | null => {
  const key = requestStageKeyOf(value);
  return REQUEST_STAGES.find((stage) => stage.key === key) ?? null;
};

export type TrackSegment = "done" | "denied" | RequestStageTone | "upcoming";

/**
 * O trilho de cinco pontos de uma etapa: o caminho até ela em verde, ela na
 * sua cor, o resto em cinza. Deferido fecha o trilho inteiro em verde; em
 * recurso, o ponto da decisão fica vermelho — recurso só existe porque houve
 * indeferimento.
 */
export function requestStageTrack(stage: RequestStage | null): TrackSegment[] {
  return Array.from({ length: REQUEST_STAGE_TRACK }, (_, index) => {
    const point = index + 1;
    if (!stage) return "upcoming";
    if (stage.key === "DEFERIMENTO") return "done";
    if (point === stage.order) return REQUEST_STAGE_TONE[stage.key];
    if (stage.key === "RECURSO" && point === ORDER.INDEFERIMENTO)
      return "denied";
    return point < stage.order ? "done" : "upcoming";
  });
}

/** O aviso da mudança de etapa no INSS. */
export const requestStageChangedMessage = (
  clientName: string,
  stage: RequestStageKey,
) =>
  `Situação no INSS de ${clientName} atualizada para "${RequestStageLabelByKey[stage]}".`;

// ── Justificativa ──

/**
 * As etapas que pedem justificativa — o espelho de
 * `RequestStage.exigeJustificativa()` no backend. São as que existem por causa
 * de um motivo: a exigência (o que o INSS pediu), o indeferimento (por que
 * negou) e o recurso (contra o quê se recorre). Sem o motivo, o PATCH volta
 * 400.
 */
const NEEDS_JUSTIFICATION: ReadonlySet<RequestStageKey> =
  new Set<RequestStageKey>(["EXIGENCIA", "INDEFERIMENTO", "RECURSO"]);

export const requiresJustification = (key: RequestStageKey): boolean =>
  NEEDS_JUSTIFICATION.has(key);

/** O teto do backend (`@Size(max = 1000)`). */
export const REQUEST_STAGE_JUSTIFICATION_MAX = 1000;

/** O exemplo do campo, por etapa: diz que tipo de texto se espera ali. */
export const JUSTIFICATION_PLACEHOLDER: Partial<
  Record<RequestStageKey, string>
> = {
  EXIGENCIA: "O que o INSS pediu? Ex.: CTPS original e PPP da última empresa.",
  INDEFERIMENTO:
    "Por que o INSS negou? Ex.: falta de carência, 152 das 180 contribuições.",
  RECURSO:
    "Contra o quê se recorre? Ex.: período rural de 1988 a 1992 não reconhecido.",
};

/**
 * O erro da justificativa para mover para `stage`, ou `null`. Etapa que não
 * pede justificativa nunca tem erro. O texto segue a regra de toda
 * justificativa da casa (`validateJustification`: obrigatória, com um mínimo)
 * e o teto do backend.
 */
export function requestStageJustificationError(
  stage: RequestStageKey,
  text: string,
): string | null {
  if (!requiresJustification(stage)) return null;
  const error = validateJustification(text);
  if (error) return error;
  return text.trim().length > REQUEST_STAGE_JUSTIFICATION_MAX
    ? `Use até ${REQUEST_STAGE_JUSTIFICATION_MAX} caracteres.`
    : null;
}

/**
 * O corpo do PATCH que muda a etapa. A justificativa vai, sem os espaços das
 * pontas, só para as etapas que a pedem — nas outras o campo nem aparece.
 */
export function requestStagePatch(
  stage: RequestStageKey,
  justification = "",
): Pick<ClientPatchRequest, "requestStage" | "requestStageJustification"> {
  const text = justification.trim();
  return requiresJustification(stage) && text
    ? { requestStage: stage, requestStageJustification: text }
    : { requestStage: stage };
}
