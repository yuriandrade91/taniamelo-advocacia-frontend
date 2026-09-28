"use client";

import { Button } from "@heroui/react";
import { StatusBadge, type BadgeTone } from "@/components/ui/feedback/Badges";
import { AppointmentStatusLabelByKey } from "@/enums/appointment/Appointment";
import type { AppointmentResponse } from "@/interfaces/appointment/Appointment.interface";
import { localTimeOf } from "./agendaGrouping";
import { usePermissoes } from "@/hooks/usePermissoes";

/**
 * Uma linha da agenda.
 *
 * Apresentacional: recebe o compromisso e os callbacks, não conhece service
 * nem estado da página. As ações aparecem conforme o status porque um
 * compromisso cancelado não se conclui e um concluído não se cancela — a regra
 * é do backend (`complete` recusa cancelado com 400) e a tela não deve oferecer
 * o que a API vai negar.
 */

const STATUS_TONE: Record<string, BadgeTone> = {
  [AppointmentStatusLabelByKey.AGENDADO]: "neutral",
  [AppointmentStatusLabelByKey.CONCLUIDO]: "success",
  [AppointmentStatusLabelByKey.CANCELADO]: "danger",
};

export type AppointmentRowProps = {
  appointment: AppointmentResponse;
  onEdit: (appointment: AppointmentResponse) => void;
  onComplete: (appointment: AppointmentResponse) => void;
  onCancel: (appointment: AppointmentResponse) => void;
  onDelete: (appointment: AppointmentResponse) => void;
};

export function AppointmentRow({
  appointment,
  onEdit,
  onComplete,
  onCancel,
  onDelete,
}: AppointmentRowProps) {
  const { podeDestruir } = usePermissoes();
  const isScheduled =
    appointment.status === AppointmentStatusLabelByKey.AGENDADO;
  const tone = STATUS_TONE[appointment.status] ?? "neutral";
  const who = appointment.clientName?.trim();

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-black/5 bg-white p-4 sm:flex-row sm:items-center">
      {/* Faixa de horário: largura fixa para os horários alinharem na coluna,
          que é o que permite varrer o dia de cima para baixo. */}
      <div className="flex shrink-0 items-baseline gap-2 sm:w-32 sm:flex-col sm:gap-0">
        <span className="text-lg font-semibold text-primary tabular-nums">
          {localTimeOf(appointment.startAt)}
        </span>
        <span className="text-xs text-gray-100">
          até {localTimeOf(appointment.endAt)}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-primary">
          {appointment.title}
        </p>
        <p className="mt-0.5 truncate text-xs text-gray-100">
          {[appointment.type, appointment.modality, who]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {appointment.status === AppointmentStatusLabelByKey.CANCELADO &&
          appointment.cancellationReason && (
            <p className="mt-1 truncate text-xs text-danger/80">
              Cancelado: {appointment.cancellationReason}
            </p>
          )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <StatusBadge label={String(appointment.status)} tone={tone} />

        {appointment.meetingUrl && (
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              window.open(
                appointment.meetingUrl!,
                "_blank",
                "noopener,noreferrer",
              )
            }
          >
            Entrar
          </Button>
        )}

        {isScheduled && (
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onComplete(appointment)}
            >
              Concluir
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onEdit(appointment)}
            >
              Editar
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onCancel(appointment)}
            >
              Cancelar
            </Button>
          </>
        )}

        {/*
          Concluir, editar e cancelar são o dia a dia e ficam para todo mundo.
          Excluir é de advogado/admin — o backend recusa o atendente com 403, e
          esconder aqui é para ele não esbarrar num botão que existe só para
          dizer não. Cancelar continua disponível: é a ação que o atendente
          usa quando o cliente desmarca.
        */}
        {podeDestruir && (
          <Button
            type="button"
            variant="secondary"
            className="text-danger"
            onClick={() => onDelete(appointment)}
          >
            Excluir
          </Button>
        )}
      </div>
    </li>
  );
}
