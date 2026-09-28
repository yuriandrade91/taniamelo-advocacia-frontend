"use client";

import React from "react";
import { Button, Modal } from "@heroui/react";

/**
 * Modal de formulário.
 *
 * ## Onde entra, e por que não é o Drawer
 *
 * A convenção da casa: **drawer é para ação rápida**; formulário que faz parte
 * de uma página vai em modal. A diferença não é estética. O drawer entra pela
 * lateral e deixa a página visível atrás — bom quando a ação é um aparte
 * ("marcar como pago", "ver detalhe") e o contexto ao lado ainda importa. Um
 * formulário de oito campos não é um aparte: ele pede foco, e o painel lateral
 * dá largura estreita e uma coluna só, o que espreme campo que deveria ficar
 * lado a lado.
 *
 * ## API idêntica à do `Drawer`
 *
 * De propósito, menos `placement` (modal não tem lado). Trocar um pelo outro é
 * mudar o import e o nome do componente — nada de reescrever o corpo. Isso é o
 * que torna a convenção aplicável: se converter custasse uma reescrita, a regra
 * viraria letra morta no primeiro prazo apertado.
 *
 * As duas decisões herdadas do `Drawer`, que continuam certas:
 *
 * - **Fechamento protegido.** Com `confirmClose`, o modal não fecha sozinho:
 *   avisa por `onRequestClose` e quem chama decide (normalmente abrindo um
 *   "descartar alterações?").
 * - **O corpo é um `<form>` e o botão de confirmar é `type="submit"`**, então
 *   Enter dentro de qualquer campo envia.
 */

export type FormModalProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;

  title: string;
  /** Texto de apoio abaixo do título. */
  description?: string;
  children: React.ReactNode;

  /**
   * Largura. `md` serve a formulário de uma coluna; `lg` a formulário com
   * campos lado a lado. Não há `full`: modal que ocupa a tela toda deveria ser
   * uma página.
   */
  size?: "sm" | "md" | "lg";

  confirmLabel?: string;
  cancelLabel?: string;
  /** Recebido já validado — o wrapper não valida nada por conta própria. */
  onConfirm?: () => void;
  isConfirmDisabled?: boolean;
  isSubmitting?: boolean;

  /** Com `true`, tentar fechar dispara `onRequestClose` em vez de fechar. */
  confirmClose?: boolean;
  onRequestClose?: () => void;

  hideFooter?: boolean;
  className?: string;
};

const SIZES: Record<NonNullable<FormModalProps["size"]>, string> = {
  sm: "sm:max-w-[420px]",
  md: "sm:max-w-[560px]",
  lg: "sm:max-w-[760px]",
};

export default function FormModal({
  isOpen,
  onOpenChange,
  title,
  description,
  children,
  size = "md",
  confirmLabel = "Salvar",
  cancelLabel = "Cancelar",
  onConfirm,
  isConfirmDisabled = false,
  isSubmitting = false,
  confirmClose = false,
  onRequestClose,
  hideFooter = false,
  className = "",
}: FormModalProps) {
  const handleOpenChange = (open: boolean) => {
    if (open) {
      onOpenChange(true);
      return;
    }
    if (confirmClose) {
      onRequestClose?.();
      return;
    }
    onOpenChange(false);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isConfirmDisabled || isSubmitting) return;
    onConfirm?.();
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={handleOpenChange}>
      {/* Mesmas curvas do `ConfirmDialog` — entrada longa e desacelerando,
          saída curta. Ter dois modais com tempos diferentes é o tipo de
          diferença que ninguém nomeia mas todo mundo sente. */}
      <Modal.Backdrop
        variant="opaque"
        className="data-[entering]:duration-400 data-[entering]:ease-[cubic-bezier(0.16,1,0.3,1)] data-[exiting]:duration-200 data-[exiting]:ease-[cubic-bezier(0.7,0,0.84,0)]"
      >
        <Modal.Container className="data-[entering]:animate-in data-[entering]:fade-in-0 data-[entering]:zoom-in-95 data-[entering]:duration-400 data-[entering]:ease-[cubic-bezier(0.16,1,0.3,1)] data-[exiting]:animate-out data-[exiting]:fade-out-0 data-[exiting]:zoom-out-95 data-[exiting]:duration-200 data-[exiting]:ease-[cubic-bezier(0.7,0,0.84,0)]">
          <Modal.Dialog className={`${SIZES[size]} ${className}`}>
            <Modal.CloseTrigger />

            <form onSubmit={handleSubmit} className="flex min-h-0 flex-col">
              <Modal.Header>
                <Modal.Heading>{title}</Modal.Heading>
                {description && (
                  <p className="mt-1 text-sm text-gray-100/70">{description}</p>
                )}
              </Modal.Header>

              {/*
                O teto de altura é o que o drawer não precisava ter: ele ocupa a
                tela inteira por natureza, o modal não. Sem `max-h` + `overflow`,
                um formulário longo empurra o rodapé para fora da janela e o
                botão de salvar fica inalcançável em tela de notebook.
              */}
              <Modal.Body className="max-h-[65vh] overflow-y-auto">
                {children}
              </Modal.Body>

              {!hideFooter && (
                <Modal.Footer className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onPress={() => handleOpenChange(false)}
                    isDisabled={isSubmitting}
                  >
                    {cancelLabel}
                  </Button>
                  <Button
                    type="submit"
                    isDisabled={isConfirmDisabled || isSubmitting}
                  >
                    {isSubmitting ? "Salvando..." : confirmLabel}
                  </Button>
                </Modal.Footer>
              )}
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
