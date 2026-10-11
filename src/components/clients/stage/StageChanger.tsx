"use client";

import { useState, type ReactNode } from "react";
import { Popover, Skeleton } from "@heroui/react";
import { ActionButton, ActionGroup } from "@/components/ui/actions/ActionGroup";
import { STAGES, stageOf, type Stage } from "./stages";
import { StageMoveDialog } from "./StageMoveDialog";
import { useSituationTrail } from "./stageTrails";
import { planStageMove, trailReachedAt, trailSkippedStages, type StageMove } from "./stageMoves";
import { formatInstantDateBR } from "@/lib/format";
import { useHoverCard } from "@/hooks/useHoverCard";
import { Pill } from "@/components/ui/feedback/Badges";

/**
 * Mudar a situação direto na lista: clicar no selo/trilho abre a esteira em
 * pé, num cartão no mesmo desenho do popover do cliente potencial.
 *
 * - Etapas cumpridas em **verde com ✓**, a atual dourada com halo, as
 *   próximas em cinza. Na última etapa ("Benefício concluído") não há o que
 *   esperar: tudo fica verde, sem halo.
 * - Etapas que o cliente **pulou** (lidas da trilha de situação, buscada só
 *   ao abrir o cartão) ficam cinza, riscadas, com o selo "pulado".
 * - As cumpridas e a atual mostram a **data** em que o cliente chegou a
 *   elas, da mesma trilha.
 * - Abre ao clicar **ou ao passar o mouse** (com espera); clicado ou com
 *   uma etapa escolhida, fica aberto até cancelar ou confirmar.
 * - Escolher uma etapa só **marca**; um trilho de prévia mostra como fica.
 *   Gravar é o botão "Mover para…", para um clique distraído não mudar nada.
 * - Pular etapas ou voltar pede confirmação com justificativa
 *   (`StageMoveDialog`). Quem decide qual é qual é `planStageMove` — a mesma
 *   regra para o botão, o aviso e o diálogo.
 *
 * `onConfirm` faz o PATCH; enquanto ele não volta, o botão fica em "Salvando…".
 * Se falhar, o cartão (ou o diálogo) continua aberto, para tentar de novo.
 */

type StepState = "done" | "current" | "upcoming" | "skipped";

const STEP_NODE: Record<StepState | "picked", string> = {
  picked: "bg-primary text-white ring-4 ring-primary/15",
  current: "bg-secondary text-white",
  done: "bg-success text-white",
  skipped: "bg-light-gray text-gray-100",
  upcoming: "bg-white text-gray-100 ring-1 ring-light-gray",
};

const STEP_TEXT: Record<StepState, string> = {
  done: "text-emerald-700",
  current: "font-medium text-primary",
  skipped: "text-gray-100/70 line-through decoration-gray-100/50",
  upcoming: "text-gray-100",
};

const STEP_STATE_LABEL: Record<StepState, string> = {
  done: "concluída",
  current: "etapa atual",
  upcoming: "próxima",
  skipped: "pulada",
};

/** Diálogo aberto depois do cartão: confirmar um pulo ou um retrocesso. */
type PendingConfirmation = { stage: Stage; move: StageMove };

