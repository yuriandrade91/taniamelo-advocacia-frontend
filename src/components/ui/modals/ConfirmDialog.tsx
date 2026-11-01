"use client";

import type { ReactNode } from "react";
import { Modal, WarningIcon } from "@heroui/react";
import { ActionButton, ActionGroup } from "@/components/ui/actions/ActionGroup";
import ModalShell from "./ModalShell";

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
  /** O que a confirmação pede para escolher, abaixo da descrição. */
  children?: ReactNode;
  /** Enquanto a escolha em `children` não está completa. */
  isConfirmDisabled?: boolean;
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
  children,
  isConfirmDisabled = false,
}: Readonly<ConfirmDialogProps>) {
  const iconTone =
    tone === "danger"
      ? "bg-danger/10 text-danger"
      : "bg-primary/10 text-primary";

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      className={children ? "sm:max-w-[460px]" : "sm:max-w-[420px]"}
      heading={heading}
      icon={icon ?? <WarningIcon className="size-5" />}
      iconClassName={iconTone}
    >
      {(Boolean(description) || Boolean(children)) && (
        <Modal.Body>
          {description && (
            <div className="mt-1 text-sm text-gray-100/70">{description}</div>
          )}
          {children}
        </Modal.Body>
      )}

      <Modal.Footer>
        {/* O rodapé das modais (`FormModal`): sair à esquerda, a decisão ocupando o resto. */}
        <ActionGroup shape="pill" className="w-full">
          <ActionButton tone="neutral" onClick={onClose}>
            {cancelLabel}
          </ActionButton>
          <ActionButton
            tone={tone}
            grow
            disabled={isConfirmDisabled}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </ActionButton>
        </ActionGroup>
      </Modal.Footer>
    </ModalShell>
  );
}
