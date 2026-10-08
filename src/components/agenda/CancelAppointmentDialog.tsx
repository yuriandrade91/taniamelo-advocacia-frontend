"use client";

import { useResetOnOpen } from "@/hooks/useResetOnOpen";
import {useState} from "react";
import { Button, Modal, WarningIcon } from "@heroui/react";
import ModalShell from "@/components/ui/modals/ModalShell";
import { TextAreaField } from "@/components/ui/form/Field";

/**
 * Cancelamento com justificativa.
 *
 * A justificativa é `@NotBlank` no `AppointmentCancelRequestDTO` e vai para o
 * `appointment_history` — é registro de auditoria, não formalidade. Por isso o
 * diálogo é próprio e não o `ConfirmDialog` genérico: aqui há um campo
 * obrigatório, e um confirm com texto livre embutido viraria um confirm com
 * cinco flags.
 */

/** Mesmo mínimo que o `AppointmentsCard` já usava. */
export const MIN_CANCEL_JUSTIFICATION_LENGTH = 10;

export type CancelAppointmentDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (justification: string) => void;
  appointmentTitle: string;
};

export default function CancelAppointmentDialog({
  isOpen,
  onClose,
  onConfirm,
  appointmentTitle,
}: CancelAppointmentDialogProps) {
  const [justification, setJustification] = useState("");
  const [touched, setTouched] = useState(false);

  // Limpa a cada abertura: reaproveitar o texto da vez anterior gravaria a
  // justificativa de um compromisso na trilha de outro. Ajuste no render (e
  // não num efeito): o diálogo já abre limpo, sem um quadro com o texto velho.
  useResetOnOpen(isOpen, () => {
    setJustification("");
    setTouched(false);
  });

  const trimmed = justification.trim();
  const error = !trimmed
    ? "Informe a justificativa."
    : trimmed.length < MIN_CANCEL_JUSTIFICATION_LENGTH
      ? `A justificativa precisa ter pelo menos ${MIN_CANCEL_JUSTIFICATION_LENGTH} caracteres.`
      : undefined;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      className="sm:max-w-[460px]"
      heading="Cancelar compromisso?"
      icon={<WarningIcon className="size-5" />}
      iconClassName="bg-warning/10 text-secondary"
    >
      <Modal.Body>
        <p className="mt-1 text-sm text-gray-100/70">
          <span className="font-medium">{appointmentTitle}</span> será
          marcado como cancelado. A justificativa fica registrada no
          histórico.
        </p>

        <div className="mt-4">
          <TextAreaField
            label="Justificativa"
            isRequired
            rows={4}
            placeholder="Motivo do cancelamento"
            value={justification}
            onChange={setJustification}
            onBlur={() => setTouched(true)}
            isInvalid={touched && !!error}
            errorMessage={touched ? error : undefined}
          />
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button
          className="w-full"
          type="button"
          variant="danger"
          isDisabled={!!error}
          onClick={() => {
            if (error) return;
            onConfirm(trimmed);
            onClose();
          }}
        >
          Cancelar compromisso
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>
          Manter
        </Button>
      </Modal.Footer>
    </ModalShell>
  );
}
