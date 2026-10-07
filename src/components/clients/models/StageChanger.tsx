"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Popover } from "@heroui/react";
import { ActionButton, ActionGroup } from "@/components/ui/actions/ActionGroup";
import { STAGES, stageOf, type Stage } from "./kit";
import { StageMoveDialog } from "./StageMoveDialog";
import { useSituationTrail } from "./situationTrail";
import { planStageMove, trailSkippedStages, type StageMove } from "./stageMoves";
import { useDismiss } from "@/hooks/useDismiss";

/**
 * Mudar a situação direto na lista: clicar no selo/trilho abre a esteira em
 * pé, num cartão no mesmo desenho do popover do cliente potencial.
 *
 * - Etapas cumpridas em **verde com ✓**, a atual dourada com halo, as
 *   próximas em cinza. Na última etapa ("Benefício concluído") não há o que
 *   esperar: tudo fica verde, sem halo.
 * - Etapas que o cliente **pulou** (lidas da trilha de situação, buscada só
 *   ao abrir o cartão) ficam cinza, riscadas, com o selo "pulado".
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

/**
 * Passar o mouse abre o cartão depois de uma pequena espera (o cursor que só
 * atravessa a coluna não faz pipocar cartão nem buscar trilha), e sair dele
 * fecha com uma folga para dar tempo de ir do trilho ao cartão.
 */
const HOVER_OPEN_DELAY_MS = 300;
const HOVER_CLOSE_DELAY_MS = 200;

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
  /** Clicado: fica aberto até cancelar/confirmar, como o popover do potencial. */
  const [isPinned, setIsPinned] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [picked, setPicked] = useState<Stage | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pending, setPending] = useState<PendingConfirmation | null>(null);

  /** Escolher uma etapa também prende o cartão: sair com o mouse não perde a escolha. */
  const isOpen = isPinned || isHovering || picked !== null;

  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearHoverTimer = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
  };
  useEffect(() => clearHoverTimer, []);

  /*
   * O cartão é **não modal** (`isNonModal`): um popover modal cobre a página
   * com uma camada invisível, e o cursor parado no trilho passava a estar
   * "fora" dele — o cartão fechava, a camada sumia, o cursor "entrava" de
   * novo, e o cartão piscava. Sem a camada, clicar fora e Esc ficam por nossa
   * conta, aqui.
   */
  const triggerRef = useRef<HTMLDivElement>(null);
  /** O fechamento pedido pelo popover veio de um clique no próprio trilho? */
  const triggerPressed = useRef(false);
  const cardRef = useRef<HTMLElement>(null);

  const hoverIn = () => {
    clearHoverTimer();
    if (isOpen || pending) return;
    hoverTimer.current = setTimeout(() => setIsHovering(true), HOVER_OPEN_DELAY_MS);
  };
  const hoverOut = () => {
    clearHoverTimer();
    hoverTimer.current = setTimeout(() => setIsHovering(false), HOVER_CLOSE_DELAY_MS);
  };

  const trail = useSituationTrail(clientId, isOpen);
  const skippedKeys = new Set(
    trailSkippedStages(trail, current, STAGES, stageOf).map((stage) => stage.key),
  );

  const target = picked ?? current;
  const move = planStageMove(current, target, STAGES);
  const changed = move.kind !== "none";
  const isFinished = current.step === STAGES.length;

  const stepState = (stage: Stage): StepState => {
    if (skippedKeys.has(stage.key)) return "skipped";
    if (stage.key === current.key) return isFinished ? "done" : "current";
    return current.step > 0 && stage.step < current.step ? "done" : "upcoming";
  };

  const closeCard = () => {
    clearHoverTimer();
    setIsPinned(false);
    setIsHovering(false);
    setPicked(null);
  };
  useDismiss(isOpen, closeCard, [triggerRef, cardRef], (target) => {
    // Clique no trilho com o cartão aberto (pelo mouse): prende. Se o popover
    // ainda pedir para fechar logo em seguida, o `onOpenChange` lê esta marca
    // e não fecha.
    if (!triggerRef.current?.contains(target)) return;
    triggerPressed.current = true;
    setIsPinned(true);
  });

  const closeConfirmation = () => {
    setPending(null);
    setPicked(null);
  };

  const save = async (stage: Stage) => {
    setIsSaving(true);
    try {
      await onConfirm(stage);
      closeCard();
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
    clearHoverTimer();
    setIsPinned(false);
    setIsHovering(false);
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
      <Popover
        isOpen={isOpen}
        onOpenChange={(open) => {
          // Clique no trilho com o cartão aberto pelo mouse prende em vez de
          // fechar; qualquer outro fechamento (Esc, fora) fecha de verdade.
          const pressedTrigger = triggerPressed.current;
          triggerPressed.current = false;
          if (open || (pressedTrigger && !isPinned)) setIsPinned(true);
          else closeCard();
        }}
      >
        <Popover.Trigger
          ref={triggerRef}
          aria-label={`Mudar a situação de ${clientName}`}
          onMouseEnter={hoverIn}
          onMouseLeave={hoverOut}
          className="block w-full cursor-pointer rounded-xl text-left transition outline-none hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-secondary/60"
        >
          {children}
        </Popover.Trigger>

        <Popover.Content
          ref={cardRef}
          isNonModal
          placement="bottom"
          className="w-80"
          onMouseEnter={clearHoverTimer}
          onMouseLeave={hoverOut}
        >
          <Popover.Arrow />
          <Popover.Dialog aria-label="Mudar situação">
            <span className="inline-flex w-fit items-center rounded-full bg-light-secondary px-2 py-0.5 text-[11px] font-medium text-secondary">
              Mudar situação
            </span>
            <p className="mt-2 truncate text-sm font-semibold text-primary">{clientName}</p>
            <p className="mt-0.5 text-xs text-gray-100">
              Etapa atual: {current.label}
              {current.step > 0 && ` · ${current.step}/${STAGES.length}`}
            </p>

            {/* A esteira em pé: um nó por etapa, ligados por um fio. */}
            <ol aria-label="Etapas da esteira" className="mt-3 flex flex-col">
              {STAGES.map((stage, index) => {
                const state = stepState(stage);
                const isPicked = picked?.key === stage.key;
                const isLast = index === STAGES.length - 1;
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
                      aria-label={`${stage.label} (${STEP_STATE_LABEL[state]})`}
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
                        <span className="rounded-full bg-light-gray px-2 py-0.5 text-[10px] font-medium text-gray-100">
                          pulado
                        </span>
                      )}
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
              <ActionButton shape="pill" tone="neutral" disabled={isSaving} onClick={closeCard}>
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
