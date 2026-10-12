"use client";

import { useState } from "react";
import { Pill, StatusBadge, type BadgeTone } from "@/components/ui/feedback/Badges";
import { RowSkeletons } from "@/components/ui/feedback/Loading";
import { Notice } from "@/components/ui/feedback/Notice";
import { Timeline, TimelineItem, TimelineMeta } from "@/components/ui/list/Timeline";
import { RequestStageChanger } from "@/components/clients/stage/RequestStageChanger";
import { changeRequestStage } from "@/components/clients/stage/requestStageChange";
import type { RequestStageTone } from "@/components/clients/stage/requestStages";
import {
  RequestStageLabelByKey,
  type RequestStageKey,
  type RequestStageLabel,
} from "@/enums/requestStage/RequestStage";
import { useOfficeToday } from "@/hooks/useOfficeToday";
import { settledValue, useSettled } from "@/hooks/useSettled";
import { formatInstantDateBR, plural } from "@/lib/format";
import { clientRequestStageHistory } from "@/services/clientService";
import { requestStageHistoryRows, requestStageStatus } from "./requestStageHistory";

/**
 * "Andamento no INSS" na ficha: a etapa do requerimento, o botão de mudar e o
 * histórico das mudanças — com a justificativa de cada uma.
 *
 * Tudo vem do backend: a etapa é o `requestStage` do cliente, e o histórico é
 * gravado por ele a cada mudança (`GET /clients/{id}/request-stage-history`).
 * A tela não registra evento nenhum por conta própria.
 *
 * Mudar a etapa grava **na hora** (PATCH), com o mesmo cartão da lista de
 * Clientes — inclusive a justificativa obrigatória de exigência, indeferimento
 * e recurso. Não espera o "Salvar" da ficha: é um andamento do caso, não um
 * campo do cadastro, e o histórico precisa da hora em que aconteceu.
 */

export type ClientInssPanelProps = {
  clientId: string;
  clientName: string;
  /** A etapa gravada, como a API devolve; nula = ainda não foi ao INSS. */
  requestStage?: string | null;
  /** Índice `id do usuário -> nome`, de `useOfficeAuthors`. */
  authors?: Record<string, string>;
  /**
   * A etapa mudou no servidor. A ficha guarda a nova (o PUT do "Salvar"
   * devolveria a antiga) e avisa a lista.
   */
  onChanged: (requestStage: RequestStageLabel) => void;
};

/** A trilha inteira cabe numa página: o backend corta em 100. */
const HISTORY_PAGE_SIZE = 100;

const STATUS_TONE: Record<RequestStageTone, BadgeTone> = {
  waiting: "neutral",
  action: "warning",
  granted: "success",
  denied: "danger",
};

/** Cor da bolinha na linha do tempo — pela etapa, a mesma em qualquer cliente. */
const DOT: Record<RequestStageTone, string> = {
  waiting: "bg-secondary ring-secondary/20",
  action: "bg-previsto ring-previsto/20",
  granted: "bg-success ring-success/20",
  denied: "bg-danger ring-danger/20",
};

const CHANGE_TRIGGER =
  "shrink-0 cursor-pointer rounded-full bg-white px-3.5 py-1.5 text-xs font-medium text-primary ring-1 ring-black/10 transition outline-none hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-secondary/60";

