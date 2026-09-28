"use client";

import { ProgressCircle } from "@heroui/react";

/**
 * Anel de preenchimento do cabeçalho, no formato do protótipo: aro verde sobre
 * o azul da marca, com a porcentagem escrita no centro.
 *
 * Montado com as **partes compostas** do `ProgressCircle`
 * (`Root`/`Track`/`TrackCircle`/`FillCircle`) e estilizado com Tailwind — a
 * abordagem "Tailwind CSS" da documentação. O `ProgressCircle` de uso simples
 * não serve aqui por dois motivos: o tamanho dele é fechado em três variantes
 * (`sm`/`md`/`lg`, 20/28/36px, todos pequenos demais) e ele não tem slot para
 * rótulo interno.
 *
 * ## Por que as classes Tailwind funcionam aqui
 *
 * O CSS do HeroUI declara `.progress-circle .progress-circle__track { size-7 }`
 * — dois seletores de classe. Uma utilitária como `size-[72px]` tem
 * especificidade menor e, pela regra normal, perderia.
 *
 * Ela ganha porque o `@heroui/styles` abre com
 * `@layer theme, base, components, utilities` e registra o CSS dos componentes
 * na camada `components`. As utilitárias do Tailwind vivem em `utilities`, que
 * é declarada **depois** — e entre camadas quem vem depois vence, independente
 * de especificidade. Sem essa ordem de camadas, o jeito certo seria mexer nas
 * variáveis `--progress-circle-*`, não brigar por seletor.
 *
 * O `strokeWidth` é prop de verdade: os primitivos espalham `...props` depois
 * do valor padrão (4), então o que passamos prevalece.
 */

export type ProgressRingProps = {
  /** 0 a 100. */
  value: number;
  /** Diâmetro em pixels. */
  size?: number;
  /** Descrição para leitor de tela — o número visível é `aria-hidden`. */
  label: string;
};

export function ProgressRing({ value, size = 72, label }: ProgressRingProps) {
  const percent = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <ProgressCircle.Root
      aria-label={label}
      value={percent}
      minValue={0}
      maxValue={100}
      className="relative inline-flex shrink-0 items-center justify-center"
    >
      <ProgressCircle.Track
        className="-rotate-0"
        style={{ width: size, height: size }}
      >
        <ProgressCircle.TrackCircle
          className="stroke-white/20"
          strokeWidth={3}
        />
        <ProgressCircle.FillCircle className="stroke-success" strokeWidth={3} />
      </ProgressCircle.Track>

      <span
        aria-hidden="true"
        className="absolute text-base font-semibold tabular-nums text-white"
      >
        {percent}%
      </span>
    </ProgressCircle.Root>
  );
}
