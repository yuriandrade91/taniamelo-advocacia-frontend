"use client";

import { useState } from "react";
import { Modal, WarningIcon } from "@heroui/react";
import ModalShell from "@/components/ui/modals/ModalShell";
import { TextAreaField } from "@/components/ui/form/Field";
import { ActionButton, ActionGroup } from "@/components/ui/actions/ActionGroup";
import type { Stage } from "./kit";
import { justificationError } from "./stageJustification";
import { listStageNames } from "./stageMoves";

/**
 * Confirmação de uma mudança de etapa fora do caminho normal — **voltar** ou
 * **pular** — sempre com justificativa (ver `planStageMove`).
 *
 * Um diálogo só para os dois casos: o desenho, a regra da justificativa e os
 * botões são os mesmos; muda o texto e, no pular, a lista nomeando as etapas
 * que ficam para trás ("tem certeza?" genérico só treina o clique no "Sim").
 *
 * A justificativa ainda não vai ao backend (ver `stageJustification.ts`).
 */

export type StageMoveDialogKind = "regress" | "skip";

type StageMoveDialogProps = {
  kind: StageMoveDialogKind | null;
  clientName: string;
  from: string;
  to: string;
  skipped: readonly Stage[];
  isSaving: boolean;
  onClose: () => void;
  onConfirm: (justification: string) => void;
};

export function StageMoveDialog({ kind, isSaving, onClose, ...content }: StageMoveDialogProps) {
  return (
    <ModalShell
      isOpen={kind !== null}
      onClose={onClose}
      isDismissable={!isSaving}
      className="sm:max-w-[480px]"
    >
      {/*
        Conteúdo à parte de propósito: o Modal desmonta o diálogo ao
        fechar, e o texto digitado some junto — a justificativa de um
        cliente não vaza para o próximo, sem efeito de limpeza.
      */}
      {kind && (
        <StageMoveContent kind={kind} isSaving={isSaving} onClose={onClose} {...content} />
      )}
    </ModalShell>
  );
}

function StageMoveContent({
  kind,
  clientName,
  from,
  to,
  skipped,
  isSaving,
  onClose,
  onConfirm,
}: Omit<StageMoveDialogProps, "kind"> & { kind: StageMoveDialogKind }) {
  const [justification, setJustification] = useState("");
  const [touched, setTouched] = useState(false);
  const error = justificationError(justification);
  const isSkip = kind === "skip";
  const count = skipped.length;

  return (
    <>
      <Modal.Header>
        <Modal.Icon className="bg-warning/10 text-secondary">
          <WarningIcon className="size-5" />
        </Modal.Icon>
        <Modal.Heading>
          {!isSkip ? "Voltar etapa?" : count === 1 ? "Pular uma etapa?" : `Pular ${count} etapas?`}
        </Modal.Heading>
      </Modal.Header>

      <Modal.Body>
        <p className="mt-1 text-sm text-gray-100">
          <span className="font-medium text-primary">{clientName}</span>{" "}
          {isSkip ? "vai de" : "volta de"} <span className="font-medium">{from}</span>{" "}
          {isSkip ? "direto para" : "para"} <span className="font-medium">{to}</span>.{" "}
          {isSkip ? (
            <>
              Você está pulando {count === 1 ? "a etapa" : "as etapas"}{" "}
              <span className="font-medium text-primary">{listStageNames(skipped)}</span>.
            </>
          ) : (
            "Conte o motivo do retrocesso."
          )}
        </p>

        {isSkip && (
          <>
            <ul aria-label="Etapas puladas" className="mt-4 flex flex-col gap-1.5">
              {skipped.map((stage) => (
                <li
                  key={stage.key}
                  className="flex items-center gap-2.5 rounded-xl bg-page px-3 py-2 text-sm text-gray-100"
                >
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white text-[11px] font-semibold ring-1 ring-light-gray">
                    {stage.step}
                  </span>
                  <span className="line-through decoration-gray-100/40">{stage.label}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-gray-100/80">
              As etapas puladas ficam marcadas como puladas na esteira do cliente.
            </p>
          </>
        )}

        <div className="mt-4">
          <TextAreaField
            label="Justificativa"
            isRequired
            rows={4}
            placeholder={
              isSkip
                ? "Ex.: o benefício saiu antes de o planejamento ser formalizado."
                : "Ex.: faltou documento na análise e o planejamento precisa ser refeito."
            }
            value={justification}
            onChange={setJustification}
            onBlur={() => setTouched(true)}
            isInvalid={touched && !!error}
            errorMessage={touched ? error : undefined}
          />
        </div>
      </Modal.Body>

      <Modal.Footer>
        <ActionGroup shape="pill" className="w-full">
          <ActionButton shape="pill" tone="neutral" disabled={isSaving} onClick={onClose}>
            Manter
          </ActionButton>
          <ActionButton
            shape="pill"
            tone="primary"
            grow
            disabled={!!error || isSaving}
            onClick={() => onConfirm(justification.trim())}
          >
            {isSaving ? "Salvando…" : `${isSkip ? "Pular" : "Voltar"} para ${to}`}
          </ActionButton>
        </ActionGroup>
      </Modal.Footer>
    </>
  );
}
