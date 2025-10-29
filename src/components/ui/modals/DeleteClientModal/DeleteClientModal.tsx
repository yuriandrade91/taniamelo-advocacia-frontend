import React from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Button } from "@heroui/button";

interface DeleteClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  onConfirm?: () => void | undefined;
}

export default function DeleteClientModal({
  isOpen,
  onClose,
  clientName,
  onConfirm,
}: DeleteClientModalProps) {
  return (
    <Modal
      backdrop="blur"
      isOpen={isOpen}
      onClose={onClose}
      hideCloseButton={true}
    >
      <ModalContent>
        {() => (
          <>
            <ModalHeader>
              <span className="relative font-semibold">
                Tem certeza que deseja excluir este cliente?
              </span>
              <span className="absolute top-11 border-b-3 border-solid border-secondary w-20" />
            </ModalHeader>
            <ModalBody>
              <p className="text-gray-600 text-base font-light">
                Ao excluir o cliente{" "}
                <span className="font-medium">{clientName}</span>, você não
                poderá mais vê-lo(a) nesta lista.
              </p>
            </ModalBody>
            <ModalFooter>
              <Button
                variant="flat"
                color="danger"
                onPress={onClose}
                className="font-medium"
              >
                Não
              </Button>
              <Button
                variant="flat"
                color="success"
                onPress={() => {
                  if (onConfirm) onConfirm();
                  onClose();
                }}
                className="font-medium"
              >
                Sim
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
