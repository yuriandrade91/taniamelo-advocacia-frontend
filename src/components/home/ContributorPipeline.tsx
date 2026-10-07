"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { SituationKey } from "@/enums/situation/Situation";
import { SectionTitle } from "@/components/ui/layout/Card";
import { LoadingCircle } from "@/components/ui/feedback/Loading";
import { plural } from "@/lib/format";
import {
  COLUMN_LIMIT,
  PipelineBoard,
  usePipelineColumns,
  type PipelineCard,
} from "./pipelineBoard";
import { SeeAllLink } from "./ui";

/**
 * Esteira do Contribuinte — o cartão da Home.
 *
 * As colunas são exatamente o enum `Situation` do backend, então mover um card
 * equivale a `PATCH /api/v1/clients/{id} { situation }` (ver `onMove`).
 *
 * O quadro, a cor das etapas e as duas formas de mover um cliente moram em
 * `pipelineBoard` — é o mesmo quadro que a modal do "Ver todos" desenha, com o
 * mesmo estado. Aqui ele vem cortado em `COLUMN_LIMIT` cards por coluna,
 * porque o cartão divide a largura da Home com o resto; a modal mostra tudo.
 */

export { COLUMN_LIMIT };
export type { PipelineCard };

/** A modal só existe depois do clique em "Ver todos". */
const PipelineFullModal = dynamic(() => import("./PipelineFullModal"), {
  ssr: false,
});

export type ContributorPipelineProps = {
  cards: PipelineCard[];
  /** Chamado quando um card muda de coluna. Deve persistir via `patchClient`. */
  onMove?: (cardId: string, situation: SituationKey) => void;
  className?: string;
  /** Carregando: as colunas ficam, com cartões em skeleton. */
  isLoading?: boolean;
};

export default function ContributorPipeline({
  cards,
  onMove,
  className = "",
  isLoading = false,
}: ContributorPipelineProps) {
  const { columns, total, moveCard } = usePipelineColumns(cards, onMove);
  const [isFullOpen, setIsFullOpen] = useState(false);

  return (
    <section
      className={`rounded-2xl border border-black/5 bg-white p-5 ${className}`}
    >
      <header className="flex flex-wrap items-end justify-between gap-3">
        <SectionTitle>Esteira do contribuinte</SectionTitle>
        {isLoading ? (
          <LoadingCircle size={14} label="Contando os clientes da esteira" />
        ) : (
          total > 0 && (
            <p className="text-xs text-gray-100 tabular-nums">
              {plural(total, "cliente em andamento", "clientes em andamento")}
            </p>
          )
        )}
      </header>

      <PipelineBoard
        scope="cartao"
        columns={columns}
        onMove={moveCard}
        isLoading={isLoading}
        className="mt-5"
      />

      {!isLoading && total === 0 ? (
        <p className="mt-6 text-center text-sm text-gray-100/60">
          Nenhum cliente na esteira.
        </p>
      ) : (
        <SeeAllLink onClick={() => setIsFullOpen(true)} />
      )}

      {/* Montada no clique, como as outras modais da casa — o bundle da Home
          não carrega a esteira inteira antes de alguém pedir. */}
      {isFullOpen && (
        <PipelineFullModal
          isOpen
          onClose={() => setIsFullOpen(false)}
          columns={columns}
          total={total}
          onMove={moveCard}
        />
      )}
    </section>
  );
}
