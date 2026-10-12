import type { RequestStageKey } from "@/enums/requestStage/RequestStage";
import type { ClientRequestStageHistory } from "@/interfaces/client/Client.interface";
import {
  REQUEST_STAGE_TONE,
  requestStageOf,
  type RequestStage,
  type RequestStageTone,
} from "@/components/clients/stage/requestStages";
import { officeToday } from "@/lib/officeClock";
import { daysBetween } from "@/lib/period";

/**
 * O andamento no INSS na ficha: onde o requerimento está e por onde passou —
 * funções puras sobre a etapa do cliente (`requestStage`) e o histórico que o
 * backend grava a cada mudança (`GET /clients/{id}/request-stage-history`).
 *
 * O histórico é só leitura e começa na primeira mudança feita depois que ele
 * passou a existir: cliente que já estava numa etapa antes disso tem etapa e
 * nenhuma entrada. Por isso "desde quando" e a justificativa da etapa atual
 * podem faltar — e faltam, em vez de serem inventados.
 */

/** O que a etapa atual diz sobre o processo, em uma frase. */
const STATUS_PHRASE: Record<RequestStageKey, string> = {
  REQUERIMENTO: "Requerido — aguardando análise do INSS",
  EXIGENCIA: "Em exigência — o INSS aguarda o cumprimento",
  CUMPRIMENTO_DE_EXIGENCIA: "Exigência cumprida — aguardando análise do INSS",
  INDEFERIMENTO: "Indeferido",
  RECURSO: "Em recurso — aguardando julgamento",
  DEFERIMENTO: "Deferido",
};

const clean = (text?: string | null): string | null => text?.trim() || null;

/** Do mais recente para o mais antigo, sem depender da ordem em que a página veio. */
export const newestFirst = (history: readonly ClientRequestStageHistory[]): ClientRequestStageHistory[] =>
  [...history].sort((a, b) => Date.parse(b.changedAt) - Date.parse(a.changedAt));

export type RequestStageStatus = {
  stage: RequestStage;
  tone: RequestStageTone;
  phrase: string;
  /** `Instant` em que entrou na etapa atual; `null` sem histórico dela. */
  since: string | null;
  /** Dias na etapa atual, contados no fuso do escritório; `null` sem `since`. */
  days: number | null;
  /** O motivo da entrada na etapa atual; `null` quando não houve (ou não se sabe). */
  justification: string | null;
};

/**
 * A etapa atual do cliente e, quando o histórico a registra, desde quando e
 * por quê.
 *
 * A entrada que conta é a **mais recente**, e só se ela levou à etapa atual:
 * uma entrada mais antiga da mesma etapa (exigência, cumprimento, exigência de
 * novo) contaria a primeira exigência como se fosse a de agora.
 *
 * @param today `yyyy-MM-dd` no fuso do escritório (`useOfficeToday`).
 */
export function requestStageStatus(
  requestStage: string | null | undefined,
  history: readonly ClientRequestStageHistory[],
  today: string,
): RequestStageStatus | null {
  const stage = requestStageOf(requestStage);
  if (!stage) return null;

  const [latest] = newestFirst(history);
  const entered = latest && requestStageOf(latest.currentStage)?.key === stage.key ? latest : null;
  const since = entered?.changedAt ?? null;

  return {
    stage,
    tone: REQUEST_STAGE_TONE[stage.key],
    phrase: STATUS_PHRASE[stage.key],
    since,
    days: since ? Math.max(0, daysBetween(officeToday(new Date(since)), today)) : null,
    justification: clean(entered?.justification),
  };
}

export type RequestStageHistoryRow = {
  id: string;
  /** Rótulo da etapa em que entrou (o da API, se não for uma etapa conhecida). */
  label: string;
  tone: RequestStageTone;
  /** De onde veio; `null` na primeira entrada (o protocolo). */
  previousLabel: string | null;
  /** Quanto tempo ficou na etapa anterior; `null` quando não se sabe. */
  daysInPrevious: number | null;
  justification: string | null;
  changedAt: string;
  changedByUserId?: string;
};

/** As linhas da linha do tempo, da mudança mais recente para a mais antiga. */
export function requestStageHistoryRows(
  history: readonly ClientRequestStageHistory[],
): RequestStageHistoryRow[] {
  return newestFirst(history).map((entry) => {
    const stage = requestStageOf(entry.currentStage);
    const previous = entry.previousStage ? (requestStageOf(entry.previousStage)?.label ?? entry.previousStage) : null;
    return {
      id: entry.id,
      label: stage?.label ?? entry.currentStage,
      tone: stage ? REQUEST_STAGE_TONE[stage.key] : "waiting",
      previousLabel: previous,
      daysInPrevious: entry.diasNaEtapaAnterior ?? null,
      justification: clean(entry.justification),
      changedAt: entry.changedAt,
      changedByUserId: entry.changedByUserId,
    };
  });
}
