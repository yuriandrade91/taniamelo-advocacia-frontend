"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Mantém um elemento montado durante a animação de saída.
 *
 * O problema que resolve: o React desmonta assim que a condição vira `false`,
 * então uma classe de saída como `animate__slideOutRight` nunca chega a rodar —
 * o nó já saiu do DOM no primeiro frame. Aqui o desmonte fica adiado até o
 * `animationend`, que é o sinal real de que a animação terminou (mais confiável
 * que um `setTimeout` casado na mão com a duração do CSS).
 *
 * Devolve `shouldRender` (renderize enquanto for `true`), a `className` da
 * animação correspondente ao estado atual e o `ref` a ser preso no elemento
 * animado.
 *
 * ```tsx
 * const menu = useAnimatedPresence(isOpen, {
 *   enter: "animate__slideInLeft",
 *   exit: "animate__slideOutRight",
 * });
 *
 * return menu.shouldRender ? (
 *   <div ref={menu.ref} className={menu.className}>…</div>
 * ) : null;
 * ```
 *
 * Respeita `prefers-reduced-motion`: quem prefere menos movimento não recebe
 * classe de animação nenhuma, e o desmonte é imediato.
 */

export type AnimatedPresenceOptions = {
  /** Classe do animate.css na entrada (ex.: `animate__slideInLeft`). */
  enter: string;
  /** Classe do animate.css na saída (ex.: `animate__slideOutRight`). */
  exit: string;
  /** Duração da animação. O animate.css lê de `--animate-duration`. */
  durationMs?: number;
};

export type AnimatedPresence = {
  shouldRender: boolean;
  className: string;
  style: React.CSSProperties;
  ref: React.RefObject<HTMLDivElement | null>;
  /**
   * `true` durante a animação de saída. Exposto para quem precisa sincronizar
   * um segundo elemento com a mesma fase — por exemplo, um contêiner externo
   * que carrega a sombra e precisa sumir junto, em vez de ficar na tela até o
   * desmonte.
   */
  isLeaving: boolean;
};

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function useAnimatedPresence(
  isOpen: boolean,
  { enter, exit, durationMs = 400 }: AnimatedPresenceOptions,
): AnimatedPresence {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isLeaving, setIsLeaving] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsLeaving(false);
      return;
    }

    // Já estava fechado: nada a animar (evita disparar a saída na montagem).
    if (!shouldRender) return;

    if (prefersReducedMotion()) {
      setShouldRender(false);
      return;
    }

    setIsLeaving(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isLeaving) return;

    const node = ref.current;
    // Sem nó (ou sem suporte a animação), desmonta direto em vez de travar
    // o elemento na tela para sempre esperando um evento que não vem.
    if (!node) {
      setShouldRender(false);
      return;
    }

    const finish = () => {
      setShouldRender(false);
      setIsLeaving(false);
    };

    node.addEventListener("animationend", finish, { once: true });

    // Rede de segurança: se o `animationend` não disparar (aba em background,
    // animação sobrescrita), desmonta um pouco depois da duração esperada.
    const fallback = setTimeout(finish, durationMs + 100);

    return () => {
      node.removeEventListener("animationend", finish);
      clearTimeout(fallback);
    };
  }, [isLeaving, durationMs]);

  const animationClass = prefersReducedMotion()
    ? ""
    : `animate__animated ${isLeaving ? exit : enter}`;

  return {
    shouldRender,
    className: animationClass,
    style: { ["--animate-duration" as string]: `${durationMs}ms` },
    ref,
    isLeaving,
  };
}
