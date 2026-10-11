"use client";

import { useEffect, useRef, useState } from "react";
import { useDismiss } from "./useDismiss";

/**
 * O cartão que **o hover mostra e o clique prende** — o do cliente potencial,
 * o trilho de etapas, as parcelas do acordo. Eram três cópias dos mesmos
 * temporizadores, refs e regras, e já tinham começado a divergir nos tempos.
 *
 * - Passar o mouse abre depois de um instante (sem isso, cruzar a lista abre
 *   um cartão por linha); sair fecha com um atraso curto, que cobre o vão
 *   entre o gatilho e o cartão, onde fica a seta.
 * - Clicar prende: o cartão sobrevive ao mouse saindo e só fecha com Esc,
 *   clique fora ou quem chama (`close`).
 * - O cartão é **não modal** (`isNonModal`): um popover modal cobre a página
 *   com uma camada invisível, o cursor parado no gatilho passa a estar "fora"
 *   e o cartão pisca. Sem a camada, clique fora e Esc vêm do `useDismiss`.
 * - O popover não modal do React Aria também pede para fechar quando a página
 *   rola ou o foco sai dele. Isso vale para o cartão solto; o preso (ou com
 *   uma escolha em andamento) fica — rolar até o botão do fim do cartão não
 *   pode jogar fora a etapa que acabou de ser escolhida. Por isso o Esc é só
 *   do `useDismiss` (`isKeyboardDismissDisabled`): o do React Aria chegaria
 *   aqui como mais um pedido do popover, sem dizer que foi a tecla.
 *
 * Uso: `popoverProps` no `Popover`, `triggerProps` no `Popover.Trigger`,
 * `contentProps` no `Popover.Content`.
 */

const OPEN_DELAY_MS = 300;
const CLOSE_DELAY_MS = 200;

export function useHoverCard({
  keepOpen = false,
  canOpen = true,
  onClose,
}: {
  /** Mantém aberto além do hover e do clique (uma escolha em andamento). */
  keepOpen?: boolean;
  /** `false` segura a abertura pelo hover (um diálogo por cima). */
  canOpen?: boolean;
  /** Avisado quando o cartão fecha de vez — para limpar o que ele guardava. */
  onClose?: () => void;
} = {}) {
  const [isPinned, setIsPinned] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const isOpen = isPinned || isHovering || keepOpen;

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => clearTimer, []);

  const triggerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  /** O fechamento pedido pelo popover veio de um clique no próprio gatilho? */
  const triggerPressed = useRef(false);

  /** Recolhe sem avisar — para dar lugar a um diálogo, mantendo a escolha. */
  const hide = () => {
    clearTimer();
    setIsPinned(false);
    setIsHovering(false);
  };
  const close = () => {
    hide();
    onClose?.();
  };

  useDismiss(isOpen, close, [triggerRef, cardRef], (target) => {
    // Clique no gatilho com o cartão aberto (pelo mouse): prende. Se o popover
    // ainda pedir para fechar logo em seguida, o `onOpenChange` lê esta marca
    // e não fecha.
    if (!triggerRef.current?.contains(target)) return;
    triggerPressed.current = true;
    setIsPinned(true);
  });

  const hoverIn = () => {
    clearTimer();
    if (isOpen || !canOpen) return;
    timer.current = setTimeout(() => setIsHovering(true), OPEN_DELAY_MS);
  };
  const hoverOut = () => {
    clearTimer();
    timer.current = setTimeout(() => setIsHovering(false), CLOSE_DELAY_MS);
  };

  return {
    isOpen,
    isPinned,
    close,
    hide,
    popoverProps: {
      isOpen,
      onOpenChange: (open: boolean) => {
        // Clique no gatilho com o cartão aberto pelo mouse prende em vez de
        // fechar; no cartão já preso, fecha ("fechar pelo botão").
        const pressedTrigger = triggerPressed.current;
        triggerPressed.current = false;
        if (open || (pressedTrigger && !isPinned)) setIsPinned(true);
        // Os outros pedidos do popover (a página rolou, o foco saiu) só
        // fecham o cartão solto. Esc e clique fora vêm do `useDismiss`.
        else if (pressedTrigger || !(isPinned || keepOpen)) close();
      },
    },
    triggerProps: { ref: triggerRef, onMouseEnter: hoverIn, onMouseLeave: hoverOut },
    contentProps: {
      ref: cardRef,
      isNonModal: true,
      isKeyboardDismissDisabled: true,
      onMouseEnter: clearTimer,
      onMouseLeave: hoverOut,
    },
  };
}
