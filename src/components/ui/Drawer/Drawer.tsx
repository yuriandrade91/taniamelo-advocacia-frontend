"use client";

import React from "react";
import { Button, Drawer as HeroDrawer } from "@heroui/react";

/**
 * Drawer da aplicação — **para ação rápida**.
 *
 * ## Quando usar este, e quando usar `FormModal`
 *
 * A convenção da casa: drawer é para o aparte — uma ação curta em que a página
 * atrás ainda importa e o usuário volta para ela em seguida. Formulário que
 * faz parte de uma página vai em `ui/modals/FormModal`, que tem a mesma API
 * (menos `placement`), então a troca é o import e o nome do componente.
 *
 * O motivo é largura e foco: o painel lateral é estreito e empilha tudo numa
 * coluna, o que espreme campos que deveriam ficar lado a lado; e deixar a
 * página visível atrás compete com um formulário longo em vez de ajudá-lo.
 *
 * O uso vivo é o `AppointmentsCard` da home: agendar a partir de um card de
 * resumo é o aparte típico — a lista do dia continua visível atrás, e é dela
 * que a pessoa tira o horário. O mesmo formulário, na página `/agenda`, é
 * modal: lá ele **é** a tarefa, e não há lista atrás que ajude.
 *
 * Envolve o compound do HeroUI v3 (`Root > Backdrop > Content > Dialog >
 * Header/Body/Footer`) numa API de uma linha só, porque todos os nossos usos
 * têm a mesma forma: título, conteúdo rolável e um par cancelar/confirmar.
 *
 * Duas decisões que o wrapper toma por você:
 *
 * - **Fechamento protegido.** Com `confirmClose`, o Drawer não fecha sozinho:
 *   ele avisa via `onRequestClose` e quem chama decide (normalmente abrindo um
 *   modal "descartar alterações?"). Como o componente é controlado por
 *   `isOpen`, simplesmente não mudar o estado já mantém o painel aberto.
 * - **O botão de confirmar é `type="submit"`** e o corpo é um `<form>`, então
 *   Enter dentro de qualquer campo envia — comportamento que se perde quando o
 *   rodapé fica fora do formulário.
 */

export type DrawerProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;

  title: string;
  /** Texto de apoio abaixo do título. */
  description?: string;
  children: React.ReactNode;

  /** Lado de onde o painel entra. */
  placement?: "left" | "right" | "top" | "bottom";

  confirmLabel?: string;
  cancelLabel?: string;
  /** Recebido já validado — o wrapper não valida nada por conta própria. */
  onConfirm?: () => void;
  /** Desabilita o botão de confirmar (ex.: formulário inválido). */
  isConfirmDisabled?: boolean;
  /** Mostra estado de carregamento e bloqueia o envio duplicado. */
  isSubmitting?: boolean;

  /**
   * Quando `true`, tentar fechar dispara `onRequestClose` em vez de fechar.
   * Use para formulários com alterações não salvas.
   */
  confirmClose?: boolean;
  onRequestClose?: () => void;

  /** Esconde o rodapé — útil quando o drawer é só de leitura. */
  hideFooter?: boolean;
  className?: string;
};

export default function Drawer({
  isOpen,
  onOpenChange,
  title,
  description,
  children,
  placement = "right",
  confirmLabel = "Salvar",
  cancelLabel = "Cancelar",
  onConfirm,
  isConfirmDisabled = false,
  isSubmitting = false,
  confirmClose = false,
  onRequestClose,
  hideFooter = false,
  className = "",
}: DrawerProps) {
  /**
   * Intercepta o fechamento (backdrop, Esc, botão de fechar). Abrir passa
   * direto; fechar com `confirmClose` só notifica e deixa o painel aberto.
   */
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
    <HeroDrawer isOpen={isOpen} onOpenChange={handleOpenChange}>
      <HeroDrawer.Backdrop>
        <HeroDrawer.Content placement={placement} className={className}>
          <HeroDrawer.Dialog>
            <form onSubmit={handleSubmit} className="flex h-full flex-col">
              <HeroDrawer.Header>
                <HeroDrawer.Heading>{title}</HeroDrawer.Heading>
                {description && (
                  <p className="mt-1 text-sm text-gray-100/70">{description}</p>
                )}
              </HeroDrawer.Header>

              <HeroDrawer.Body className="flex-1 overflow-y-auto">
                {children}
              </HeroDrawer.Body>

              {!hideFooter && (
                <HeroDrawer.Footer className="flex justify-end gap-2">
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
                </HeroDrawer.Footer>
              )}
            </form>
          </HeroDrawer.Dialog>
        </HeroDrawer.Content>
      </HeroDrawer.Backdrop>
    </HeroDrawer>
  );
}
