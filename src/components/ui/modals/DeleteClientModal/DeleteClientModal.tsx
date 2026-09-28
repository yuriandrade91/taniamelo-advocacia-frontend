"use client";

import React from "react";
import { Button, Modal, WarningIcon } from "@heroui/react";

/**
 * Confirmação de exclusão de cliente.
 *
 * Alinhado ao padrão de confirmação do `AppointmentsCard`:
 * - `isOpen`/`onOpenChange` no `Modal` raiz (não no `Backdrop`) — o `Backdrop`
 *   aceitava por herança, mas o controle pertence ao componente raiz;
 * - `Modal.Icon` com `WarningIcon`, para a natureza destrutiva aparecer antes
 *   do texto;
 * - ação destrutiva em `variant="danger"` e a saída segura em `primary` —
 *   antes o "Sim" (que exclui) era `primary` e o "Não" era `secondary` com
 *   texto vermelho, invertendo o peso visual;
 * - rótulos que dizem o que acontece ("Excluir" / "Manter") em vez de
 *   "Sim" / "Não", que só fazem sentido relidos junto com o título;
 * - mesmas curvas de entrada/saída das demais modais.
 */

interface DeleteClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  onConfirm?: () => void;
}

export default function DeleteClientModal({
  isOpen,
  onClose,
  clientName,
  onConfirm,
}: DeleteClientModalProps) {
  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop
        variant="opaque"
        className="data-[entering]:duration-400 data-[entering]:ease-[cubic-bezier(0.16,1,0.3,1)] data-[exiting]:duration-200 data-[exiting]:ease-[cubic-bezier(0.7,0,0.84,0)]"
      >
        <Modal.Container className="data-[entering]:animate-in data-[entering]:fade-in-0 data-[entering]:zoom-in-95 data-[entering]:duration-400 data-[entering]:ease-[cubic-bezier(0.16,1,0.3,1)] data-[exiting]:animate-out data-[exiting]:fade-out-0 data-[exiting]:zoom-out-95 data-[exiting]:duration-200 data-[exiting]:ease-[cubic-bezier(0.7,0,0.84,0)]">
          <Modal.Dialog className="sm:max-w-[400px]">
            <Modal.CloseTrigger />

            <Modal.Header>
              <Modal.Icon className="bg-danger/10 text-danger">
                <WarningIcon className="size-5" />
              </Modal.Icon>
              <Modal.Heading>Excluir cliente?</Modal.Heading>
            </Modal.Header>

            <Modal.Body>
              <p className="mt-1 text-sm text-gray-100/70">
                <span className="font-medium">{clientName}</span> será removido
                da lista. Essa ação não pode ser desfeita.
              </p>
            </Modal.Body>

            <Modal.Footer>
              <Button
                className="w-full"
                type="button"
                variant="danger"
                onClick={() => {
                  onConfirm?.();
                  onClose();
                }}
              >
                Excluir
              </Button>
              <Button type="button" variant="primary" onClick={onClose}>
                Manter
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
