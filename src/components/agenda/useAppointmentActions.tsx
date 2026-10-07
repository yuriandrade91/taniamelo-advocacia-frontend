"use client";

import { useState } from "react";
import ConfirmDialog from "@/components/ui/modals/ConfirmDialog/ConfirmDialog";
import { usePendingAction } from "@/hooks/usePendingAction";
import type { PendingKind } from "@/lib/pendingActions";
import type { AppointmentResponse } from "@/interfaces/appointment/Appointment.interface";
import {
  cancelAppointment,
  completeAppointment,
  deleteAppointment,
} from "@/services/appointmentService";
import CancelAppointmentDialog from "./CancelAppointmentDialog";

/**
 * Concluir, cancelar e excluir um compromisso — com a confirmação de cada um
 * e a janela de desfazer (`usePendingAction`): a tela muda na hora e a
 * requisição só sai quando a janela fecha. Depois do envio não há volta pela
 * interface (concluir não tem reversão na API; a exclusão lógica existe para
 * auditoria). Mesmo fluxo na Agenda e na Home.
 *
 * Concluir o que ainda não começou pergunta antes: o backend recusa com 422
 * `EARLY_COMPLETION_NOT_CONFIRMED`, e perguntar aqui poupa a ida e o toast de
 * erro — quem manda continua sendo o servidor.
 */
export function useAppointmentActions({ onSettled }: { onSettled: () => void }) {
  const { pending, schedule } = usePendingAction();
  const [cancelTarget, setCancelTarget] = useState<AppointmentResponse | null>(null);
  const [earlyTarget, setEarlyTarget] = useState<AppointmentResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AppointmentResponse | null>(null);

  const run = (target: AppointmentResponse, kind: PendingKind, message: string, commit: () => Promise<unknown>) =>
    schedule({ key: target.id, kind, message, commit, onSettled });

  const complete = (target: AppointmentResponse, earlyCompletionAcknowledged = false) =>
    run(target, "complete", "Compromisso concluído.", () =>
      completeAppointment(target.id, { silent: true, earlyCompletionAcknowledged }),
    );

  return {
    pending,
    requestComplete: (target: AppointmentResponse) => {
      if (new Date(target.startAt).getTime() > Date.now()) setEarlyTarget(target);
      else complete(target);
    },
    requestCancel: setCancelTarget,
    requestDelete: setDeleteTarget,
    dialogs: (
      <>
        <CancelAppointmentDialog
          isOpen={cancelTarget !== null}
          onClose={() => setCancelTarget(null)}
          appointmentTitle={cancelTarget?.title ?? ""}
          onConfirm={(justification) => {
            if (!cancelTarget) return;
            const target = cancelTarget;
            run(target, "cancel", "Compromisso cancelado.", () =>
              cancelAppointment(target.id, { justification }, { silent: true }),
            );
          }}
        />
        <ConfirmDialog
          isOpen={earlyTarget !== null}
          onClose={() => setEarlyTarget(null)}
          tone="danger"
          heading="Concluir antes da hora?"
          confirmLabel="Concluir mesmo assim"
          cancelLabel="Voltar"
          description={
            earlyTarget && (
              <>
                <span className="font-medium">{earlyTarget.title}</span> ainda não começou. Concluir
                agora registra que ele já aconteceu, e concluído não pode ser editado nem cancelado
                depois.
              </>
            )
          }
          onConfirm={() => {
            if (!earlyTarget) return;
            const target = earlyTarget;
            setEarlyTarget(null);
            complete(target, true);
          }}
        />
        <ConfirmDialog
          isOpen={deleteTarget !== null}
          onClose={() => setDeleteTarget(null)}
          tone="danger"
          heading="Excluir compromisso?"
          confirmLabel="Excluir"
          cancelLabel="Manter"
          description={
            deleteTarget && (
              <>
                <span className="font-medium">{deleteTarget.title}</span> sai da agenda. Você tem
                alguns segundos para desfazer.
              </>
            )
          }
          onConfirm={() => {
            if (!deleteTarget) return;
            const target = deleteTarget;
            run(target, "delete", "Compromisso excluído.", () =>
              deleteAppointment(target.id, { silent: true }),
            );
          }}
        />
      </>
    ),
  };
}
