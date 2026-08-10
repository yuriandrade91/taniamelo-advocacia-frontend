"use client";

import React from "react";
import { Modal, Button } from "@heroui/react";

interface DeleteClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  onConfirm?: () => void | undefined;
}

/**
 * Confirmação de exclusão de cliente — HeroUI v3 (compound components).
 *
 * Anatomia do v3:
 *   Modal > Modal.Backdrop > Modal.Container > Modal.Dialog
 *           > Modal.Header (Modal.Heading) / Modal.Body / Modal.Footer
 *
 * Mudanças em relação ao v2:
 * - `backdrop="blur"`      -> `variant="blur"` no `Modal.Backdrop`
 * - `isOpen`/`onOpenChange` -> movidos para o `Modal.Backdrop`
 * - `hideCloseButton`       -> basta omitir o `Modal.CloseTrigger`
 * - `color`                 -> `variant` no `Button`
 */
export default function DeleteClientModal({
  isOpen,
  onClose,
  clientName,
  onConfirm,
}: DeleteClientModalProps) {
  return (
    <Modal>
      <Modal.Backdrop
        variant="blur"
        isOpen={isOpen}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <Modal.Container size="md">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading className="relative font-semibold">
                Tem certeza que deseja excluir este cliente?
              </Modal.Heading>
              <span className="absolute top-11 border-b-[3px] border-solid border-secondary w-20" />
            </Modal.Header>

            <Modal.Body>
              <p className="text-gray-100 text-base font-light">
                Ao excluir o cliente{" "}
                <span className="font-medium">{clientName}</span>, você não
                poderá mais vê-lo(a) nesta lista.
              </p>
            </Modal.Body>

            <Modal.Footer>
              <Button
                variant="secondary"
                onPress={onClose}
                className="font-medium text-danger"
              >
                Não
              </Button>
              <Button
                variant="primary"
                onPress={() => {
                  onConfirm?.();
                  onClose();
                }}
                className="font-medium"
              >
                Sim
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
