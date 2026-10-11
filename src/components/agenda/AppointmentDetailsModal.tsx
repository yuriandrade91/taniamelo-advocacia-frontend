"use client";

import { Button, Modal } from "@heroui/react";
import ModalShell from "@/components/ui/modals/ModalShell";
import { DetailsIcon } from "@/components/ui/icons/actions";
import type { AppointmentResponse } from "@/interfaces/appointment/Appointment.interface";
import { formatWhen } from "./agendaGrouping";

/**
 * A descrição de um compromisso, só para ler.
 *
 * A linha da agenda não tem espaço para texto livre; a ação "Ver detalhes"
 * só aparece quando há descrição — abrir uma modal vazia seria pior que não
 * ter o botão.
 */
export function AppointmentDetailsModal({
  appointment,
  onClose,
}: {
  appointment: AppointmentResponse | null;
  onClose: () => void;
}) {
  return (
    <ModalShell
      isOpen={appointment !== null}
      onClose={onClose}
      className="sm:max-w-[440px]"
      heading={appointment?.title ?? ""}
      icon={<DetailsIcon />}
      iconClassName="bg-gray-100/10 text-gray-100"
    >
      <Modal.Body>
        {/* Contexto antes da descrição: um parágrafo solto não diz de qual compromisso se trata. */}
        {appointment && (
          <p className="text-xs text-gray-100/60">
            {formatWhen(appointment.startAt)}
            {appointment.type ? ` · ${appointment.type}` : ""}
            {appointment.clientName ? ` · ${appointment.clientName}` : ""}
          </p>
        )}
        {/* `whitespace-pre-line`: as quebras de linha de quem digitou importam. */}
        <p className="mt-3 text-sm whitespace-pre-line text-gray-100">{appointment?.description}</p>
      </Modal.Body>
      <Modal.Footer>
        <Button className="w-full" type="button" variant="primary" onClick={onClose}>
          Fechar
        </Button>
      </Modal.Footer>
    </ModalShell>
  );
}
