"use client";

import type { ReactNode } from "react";
import { Button, Modal, WarningIcon } from "@heroui/react";

/**
 * Confirmação genérica.
 *
 * Extraído do `DeleteClientModal`, que era a única confirmação da casa e
 * estava amarrada a excluir cliente. A troca de endereço principal é a segunda
 * — e copiar o modal inteiro para mudar dois textos é como o projeto acabou
 * com dois formulários de cliente.
 *
 * Mantém as decisões que já estavam certas ali: `isOpen`/`onOpenChange` no
 * `Modal` raiz, ícone antes do texto, e rótulos que dizem **o que acontece**
 * ("Tornar principal" / "Manter") em vez de "Sim"/"Não", que só fazem sentido
 * relidos junto com o título.
 *
 * `tone` separa o que é destrutivo do que é só uma decisão: vermelho para
 * ações sem volta, azul da marca para escolhas reversíveis. Pintar tudo de
 * vermelho ensina o usuário a ignorar vermelho.
 */

export type ConfirmDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  heading: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` para ação irreversível; `primary` para escolha comum. */
  tone?: "danger" | "primary";
  icon?: ReactNode;
};

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  heading,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  tone = "primary",
  icon,
}: ConfirmDialogProps) {
  const iconTone =
    tone === "danger"
      ? "bg-danger/10 text-danger"
      : "bg-primary/10 text-primary";

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop
        variant="opaque"
        className="data-[entering]:duration-400 data-[entering]:ease-[cubic-bezier(0.16,1,0.3,1)] data-[exiting]:duration-200 data-[exiting]:ease-[cubic-bezier(0.7,0,0.84,0)]"
      >
        <Modal.Container className="data-[entering]:animate-in data-[entering]:fade-in-0 data-[entering]:zoom-in-95 data-[entering]:duration-400 data-[entering]:ease-[cubic-bezier(0.16,1,0.3,1)] data-[exiting]:animate-out data-[exiting]:fade-out-0 data-[exiting]:zoom-out-95 data-[exiting]:duration-200 data-[exiting]:ease-[cubic-bezier(0.7,0,0.84,0)]">
          <Modal.Dialog className="sm:max-w-[420px]">
            <Modal.CloseTrigger />

            <Modal.Header>
              <Modal.Icon className={iconTone}>
                {icon ?? <WarningIcon className="size-5" />}
              </Modal.Icon>
              <Modal.Heading>{heading}</Modal.Heading>
            </Modal.Header>

            {description && (
              <Modal.Body>
                <div className="mt-1 text-sm text-gray-100/70">
                  {description}
                </div>
              </Modal.Body>
            )}

            <Modal.Footer>
              <Button
                className="w-full"
                type="button"
                variant={tone}
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
              >
                {confirmLabel}
              </Button>
              <Button type="button" variant="secondary" onClick={onClose}>
                {cancelLabel}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
