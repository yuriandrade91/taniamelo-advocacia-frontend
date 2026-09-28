"use client";

import { useEffect, useState } from "react";
import { Button, Modal, WarningIcon } from "@heroui/react";
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
  // justificativa de um compromisso na trilha de outro.
  useEffect(() => {
    if (isOpen) {
      setJustification("");
      setTouched(false);
    }
  }, [isOpen]);

  const trimmed = justification.trim();
  const error =
    !trimmed
      ? "Informe a justificativa."
      : trimmed.length < MIN_CANCEL_JUSTIFICATION_LENGTH
        ? `A justificativa precisa ter pelo menos ${MIN_CANCEL_JUSTIFICATION_LENGTH} caracteres.`
        : undefined;

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop
        variant="opaque"
        className="data-[entering]:duration-400 data-[entering]:ease-[cubic-bezier(0.16,1,0.3,1)] data-[exiting]:duration-200 data-[exiting]:ease-[cubic-bezier(0.7,0,0.84,0)]"
      >
        <Modal.Container className="data-[entering]:animate-in data-[entering]:fade-in-0 data-[entering]:zoom-in-95 data-[entering]:duration-400 data-[exiting]:animate-out data-[exiting]:fade-out-0 data-[exiting]:zoom-out-95 data-[exiting]:duration-200">
          <Modal.Dialog className="sm:max-w-[460px]">
            <Modal.CloseTrigger />

            <Modal.Header>
              <Modal.Icon className="bg-warning/10 text-secondary">
                <WarningIcon className="size-5" />
              </Modal.Icon>
              <Modal.Heading>Cancelar compromisso?</Modal.Heading>
            </Modal.Header>

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
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
