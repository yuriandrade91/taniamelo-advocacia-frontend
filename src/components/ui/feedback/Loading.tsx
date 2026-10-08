"use client";

import { ProgressCircle, Skeleton } from "@heroui/react";

/**
 * As peças de carregamento, com a regra do sistema: o que carrega ocupa o
 * espaço do que vai aparecer — nada salta quando o dado chega, e a tela nunca
 * parece incompleta.
 *
 * - Selo, contagem, dica: `LoadingCircle` (o `ProgressCircle` indeterminado do
 *   HeroUI) no tamanho do selo.
 * - Texto e número: `Skeleton` na altura da linha e na largura do dado — o
 *   rótulo, que é fixo, aparece de verdade.
 * - Lista e tabela: `RowSkeleton`, linhas inteiras de altura média.
 */

export function LoadingCircle({
  size = 14,
  label = "Carregando",
  className = "",
}: {
  size?: number;
  label?: string;
  className?: string;
}) {
  return (
    <ProgressCircle isIndeterminate aria-label={label} className={`inline-flex shrink-0 ${className}`}>
      <ProgressCircle.Track style={{ width: size, height: size }}>
        <ProgressCircle.TrackCircle className="stroke-black/10" strokeWidth={3} />
        <ProgressCircle.FillCircle className="stroke-secondary" strokeWidth={3} />
      </ProgressCircle.Track>
    </ProgressCircle>
  );
}

/** Uma linha inteira de lista ou tabela, na altura média de uma linha. */
export function RowSkeleton({ className = "" }: { className?: string }) {
  return <Skeleton className={`h-10 w-full rounded-xl ${className}`} />;
}

/** Quantas linhas uma lista ou tabela mostra enquanto carrega. */
export const SKELETON_ROW_COUNT = 10;

/**
 * Várias `RowSkeleton` empilhadas — a lista enquanto carrega. Com `label`, é
 * a região que anuncia o carregamento (`role="status"`); sem, é só desenho.
 */
export function RowSkeletons({
  count = SKELETON_ROW_COUNT,
  label,
  className = "flex flex-col gap-3",
  itemClassName = "",
}: {
  count?: number;
  label?: string;
  className?: string;
  itemClassName?: string;
}) {
  return (
    <ul
      className={className}
      {...(label ? { role: "status", "aria-label": label } : { "aria-hidden": true })}
    >
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className={itemClassName}>
          <RowSkeleton />
        </li>
      ))}
    </ul>
  );
}
