"use client";

import { useCallback, useState, type CSSProperties } from "react";

/**
 * O fundo que desliza no hover — o efeito do menu, para qualquer botão.
 *
 * Quem se move é **só o fundo**: uma camada atrás do rótulo que entra por
 * `animate__slideInLeft` no hover (ou foco) e sai por `animate__slideOutRight`
 * ao tirar o mouse. O texto fica parado — antes era ele que deslizava, o que
 * embaralhava a leitura.
 *
 * A camada só existe enquanto há interação (ou enquanto o item está ativo);
 * fora disso ela é desmontada, senão a animação de entrada dispararia sozinha
 * no primeiro render. No ativo o fundo é permanente: não anima, só está lá.
 *
 * Quem usa põe `relative overflow-hidden` no botão (o fundo não vaza da
 * pílula ao deslizar), desenha a camada com `layer` quando `showLayer` e o
 * rótulo num `relative`, acima dela.
 */

type Phase = "idle" | "entering" | "leaving";

const DURATION_MS = 300;

export function useSlideHover(isActive: boolean) {
  const [phase, setPhase] = useState<Phase>("idle");

  const enter = useCallback(() => setPhase("entering"), []);
  const leave = useCallback(
    () => setPhase((current) => (current === "entering" ? "leaving" : current)),
    [],
  );

  /** Fim da saída: desmonta a camada. O fim da entrada não muda nada. */
  const onAnimationEnd = useCallback(() => {
    setPhase((current) => (current === "leaving" ? "idle" : current));
  }, []);

  const animation = isActive
    ? ""
    : phase === "entering"
      ? "animate__animated animate__slideInLeft"
      : phase === "leaving"
        ? "animate__animated animate__slideOutRight"
        : "";

  return {
    /** Para o botão/link: hover e foco disparam o mesmo efeito. */
    handlers: { onMouseEnter: enter, onMouseLeave: leave, onFocus: enter, onBlur: leave },
    showLayer: isActive || phase !== "idle",
    /** Para a camada de fundo (`absolute inset-0` + a cor de quem usa). */
    layer: {
      "aria-hidden": true,
      onAnimationEnd,
      style: { "--animate-duration": `${DURATION_MS}ms` } as CSSProperties,
      className: `absolute inset-0 ${animation}`,
    },
  };
}
