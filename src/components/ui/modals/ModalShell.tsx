"use client";

import type { ComponentProps, ReactNode } from "react";
import { Modal } from "@heroui/react";

/**
 * A moldura de toda modal da casa: `Modal` → `Backdrop` → `Container` →
 * `Dialog`, com as mesmas curvas de entrada e saída, o "fechar" no canto e,
 * quando há título, o cabeçalho com ícone.
 *
 * Eram doze cópias da mesma árvore, cada uma com a sua lista de classes de
 * animação — e já tinham começado a divergir (umas com a curva de saída,
 * outras sem). Aqui a decisão mora num lugar só.
 *
 * - `isOpen`/`onOpenChange` no `Modal` raiz, não no `Backdrop`: o controle é
 *   do componente raiz.
 * - `isDismissable={false}` segura a modal aberta enquanto algo é gravado —
 *   fechar no meio deixaria a pessoa sem saber se gravou.
 * - Sem `heading`, o cabeçalho é de quem chama (título com enfeite, ações).
 */

/** Entrada com a curva que desacelera; saída mais curta, que acelera. */
const BACKDROP_MOTION =
  "data-[entering]:duration-400 data-[entering]:ease-[cubic-bezier(0.16,1,0.3,1)] data-[exiting]:duration-200 data-[exiting]:ease-[cubic-bezier(0.7,0,0.84,0)]";

const CONTAINER_MOTION =
  "data-[entering]:animate-in data-[entering]:fade-in-0 data-[entering]:zoom-in-95 data-[entering]:duration-400 data-[entering]:ease-[cubic-bezier(0.16,1,0.3,1)] data-[exiting]:animate-out data-[exiting]:fade-out-0 data-[exiting]:zoom-out-95 data-[exiting]:duration-200 data-[exiting]:ease-[cubic-bezier(0.7,0,0.84,0)]";

type ContainerProps = ComponentProps<typeof Modal.Container>;

export type ModalShellProps = {
  isOpen: boolean;
  onClose: () => void;
  /** `false` enquanto grava: Esc, clique fora e o "x" não fecham. */
  isDismissable?: boolean;
  backdrop?: "opaque" | "blur";
  size?: ContainerProps["size"];
  scroll?: ContainerProps["scroll"];
  /** Largura e fundo do `Dialog` (`sm:max-w-[420px]`). */
  className?: string;
  heading?: ReactNode;
  headingClassName?: string;
  /** Ícone à esquerda do título; `iconClassName` dá o tom (`bg-danger/10 text-danger`). */
  icon?: ReactNode;
  iconClassName?: string;
  children: ReactNode;
};

export default function ModalShell({
  isOpen,
  onClose,
  isDismissable = true,
  backdrop = "opaque",
  size,
  scroll,
  className = "",
  heading,
  headingClassName,
  icon,
  iconClassName = "",
  children,
}: ModalShellProps) {
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => !open && isDismissable && onClose()}
    >
      <Modal.Backdrop variant={backdrop} className={BACKDROP_MOTION}>
        <Modal.Container size={size} scroll={scroll} className={CONTAINER_MOTION}>
          <Modal.Dialog className={className}>
            {isDismissable && <Modal.CloseTrigger />}

            {heading !== undefined && (
              <Modal.Header>
                {icon && <Modal.Icon className={iconClassName}>{icon}</Modal.Icon>}
                <Modal.Heading className={headingClassName}>{heading}</Modal.Heading>
              </Modal.Header>
            )}

            {children}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