export function StageChanger({
  clientId,
  clientName,
  situation,
  onConfirm,
  children,
}: {
  /** Para buscar a trilha (etapas puladas). Sem id, o cartão só não as marca. */
  clientId?: string;
  clientName: string;
  situation?: string;
  onConfirm: (stage: Stage) => Promise<void>;
  /** O gatilho — o selo + trilho da linha. */
  children: ReactNode;
}) {
  const current = stageOf(situation);
  const [picked, setPicked] = useState<Stage | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pending, setPending] = useState<PendingConfirmation | null>(null);

  /**
   * Clicado, fica aberto até cancelar/confirmar. Escolher uma etapa também
   * prende o cartão: sair com o mouse não perde a escolha. Com o diálogo de
   * confirmação por cima, o hover não reabre.
   */
  const card = useHoverCard({
    keepOpen: picked !== null,
    canOpen: pending === null,
    onClose: () => setPicked(null),
  });
  const { isOpen } = card;

  const trail = useSituationTrail(clientId, isOpen);
  const skippedKeys = new Set(
    trailSkippedStages(trail ?? [], current, STAGES, stageOf).map((stage) => stage.key),
  );
  const reachedAt = trailReachedAt(trail ?? [], (entry) => stageOf(entry.currentSituation).key);

  const target = picked ?? current;
  const move = planStageMove(current, target, STAGES);
  const changed = move.kind !== "none";
  const isFinished = current.step === STAGES.length;

  const stepState = (stage: Stage): StepState => {
    if (skippedKeys.has(stage.key)) return "skipped";
    if (stage.key === current.key) return isFinished ? "done" : "current";
    return current.step > 0 && stage.step < current.step ? "done" : "upcoming";
  };

  const closeConfirmation = () => {
    setPending(null);
    setPicked(null);
  };

  const save = async (stage: Stage) => {
    setIsSaving(true);
    try {
      await onConfirm(stage);
      card.close();
      setPending(null);
    } catch {
      // O interceptor já mostrou o erro; cartão/diálogo ficam para tentar de novo.
    } finally {
      setIsSaving(false);
    }
  };

  const confirm = () => {
    if (!picked || !changed) return;
    if (move.kind === "advance") {
      void save(picked);
      return;
    }
    // Pular ou voltar: o cartão dá lugar ao diálogo com justificativa.
    setPending({ stage: picked, move });
    card.hide();
  };

  const confirmLabel = isSaving
    ? "Salvando…"
    : move.kind === "none"
      ? "Escolha uma etapa"
      : move.kind === "regress"
        ? `Voltar para ${target.short}…`
        : move.kind === "skip"
          ? `Pular para ${target.short}…`
          : `Mover para ${target.short}`;

  const dialogKind =
    pending?.move.kind === "regress" || pending?.move.kind === "skip" ? pending.move.kind : null;

  /** Na prévia, ficam cinza as já puladas e as que este movimento pula. */
  const previewSkipped = new Set([...skippedKeys, ...move.skipped.map((stage) => stage.key)]);

  return (
    <>
      <Popover {...card.popoverProps}>
        <Popover.Trigger
          {...card.triggerProps}
          aria-label={`Mudar a situação de ${clientName}`}
          className="block w-full cursor-pointer rounded-xl text-left transition outline-none hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-secondary/60"
        >
          {children}
        </Popover.Trigger>

        <Popover.Content {...card.contentProps} placement="bottom" className="w-80">
          <Popover.Arrow />
          <Popover.Dialog aria-label="Mudar situação">
            <Pill size="sm">Mudar situação</Pill>
            <p className="mt-2 truncate text-sm font-semibold text-primary">{clientName}</p>
            <p className="mt-0.5 text-xs text-gray-100">Etapa atual: {current.label}</p>

            {/* A esteira em pé: um nó por etapa, ligados por um fio. */}
            <ol aria-label="Etapas da esteira" className="mt-3 flex flex-col">
              {STAGES.map((stage, index) => {
                const state = stepState(stage);
                const isPicked = picked?.key === stage.key;
                const isLast = index === STAGES.length - 1;
                // Data só no que já aconteceu: depois de um retrocesso, a
                // etapa à frente guarda uma data que não vale mais.
                const isReached = state === "done" || state === "current";
                const reached = reachedAt.get(stage.key);
                const date = reached ? formatInstantDateBR(reached) : null;
                return (
                  <li key={stage.key} className="relative" data-state={state}>
                    {!isLast && (
                      <span
                        aria-hidden="true"
                        className={`absolute top-8 left-5.5 h-[calc(100%-1.25rem)] w-0.5 rounded-full ${
                          state === "done" ? "bg-success" : "bg-light-gray"
                        }`}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => setPicked(stage.key === current.key ? null : stage)}
                      aria-pressed={isPicked}
                      aria-label={`${stage.label} (${STEP_STATE_LABEL[state]}${isReached && date ? `, em ${date}` : ""})`}
                      disabled={isSaving}
                      className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-1.5 text-left text-sm transition ${
                        isPicked ? "bg-primary/5 ring-1 ring-primary/20" : "hover:bg-primary/5"
                      }`}
                    >
                      <span className="relative grid h-6 w-6 shrink-0 place-items-center">
                        {state === "current" && (
                          <span className="absolute inset-0 rounded-full bg-secondary/40 motion-safe:animate-halo" />
                        )}
                        <span
                          className={`relative grid h-6 w-6 place-items-center rounded-full text-[11px] font-semibold ${
                            STEP_NODE[isPicked ? "picked" : state]
                          }`}
                        >
                          {state === "done" && !isPicked ? "✓" : stage.step}
                        </span>
                      </span>
                      <span
                        className={`flex-1 truncate ${isPicked ? "font-medium text-primary" : STEP_TEXT[state]}`}
                      >
                        {stage.label}
                      </span>
                      {state === "skipped" && (
                        <Pill tone="muted">pulado</Pill>
                      )}
                      {isReached &&
                        (trail === null ? (
                          <Skeleton className="h-3 w-16 shrink-0 rounded-md" />
                        ) : (
                          date && <span className="shrink-0 text-[11px] text-gray-100 tabular-nums">{date}</span>
                        ))}
                    </button>
                  </li>
                );
              })}
            </ol>

            {changed && (
              <div className="mt-3 rounded-2xl bg-page p-3">
                <p className="text-[11px] font-medium tracking-wide text-secondary uppercase">
                  Como fica
                </p>
                <StagePreview target={target} skippedKeys={previewSkipped} />
                {move.kind === "regress" && (
                  <p className="mt-2 text-xs text-previsto">
                    ↩ Volta de etapa: vamos pedir a justificativa do retrocesso.
                  </p>
                )}
                {move.kind === "skip" && (
                  <p className="mt-2 text-xs text-previsto">
                    ⤼ Pula {move.skipped.length === 1 ? "uma etapa" : `${move.skipped.length} etapas`}:
                    vamos pedir confirmação e justificativa.
                  </p>
                )}
              </div>
            )}

            <ActionGroup shape="pill" className="mt-3">
              <ActionButton shape="pill" tone="neutral" disabled={isSaving} onClick={card.close}>
                Cancelar
              </ActionButton>
              <ActionButton shape="pill" tone="primary" grow disabled={!changed || isSaving} onClick={confirm}>
                {confirmLabel}
              </ActionButton>
            </ActionGroup>
          </Popover.Dialog>
        </Popover.Content>
      </Popover>

      <StageMoveDialog
        kind={dialogKind}
        clientName={clientName}
        from={current.label}
        to={pending?.stage.label ?? ""}
        skipped={pending?.move.skipped ?? []}
        isSaving={isSaving}
        onClose={closeConfirmation}
        // A justificativa não vai ao backend (o PATCH ainda não tem o campo).
        onConfirm={() => pending && void save(pending.stage)}
      />
    </>
  );
}

/**
 * O trilho de como fica: cumpridas em verde, puladas em cinza, a etapa de
 * destino dourada e o resto cinza claro. Destino na última etapa fecha tudo
 * (menos as puladas) em verde.
 */
function StagePreview({
  target,
  skippedKeys,
}: {
  target: Stage;
  skippedKeys: ReadonlySet<string>;
}) {
  const finished = target.step === STAGES.length;
  return (
    <div className="mt-2 flex gap-1" aria-hidden="true">
      {STAGES.map((stage) => (
        <span
          key={stage.key}
          className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
            skippedKeys.has(stage.key) && stage.step < target.step
              ? "bg-gray-100/30"
              : stage.step < target.step || (finished && stage.step === target.step)
                ? "bg-success"
                : stage.step === target.step
                  ? "bg-secondary"
                  : "bg-light-gray/70"
          }`}
        />
      ))}
    </div>
  );
}
