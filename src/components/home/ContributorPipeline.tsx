"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSwapy, type Swapy } from "swapy";
import {
  SITUATION_ENTRIES,
  type SituationKey,
} from "@/enums/situation/Situation";
import { CalendarIcon, SectionTitle, SeeAllLink } from "./ui";

/**
 * Esteira do Contribuinte — kanban com drag & drop (Swapy) e paginação.
 *
 * As colunas são exatamente o enum `Situation` do backend, então mover um card
 * equivale a `PATCH /api/v1/clients/{id} { situation }` (ver `onMove`).
 *
 * ── Por que `manualSwap` ──
 * O comportamento padrão do Swapy é **trocar** dois cards de lugar. Num kanban
 * o esperado é **inserir**: o card entra na posição de destino e os demais
 * descem. Com `manualSwap: true` o Swapy não mexe no DOM — ele apenas reporta a
 * intenção, e nós aplicamos a movimentação no estado. O React re-renderiza e o
 * `swapy.update()` reindexa os slots.
 *
 * ── Paginação ──
 * Cada coluna mostra no máximo `PAGE_SIZE` cards. O índice do slot é relativo à
 * página visível; convertemos para índice global com o offset da página.
 */

export const PAGE_SIZE = 5;

export type PipelineCard = {
  id: string;
  name: string;
  /** Data já formatada para exibição (ex.: "12/02/2025"). */
  date: string;
  situation: SituationKey;
};

export type ContributorPipelineProps = {
  cards: PipelineCard[];
  /** Chamado quando um card muda de coluna. Deve persistir via `patchClient`. */
  onMove?: (cardId: string, situation: SituationKey) => void;
  onSeeFullFlow?: () => void;
  className?: string;
};

type Columns = Record<SituationKey, PipelineCard[]>;

const SLOT_SEPARATOR = "::";

const buildSlotId = (situation: SituationKey, index: number) =>
  `${situation}${SLOT_SEPARATOR}${index}`;

const parseSlotId = (slotId: string) => {
  const [situation, index] = slotId.split(SLOT_SEPARATOR);
  return { situation: situation as SituationKey, index: Number(index) };
};

/** Agrupa os cards por situação, preservando a ordem recebida. */
function groupBySituation(cards: PipelineCard[]): Columns {
  const empty = Object.fromEntries(
    SITUATION_ENTRIES.map(([key]) => [key, [] as PipelineCard[]]),
  ) as Columns;

  cards.forEach((card) => {
    if (empty[card.situation]) empty[card.situation].push(card);
  });
  return empty;
}

