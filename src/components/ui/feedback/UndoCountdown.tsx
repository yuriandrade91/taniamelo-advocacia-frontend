"use client";

import { useEffect, useState } from "react";
import { ProgressCircle } from "@heroui/react";

/**
 * Contagem regressiva da janela de desfazer, dentro do botão do toast.
 *
 * É **só apresentação**. Quem decide efetivar a ação é o `setTimeout` do
 * `usePendingAction`; se este componente travar, não renderizar ou congelar
 * numa aba em segundo plano, a ação acontece na hora certa do mesmo jeito.
 * Separar as duas coisas evita o pior dos mundos: uma barrinha bonita que
 * decide se a requisição sai.
 *
 * O `deadline` é um instante absoluto (`Date.now() + janela`), não uma
 * duração: se o componente remontar no meio, retoma de onde estava em vez de
 * reiniciar a contagem.
 */

/**
 * Intervalo do tick, casado com a transição do `ProgressCircle`.
 *
 * O CSS do HeroUI anima `stroke-dashoffset` em 300ms
 * (`@heroui/styles/.../progress-circle.css`). Com tick mais curto que isso,
 * cada valor novo interrompe a animação anterior no meio e o círculo fica
 * permanentemente atrasado em relação ao número — dá para ver o anel ainda
 * cheio quando a ação já foi. Casando tick e transição, cada passo termina
 * exatamente quando o próximo começa: movimento contínuo e sem defasagem.
 */
const TICK_MS = 300;

export type UndoCountdownProps = {
  /** Instante (epoch ms) em que a janela expira. */
  deadline: number;
  /** Tamanho total da janela, para calcular a fração restante. */
  durationMs: number;
  /** Rótulo do botão. */
  label?: string;
};

const remainingAt = (deadline: number) => Math.max(0, deadline - Date.now());

export function UndoCountdown({
  deadline,
  durationMs,
  label = "Desfazer",
}: UndoCountdownProps) {
  const [remaining, setRemaining] = useState(() => remainingAt(deadline));

  useEffect(() => {
    // Reavalia na montagem: entre o `schedule` e o primeiro paint pode ter
    // passado tempo suficiente para o anel nascer errado.
    setRemaining(remainingAt(deadline));

    const id = setInterval(() => {
      const next = remainingAt(deadline);
      // No último passo vamos direto a zero: a transição de 300ms começa aqui
      // e termina no instante do deadline, em vez de 300ms depois dele.
      setRemaining(next <= TICK_MS ? 0 : next);
      if (next === 0) clearInterval(id);
    }, TICK_MS);

    return () => clearInterval(id);
  }, [deadline]);

  const percent = durationMs > 0 ? (remaining / durationMs) * 100 : 0;
  const seconds = Math.ceil(remaining / 1000);

  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap">
      {/*
        Todo o visual é aria-hidden: um contador que muda várias vezes por
        segundo viraria ruído em leitor de tela. O nome acessível do botão vem
        do `aria-label` que o `usePendingAction` passa — estático e informativo.

        `size="sm"` e não classes utilitárias: a dimensão do HeroUI mora no
        `.progress-circle__track` (size-5 no sm, size-7 no padrão), então
        `h-4 w-4` na raiz não teria efeito nenhum — o ajuste fino para 16px
        (e a cor do anel) está no `globals.css`, junto do resto dos overrides
        de toast.
      */}
      <span aria-hidden="true" className="flex items-center">
        <ProgressCircle
          aria-label="Tempo restante para desfazer"
          size="sm"
          value={percent}
          minValue={0}
          maxValue={100}
        />
      </span>
      <span>{label}</span>
      <span aria-hidden="true" className="tabular-nums opacity-70">
        {seconds}s
      </span>
    </span>
  );
}

export default UndoCountdown;