export function ClientInssPanel({
  clientId,
  clientName,
  requestStage,
  authors = {},
  onChanged,
}: ClientInssPanelProps) {
  const today = useOfficeToday();
  /** Sobe a cada mudança gravada: relê o histórico sem voltar ao skeleton. */
  const [version, setVersion] = useState(0);
  const loaded = useSettled(
    `request-stage-history:${clientId}`,
    () => Promise.allSettled([clientRequestStageHistory(clientId, { pageNumber: 1, pageSize: HISTORY_PAGE_SIZE })]),
    version,
  );
  const history = loaded ? (settledValue(loaded[0], null)?.data ?? []) : [];
  const failed = loaded?.[0]?.status === "rejected";

  const status = requestStageStatus(requestStage, history, today);
  const rows = requestStageHistoryRows(history);

  const change = async (stage: RequestStageKey, justification: string) => {
    await changeRequestStage(clientId, clientName, stage, justification);
    onChanged(RequestStageLabelByKey[stage]);
    setVersion((current) => current + 1);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-2xl bg-page p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {status ? (
              <>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <StatusBadge label={status.stage.label} tone={STATUS_TONE[status.tone]} />
                  <p className="text-sm text-primary">{status.phrase}</p>
                </div>
                {status.since && status.days !== null && (
                  <p className="mt-1.5 text-xs text-gray-100">
                    {status.days === 0
                      ? "nesta etapa desde hoje"
                      : `desde ${formatInstantDateBR(status.since)} · há ${plural(status.days, "dia", "dias")} nesta etapa`}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-100">
                Ainda não foi ao INSS. Quando o requerimento for protocolado, marque a etapa aqui.
              </p>
            )}
          </div>
          <RequestStageChanger
            clientId={clientId}
            clientName={clientName}
            requestStage={requestStage}
            onConfirm={(stage, justification) => change(stage.key, justification)}
            trigger={status ? "Mudar etapa" : "Marcar etapa"}
            triggerClassName={CHANGE_TRIGGER}
          />
        </div>

        {status?.justification && (
          <div className="rounded-xl bg-white px-3.5 py-2.5 ring-1 ring-black/5">
            <p className="text-[11px] font-medium tracking-wide text-gray-100 uppercase">Justificativa</p>
            <p className="mt-0.5 text-sm whitespace-pre-line text-primary">{status.justification}</p>
          </div>
        )}
      </div>

      {loaded === null ? (
        <RowSkeletons count={3} />
      ) : failed ? (
        <Notice tone="danger">
          Não foi possível carregar o histórico do INSS. As demais informações da ficha continuam válidas.
        </Notice>
      ) : rows.length === 0 ? (
        status && (
          <Notice>
            Nenhuma mudança registrada ainda. A partir da próxima troca de etapa, cada uma aparece aqui, com a
            data, quem mudou e a justificativa.
          </Notice>
        )
      ) : (
        <Timeline label="Mudanças de etapa no INSS">
          {rows.map((row, index) => {
            const isCurrent = index === 0 && row.label === status?.stage.label;
            return (
              <TimelineItem
                key={row.id}
                dotClassName={DOT[row.tone]}
                isCurrent={isCurrent}
                isLast={index === rows.length - 1}
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`min-w-0 text-sm text-primary ${isCurrent ? "font-semibold" : "font-medium"}`}
                  >
                    {row.label}
                  </span>
                  {isCurrent && (
                    <Pill tone="solid" weight="semibold">
                      atual
                    </Pill>
                  )}
                </div>
                {row.previousLabel && (
                  <p className="text-xs text-gray-100">
                    de {row.previousLabel}
                    {row.daysInPrevious !== null &&
                      (row.daysInPrevious === 0
                        ? ", no mesmo dia"
                        : `, depois de ${plural(row.daysInPrevious, "dia", "dias")}`)}
                  </p>
                )}
                {/* A da etapa atual já está no destaque acima; repetir só ocuparia espaço. */}
                {row.justification && !isCurrent && (
                  <p className="mt-1 rounded-lg bg-page px-2.5 py-1.5 text-sm whitespace-pre-line text-primary">
                    <span className="sr-only">Justificativa: </span>
                    {row.justification}
                  </p>
                )}
                <TimelineMeta
                  date={formatInstantDateBR(row.changedAt)}
                  author={authors[row.changedByUserId ?? ""]}
                />
              </TimelineItem>
            );
          })}
        </Timeline>
      )}
    </div>
  );
}
