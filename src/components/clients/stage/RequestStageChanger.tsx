"use client";

import { useState } from "react";
import { Popover, Skeleton } from "@heroui/react";
import { ActionButton, ActionGroup } from "@/components/ui/actions/ActionGroup";
import { Pill } from "@/components/ui/feedback/Badges";
import { useHoverCard } from "@/hooks/useHoverCard";
import { formatInstantDateBR } from "@/lib/format";
import { trailReachedAt } from "./stageMoves";
import { useRequestStageTrail } from "./stageTrails";
import {
  REQUEST_STAGES,
  REQUEST_STAGE_TONE,
  requestStageOf,
  requestStageTrack,
  type RequestStage,
  type RequestStageTone,
  type TrackSegment,
} from "./requestStages";

/**
 * Mudar a situação no INSS direto na lista — o par do `StageChanger`, no
 * mesmo cartão: clicar (ou passar o mouse) abre as seis etapas em pé;
 * escolher só **marca**, e gravar é o botão "Mover para…".
 *
 * Mais simples que o da situação do benefício, de propósito: a esteira do
 * INSS não é funil (`requestStages.ts`), então não há "pular" nem "voltar" a
 * confirmar com justificativa — ir de recurso para exigência é o INSS sendo o
 * INSS. Também não há como voltar a "sem requerimento": no PATCH, nulo quer
 * dizer "não mexer".
 *
 * Cada etapa por onde o requerimento passou mostra a **data** da última vez
 * que ele entrou nela, lida da trilha do INSS (buscada só ao abrir o cartão).
 *
 * `onConfirm` faz o PATCH; se falhar, o cartão fica aberto para tentar de novo.
 */

/** Nó da etapa no cartão, na cor dela; a escolhida em azul-marinho. */
const NODE: Record<RequestStageTone, string> = {
  waiting: "bg-secondary text-white",
  action: "bg-previsto text-white",
  granted: "bg-success text-white",
  denied: "bg-danger text-white",
};

/** Selo da linha: pela cor, quem lê já sabe se espera, age ou terminou. */
const BADGE: Record<RequestStageTone | "none", string> = {
  waiting: "bg-white text-primary ring-1 ring-black/10",
  action: "bg-previsto/10 text-previsto",
  granted: "bg-success/15 text-success-strong",
  denied: "bg-danger/10 text-danger",
  none: "bg-page text-gray-100",
};

const DOT: Record<RequestStageTone | "none", string> = {
  waiting: "bg-secondary",
  action: "bg-previsto",
  granted: "bg-success-strong",
  denied: "bg-danger",
  none: "bg-gray-100/50",
};

const SEGMENT: Record<TrackSegment, string> = {
  done: "bg-success",
  granted: "bg-success",
  waiting: "bg-secondary",
  action: "bg-previsto",
  denied: "bg-danger",
  upcoming: "bg-light-gray/70",
};

const NO_STAGE = "Sem requerimento";