export default function ContributorPipeline({
  cards,
  onMove,
  onSeeFullFlow,
  className = "",
}: ContributorPipelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const swapyRef = useRef<Swapy | null>(null);

  const [columns, setColumns] = useState<Columns>(() => groupBySituation(cards));
  const [pages, setPages] = useState<Record<string, number>>({});

  useEffect(() => setColumns(groupBySituation(cards)), [cards]);

  // Refs para leitura dentro do handler do Swapy (que não re-registra).
  const columnsRef = useRef(columns);
  columnsRef.current = columns;
  const pagesRef = useRef(pages);
  pagesRef.current = pages;
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  const getPage = useCallback(
    (situation: SituationKey, total: number) => {
      const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
      return Math.min(Math.max(pages[situation] ?? 1, 1), totalPages);
    },
    [pages],
  );

  /** Move um card para `toSituation`, na posição `toIndex` daquela coluna. */
  const moveCard = useCallback(
    (cardId: string, toSituation: SituationKey, toIndex: number) => {
      let changedSituation = false;

      setColumns((prev) => {
        // Localiza o card e sua coluna de origem.
        let card: PipelineCard | undefined;
        let fromSituation: SituationKey | undefined;

        for (const [key, list] of Object.entries(prev) as [
          SituationKey,
          PipelineCard[],
        ][]) {
          const found = list.find((c) => c.id === cardId);
          if (found) {
            card = found;
            fromSituation = key;
            break;
          }
        }
        if (!card || !fromSituation) return prev;

        const next: Columns = { ...prev };

        // Remove da origem.
        next[fromSituation] = next[fromSituation].filter((c) => c.id !== cardId);

        // Insere no destino (kanban: insere, não troca).
        const updated = { ...card, situation: toSituation };
        const target = [...next[toSituation]];
        const safeIndex = Math.max(0, Math.min(toIndex, target.length));
        target.splice(safeIndex, 0, updated);
        next[toSituation] = target;

        changedSituation = fromSituation !== toSituation;
        return next;
      });

      if (changedSituation) onMoveRef.current?.(cardId, toSituation);
    },
    [],
  );

  // ── Swapy ──
  useEffect(() => {
    if (!containerRef.current) return;

    const swapy = createSwapy(containerRef.current, {
      animation: "dynamic",
      swapMode: "drop",
      autoScrollOnDrag: true,
      // Não deixa o Swapy trocar o DOM: nós aplicamos a movimentação no estado.
      manualSwap: true,
    });
    swapyRef.current = swapy;

    swapy.onSwap(({ toSlot, draggingItem }) => {
      const { situation, index } = parseSlotId(toSlot);
      if (!situation) return;

      // O índice do slot é relativo à página visível da coluna de destino.
      const total = columnsRef.current[situation]?.length ?? 0;
      const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
      const page = Math.min(
        Math.max(pagesRef.current[situation] ?? 1, 1),
        totalPages,
      );
      const globalIndex = (page - 1) * PAGE_SIZE + index;

      moveCard(draggingItem, situation, globalIndex);
    });

    return () => {
      swapy.destroy();
      swapyRef.current = null;
    };
  }, [moveCard]);

  // Reindexa os slots sempre que o quadro muda (movimento ou troca de página).
  useEffect(() => {
    swapyRef.current?.update();
  }, [columns, pages]);

  const totalCards = useMemo(
    () => Object.values(columns).reduce((acc, list) => acc + list.length, 0),
    [columns],
  );

  return (
    <section
      className={`rounded-2xl border border-black/5 bg-white p-5 ${className}`}
    >
      <SectionTitle>Esteira do contribuinte</SectionTitle>

      <div
        ref={containerRef}
        className="mt-5 grid grid-cols-2 gap-0 md:grid-cols-3 xl:grid-cols-6"
      >
        {SITUATION_ENTRIES.map(([situationKey, situationLabel]) => {
          const key = situationKey as SituationKey;
          const columnCards = columns[key] ?? [];
          const totalPages = Math.max(
            1,
            Math.ceil(columnCards.length / PAGE_SIZE),
          );
          const page = getPage(key, columnCards.length);
          const pageStart = (page - 1) * PAGE_SIZE;
          const visible = columnCards.slice(pageStart, pageStart + PAGE_SIZE);

          // Slot vazio extra só quando a página ainda comporta mais um card —
          // é o que permite soltar numa coluna vazia ou no fim da lista.
          const slotCount =
            visible.length < PAGE_SIZE ? visible.length + 1 : visible.length;

          return (
            <div
              key={key}
              className="flex min-w-0 flex-col gap-3 px-3 [&:not(:last-child)]:border-r [&:not(:last-child)]:border-dashed [&:not(:last-child)]:border-gray-100/20"
            >
              <h3 className="flex items-center justify-center gap-1.5 text-center text-[11px] font-medium text-gray-100/80">
                <span className="min-w-0 truncate">{situationLabel}</span>
                {columnCards.length > 0 && (
                  <span className="shrink-0 text-gray-100/40">
                    ({columnCards.length})
                  </span>
                )}
              </h3>

              <div className="flex flex-col gap-2">
                {Array.from({ length: slotCount }).map((_, index) => {
                  const card = visible[index];
                  const slotId = buildSlotId(key, index);

                  return (
                    <div
                      key={slotId}
                      data-swapy-slot={slotId}
                      className={
                        card
                          ? "min-h-[34px]"
                          : "min-h-[34px] rounded-lg border border-dashed border-gray-100/20"
                      }
                    >
                      {card && (
                        <article
                          data-swapy-item={card.id}
                          className={`flex cursor-grab items-center justify-between gap-2 rounded-lg border px-2.5 py-2 active:cursor-grabbing ${
                            key === "BENEFICIO_CONCLUIDO"
                              ? "border-success/30 bg-light-green"
                              : "border-black/5 bg-white"
                          }`}
                        >
                          <p className="min-w-0 truncate text-[11px] text-gray-100">
                            {card.name}
                          </p>
                          <span className="inline-flex shrink-0 items-center gap-1 text-[10px] text-gray-100/60">
                            <CalendarIcon className="h-3 w-3" />
                            {card.date}
                          </span>
                        </article>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Paginação da coluna — só aparece quando passa de uma página. */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-1">
                  <button
                    type="button"
                    aria-label={`Página anterior de ${situationLabel}`}
                    disabled={page <= 1}
                    onClick={() =>
                      setPages((p) => ({ ...p, [key]: Math.max(1, page - 1) }))
                    }
                    className="rounded-md px-2 py-0.5 text-sm text-gray-100/70 enabled:hover:bg-light-gray disabled:opacity-30"
                  >
                    ‹
                  </button>
                  <span className="text-xs tabular-nums text-gray-100/60">
                    {page}/{totalPages}
                  </span>
                  <button
                    type="button"
                    aria-label={`Próxima página de ${situationLabel}`}
                    disabled={page >= totalPages}
                    onClick={() =>
                      setPages((p) => ({
                        ...p,
                        [key]: Math.min(totalPages, page + 1),
                      }))
                    }
                    className="rounded-md px-2 py-0.5 text-sm text-gray-100/70 enabled:hover:bg-light-gray disabled:opacity-30"
                  >
                    ›
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {totalCards === 0 ? (
        <p className="mt-6 text-center text-sm text-gray-100/60">
          Nenhum cliente na esteira.
        </p>
      ) : (
        <SeeAllLink onClick={onSeeFullFlow} />
      )}
    </section>
  );
}
