"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Fecha um painel flutuante com um clique fora ou com Esc.
 *
 * ## Por que existe
 *
 * É o que todo menu não modal precisa e nenhum componente de biblioteca
 * entrega quando o painel é desenhado à mão: o menu do perfil, a central de
 * notificações, o cartão do acordo e o trilho de etapas tinham cada um a sua
 * cópia dos mesmos dois ouvintes, do mesmo `removeEventListener` no retorno e
 * do mesmo `if (event.key === "Escape")`. Cinco cópias de um comportamento é
 * onde uma delas esquece de soltar o ouvinte.
 *
 * ## O que é "dentro"
 *
 * `inside` são as áreas que **não** fecham: o painel e, quando houver, o
 * gatilho que o abriu. O gatilho entra na lista porque clicar nele com o
 * painel aberto é "fechar pelo botão", e fechar aqui também faria o clique
 * valer duas vezes — fecha e reabre no mesmo toque. `onPointerInside` é para
 * quem precisa saber desse clique de dentro (o cartão que se prende ao ser
 * clicado).
 *
 * `pointerdown`, e não `mousedown`: cobre toque e caneta, que num tablet
 * deixavam o painel aberto atrás do que foi tocado.
 *
 * ## Fechamento sempre atual
 *
 * O ouvinte é montado uma vez por abertura, mas chama o `onDismiss` do último
 * render — um fechamento que depende de estado (animação de saída, voltar
 * para o modo de leitura) não fica preso ao valor que existia quando o painel
 * abriu. É o que, nas cópias, obrigava cada componente a guardar a função num
 * `ref` próprio.
 */
export function useDismiss(
  isOpen: boolean,
  onDismiss: () => void,
  inside: RefObject<HTMLElement | null> | readonly RefObject<HTMLElement | null>[],
  onPointerInside?: (target: Node) => void,
): void {
  const latest = useRef({ onDismiss, inside, onPointerInside });
  useEffect(() => {
    latest.current = { onDismiss, inside, onPointerInside };
  });

  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const { inside, onPointerInside, onDismiss } = latest.current;
      const target = event.target;
      if (!(target instanceof Node)) return;

      const areas = Array.isArray(inside) ? inside : [inside];
      if (areas.some((area) => area.current?.contains(target))) {
        onPointerInside?.(target);
        return;
      }
      onDismiss();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") latest.current.onDismiss();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);
}