export function RequestStageChanger({
  clientId,
  clientName,
  requestStage,
  onConfirm,
}: {
  /** Para buscar a trilha (as datas). Sem id, o cartão só não as mostra. */
  clientId?: string;
  clientName: string;
  /** Rótulo como a API devolve; nulo = ainda não foi ao INSS. */
  requestStage?: string | null;
  onConfirm: (stage: RequestStage) => Promise<void>;
}) {
  const current = requestStageOf(requestStage);
  const [picked, setPicked] = useState<RequestStage | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const card = useHoverCard({ keepOpen: picked !== null, onClose: () => setPicked(null) });
  const changed = picked !== null && picked.key !== current?.key;
  const trail = useRequestStageTrail(clientId, card.isOpen);
  const reachedAt = trailReachedAt(trail ?? [], (entry) => requestStageOf(entry.currentStage)?.key);

  const confirm = async () => {
    if (!picked || !changed) return;
    setIsSaving(true);
    try {
      await onConfirm(picked);
      card.close();
    } catch {
      // O interceptor já mostrou o erro; o cartão fica para tentar de novo.
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Popover {...card.popoverProps}>
      <Popover.Trigger
        {...card.triggerProps}
        aria-label={`Mudar a situação no INSS de ${clientName}`}
        className="block w-full cursor-pointer rounded-xl text-left transition outline-none hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-secondary/60"
      >
        <RequestStageMeter stage={current} />
      </Popover.Trigger>

      <Popover.Content {...card.contentProps} placement="bottom" className="w-80">
        <Popover.Arrow />
        <Popover.Dialog aria-label="Mudar situação no INSS">
          <Pill size="sm">Situação no INSS</Pill>
          <p className="mt-2 truncate text-sm font-semibold text-primary">{clientName}</p>
          <p className="mt-0.5 text-xs text-gray-100">
            {current ? `Etapa atual: ${current.label}` : "Ainda não foi ao INSS"}
          </p>

          <ol aria-label="Etapas do INSS" className="mt-3 flex flex-col gap-0.5">
            {REQUEST_STAGES.map((stage) => {
              const isCurrent = stage.key === current?.key;
              const isPicked = picked?.key === stage.key;
              const tone = REQUEST_STAGE_TONE[stage.key];
              const reached = reachedAt.get(stage.key);
              const date = reached ? formatInstantDateBR(reached) : null;
              return (
                <li key={stage.key}>
                  <button
                    type="button"
                    onClick={() => setPicked(isCurrent ? null : stage)}
                    aria-pressed={isPicked}
                    aria-label={`${stage.label}${isCurrent ? " (etapa atual)" : ""}${date ? `, em ${date}` : ""}`}
                    disabled={isSaving}
                    className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-1.5 text-left text-sm transition ${
                      isPicked ? "bg-primary/5 ring-1 ring-primary/20" : "hover:bg-primary/5"
                    }`}
                  >
                    <span
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${
                        isPicked
                          ? "bg-primary text-white ring-4 ring-primary/15"
                          : isCurrent
                            ? NODE[tone]
                            : "bg-white text-gray-100 ring-1 ring-light-gray"
                      }`}
                    >
                      {stage.step}
                    </span>
                    <span
                      className={`flex-1 truncate ${
                        isPicked || isCurrent ? "font-medium text-primary" : "text-gray-100"
                      }`}
                    >
                      {stage.label}
                    </span>
                    {isCurrent && <Pill tone="muted">atual</Pill>}
                    {/* Carregando, só a atual reserva o lugar: é a única que certamente tem data. */}
                    {trail === null ? (
                      isCurrent && <Skeleton className="h-3 w-16 shrink-0 rounded-md" />
                    ) : (
                      date && <span className="shrink-0 text-[11px] text-gray-100 tabular-nums">{date}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>

          <ActionGroup shape="pill" className="mt-3">
            <ActionButton shape="pill" tone="neutral" disabled={isSaving} onClick={card.close}>
              Cancelar
            </ActionButton>
            <ActionButton shape="pill" tone="primary" grow disabled={!changed || isSaving} onClick={() => void confirm()}>
              {isSaving ? "Salvando…" : changed && picked ? `Mover para ${picked.short}` : "Escolha uma etapa"}
            </ActionButton>
          </ActionGroup>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

/**
 * Situação no INSS: selo + trilho de cinco pontos — o par do medidor da
 * situação do benefício. Sem "n/6": a esteira do INSS não é contagem de
 * etapas cumpridas.
 */
function RequestStageMeter({ stage }: { stage: RequestStage | null }) {
  const tone = stage ? REQUEST_STAGE_TONE[stage.key] : "none";
  const label = stage?.label ?? NO_STAGE;
  return (
    <div>
      <span
        title={label}
        className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] leading-none font-medium whitespace-nowrap ${BADGE[tone]}`}
      >
        {tone === "granted" ? (
          <span aria-hidden="true">✓</span>
        ) : (
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT[tone]}`} />
        )}
        <span className="truncate">{label}</span>
      </span>
      <div role="img" aria-label={`Situação no INSS: ${label}`} className="mt-2 flex gap-1">
        {requestStageTrack(stage).map((segment, index) => (
          <span
            key={index}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${SEGMENT[segment]}`}
          />
        ))}
      </div>
    </div>
  );
}
