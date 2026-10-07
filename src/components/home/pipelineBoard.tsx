"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createSwapy, type Swapy } from "swapy";
import { Skeleton } from "@heroui/react";
import {
  SITUATION_ENTRIES,
  type SituationKey,
} from "@/enums/situation/Situation";
import { CalendarIcon } from "@/components/ui/icons/CalendarIcon";
import { LoadingCircle } from "@/components/ui/feedback/Loading";
import { stageBg, stageTile } from "@/components/ui/stageRamp";
import { initials, plural } from "@/lib/format";

/**
 * O quadro da Esteira do Contribuinte — as colunas, os cards e o que move um
 * cliente de etapa.
 *
 * Mora fora do cartão porque há dois quadros na Home: o do cartão, que mostra
 * os primeiros de cada coluna, e o da modal "Ver todos", que mostra a esteira
 * inteira. Os dois leem as MESMAS colunas (`usePipelineColumns`, na página do
 * cartão) — mover um cliente na modal já mostra ele na etapa nova no cartão
 * atrás, porque não há dois estados.
 *
 * ── Cor ──
 * As etapas são **ordinais**: a cor segue a posição no funil, não um "tipo".
 * É a rampa de azul de `@/components/ui/stageRamp` — a mesma do funil dos
 * Relatórios e dos tipos da Agenda —, do azul cheio na primeira etapa ao mais
 * claro na última.
 *
 * ── Duas formas de mover, de propósito ──
 * Arrastar o card (Swapy) é o gesto de quem está com o quadro na frente; o
 * seletor de etapa e o botão → são o caminho de teclado e de quem sabe para
 * onde quer ir sem procurar a coluna. O seletor também é o único caminho
 * acessível: arrastar não tem equivalente no teclado.
 *
 * `data-swapy-handle` restringe o arrasto ao cabeçalho do card. Sem isso,
 * puxar o `<select>` começaria um arrasto em vez de abrir a lista.
 *
 * ── Por que `manualSwap` ──
 * O comportamento padrão do Swapy é **trocar** dois cards de lugar. Num kanban
 * o esperado é **inserir**: o card entra na posição de destino e os demais
 * descem. Com `manualSwap: true` o Swapy não mexe no DOM — ele apenas reporta
 * a intenção, e nós aplicamos a movimentação no estado. O React re-renderiza e
 * o `swapy.update()` reindexa os slots.
 */

/** Quantos cards cada coluna mostra antes do "+ N clientes". */
export const COLUMN_LIMIT = 6;

export type PipelineCard = {
  id: string;
  name: string;
  /** Data já formatada para exibição (ex.: "12/02/2025"). */
  date: string;
  situation: SituationKey;
};

export type PipelineColumns = Record<SituationKey, PipelineCard[]>;

/** As etapas na ordem fixa do enum — a posição é a cor. */
export const STAGES = SITUATION_ENTRIES.map(([key, label], index) => ({
  key: key as SituationKey,
  label,
  index,
}));

export const nextStageOf = (key: SituationKey) =>
  STAGES[STAGES.findIndex((s) => s.key === key) + 1] ?? null;

/** Agrupa os cards por situação, preservando a ordem recebida. */
export function groupBySituation(cards: PipelineCard[]): PipelineColumns {
  const empty = Object.fromEntries(
    STAGES.map((s) => [s.key, [] as PipelineCard[]]),
  ) as PipelineColumns;

  cards.forEach((card) => {
    if (empty[card.situation]) empty[card.situation].push(card);
  });
  return empty;
}

/**
 * As colunas e a movimentação — o estado que os dois quadros compartilham.
 *
 * Quem persiste é `onMove` (`patchClient`, na página). O desvio local vale até
 * a próxima carga da listagem.
 */
export function usePipelineColumns(
  cards: PipelineCard[],
  onMove?: (cardId: string, situation: SituationKey) => void,
) {
  const [columns, setColumns] = useState<PipelineColumns>(() =>
    groupBySituation(cards),
  );

  // Cartões novos de fora: refaz as colunas no render (ajuste por mudança de prop).
  const [sourceCards, setSourceCards] = useState(cards);
  if (sourceCards !== cards) {
    setSourceCards(cards);
    setColumns(groupBySituation(cards));
  }

  // Ref para leitura dentro do handler do Swapy (que não re-registra).
  const onMoveRef = useRef(onMove);
  useEffect(() => {
    onMoveRef.current = onMove;
  });

  /** Move um card para `situation`, na posição `index` daquela coluna. */
  const moveCard = useCallback(
    (cardId: string, situation: SituationKey, index: number) => {
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

        const fromIndex = prev[fromSituation].indexOf(card);
        const next: PipelineColumns = { ...prev };
        next[fromSituation] = next[fromSituation].filter((c) => c.id !== cardId);

        // Insere no destino (kanban: insere, não troca). Descendo na MESMA
        // coluna o alvo já subiu uma casa com a remoção — sem o ajuste, soltar
        // um card uma posição abaixo o devolveria ao lugar de onde saiu.
        const sameColumn = fromSituation === situation;
        const wanted = sameColumn && index > fromIndex ? index - 1 : index;

        const updated = { ...card, situation };
        const target = [...next[situation]];
        target.splice(Math.max(0, Math.min(wanted, target.length)), 0, updated);
        next[situation] = target;

        changedSituation = !sameColumn;
        return next;
      });

      if (changedSituation) onMoveRef.current?.(cardId, situation);
    },
    [],
  );

  const total = useMemo(
    () => Object.values(columns).reduce((acc, list) => acc + list.length, 0),
    [columns],
  );

  return { columns, total, moveCard };
}

// ── Quadro ──

const SLOT_SEPARATOR = "::";

export type PipelineBoardProps = {
  columns: PipelineColumns;
  /** `moveCard` de `usePipelineColumns`. */
  onMove: (cardId: string, situation: SituationKey, index: number) => void;
  /**
   * Prefixo dos slots do Swapy. Um por quadro na tela: o cartão e a modal
   * existem ao mesmo tempo, e slots homônimos em instâncias diferentes do
   * Swapy são um convite a confusão na depuração.
   */
  scope: string;
  /** Cards por coluna antes do "+ N clientes"; `null` mostra todos. */
  limit?: number | null;
  /**
   * `strip` (padrão) é a fita que rola na horizontal: cabe num cartão da Home
   * sem decidir quantas colunas mostrar. `grid` reparte a largura entre as
   * seis e quebra em duas ou três linhas quando não cabem — é o que a modal
   * usa, onde "esteira completa" não combina com rolar para o lado para achar
   * a última etapa.
   */
  layout?: "strip" | "grid";
  /** Carregando: as colunas ficam, com cartões em skeleton. */
  isLoading?: boolean;
  /** Rolagem própria da coluna — a modal dá altura fixa às seis. */
  columnBodyClassName?: string;
  className?: string;
};

export function PipelineBoard({
  columns,
  onMove,
  scope,
  limit = COLUMN_LIMIT,
  layout = "strip",
  isLoading = false,
  columnBodyClassName = "",
  className = "",
}: PipelineBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const swapyRef = useRef<Swapy | null>(null);
  const [expanded, setExpanded] = useState<Partial<Record<SituationKey, boolean>>>({});

  const buildSlotId = (situation: SituationKey, index: number) =>
    `${scope}${SLOT_SEPARATOR}${situation}${SLOT_SEPARATOR}${index}`;

  const onMoveRef = useRef(onMove);
  useEffect(() => {
    onMoveRef.current = onMove;
  });

  // ── Swapy ──
  useEffect(() => {
    if (!containerRef.current) return;

    const swapy = createSwapy(containerRef.current, {
      animation: "dynamic",
      swapMode: "drop",
      autoScrollOnDrag: true,
      manualSwap: true,
    });
    swapyRef.current = swapy;

    swapy.onSwap(({ toSlot, draggingItem }) => {
      const [, situation, index] = toSlot.split(SLOT_SEPARATOR);
      if (!situation) return;
      // O que está à vista é um prefixo da coluna: o índice do slot é o índice
      // na lista inteira, aberta ou não.
      onMoveRef.current(draggingItem, situation as SituationKey, Number(index));
    });

    return () => {
      swapy.destroy();
      swapyRef.current = null;
    };
  }, []);

  // Reindexa os slots sempre que o quadro muda (movimento ou abrir a coluna).
  useEffect(() => {
    swapyRef.current?.update();
  }, [columns, expanded]);

  /** Mover pelo seletor ou pelo botão → : o card vai para o fim da coluna. */
  const moveToStage = (cardId: string, situation: SituationKey) =>
    onMove(cardId, situation, Number.MAX_SAFE_INTEGER);

  const isGrid = layout === "grid";

  return (
    <div
      ref={containerRef}
      className={`gap-3 p-1 pb-3 ${
        isGrid
          ? "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6"
          : "flex snap-x overflow-x-auto [scrollbar-width:thin]"
      } ${className}`}
    >
      {STAGES.map((stage) => {
        const cards = columns[stage.key] ?? [];
        const isOpen = limit === null || (expanded[stage.key] ?? false);
        const shown = isOpen ? cards : cards.slice(0, limit);
        const hidden = cards.length - shown.length;

        return (
          <div
            key={stage.key}
            className={`flex flex-col rounded-3xl bg-page p-3 ${
              isGrid ? "min-w-0" : "w-64 shrink-0 snap-start"
            }`}
          >
            <header className="mb-3 flex items-center justify-between gap-2 px-1">
              <h3 className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden="true"
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${stageBg(stage.index)}`}
                />
                <span className="truncate text-xs font-medium text-primary">
                  {stage.label}
                </span>
              </h3>
              {isLoading ? (
                <LoadingCircle size={12} label={`Contando ${stage.label}`} />
              ) : (
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${stageTile(stage.index)}`}
                >
                  {cards.length}
                </span>
              )}
            </header>

            <div className={`flex flex-col gap-2 ${columnBodyClassName}`}>
              {isLoading &&
                [0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-[76px] shrink-0 rounded-2xl" />
                ))}

              {/* Um slot a mais que os cards: é ele que recebe o card solto no
                  fim da coluna — e o único alvo de uma coluna vazia. */}
              {!isLoading &&
                Array.from({ length: shown.length + 1 }).map((_, index) => {
                  const card = shown[index];
                  const slotId = buildSlotId(stage.key, index);

                  if (!card)
                    return (
                      <div
                        key={slotId}
                        data-swapy-slot={slotId}
                        className={`shrink-0 rounded-2xl border border-dashed border-black/10 ${
                          cards.length === 0
                            ? "px-3 py-6 text-center text-[11px] text-gray-100/60"
                            : "min-h-9"
                        }`}
                      >
                        {cards.length === 0 && "Sem clientes nesta etapa"}
                      </div>
                    );

                  return (
                    <div key={slotId} data-swapy-slot={slotId} className="shrink-0">
                      <BoardCard
                        card={card}
                        stageIndex={stage.index}
                        onMove={moveToStage}
                      />
                    </div>
                  );
                })}
            </div>

            {!isLoading && limit !== null && (hidden > 0 || expanded[stage.key]) && (
              <button
                type="button"
                onClick={() =>
                  setExpanded((prev) => ({ ...prev, [stage.key]: !isOpen }))
                }
                className="mt-2 rounded-xl py-1.5 text-[11px] font-medium text-gray-100 hover:bg-white hover:text-primary"
              >
                {isOpen
                  ? "Mostrar menos"
                  : `+ ${plural(hidden, "cliente", "clientes")}`}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Um cliente no quadro: quem é, desde quando, e para onde pode ir. */
function BoardCard({
  card,
  stageIndex,
  onMove,
}: {
  card: PipelineCard;
  stageIndex: number;
  onMove: (cardId: string, situation: SituationKey) => void;
}) {
  const next = nextStageOf(card.situation);
  return (
    <article
      data-swapy-item={card.id}
      className="rounded-2xl bg-white p-3 ring-1 ring-black/5 transition hover:shadow-lg hover:shadow-primary/5"
    >
      <div
        data-swapy-handle
        className="flex cursor-grab items-center gap-2.5 active:cursor-grabbing"
      >
        <span
          aria-hidden="true"
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${stageTile(stageIndex)}`}
        >
          {initials(card.name)}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-xs font-medium text-primary">
            {card.name}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-gray-100 tabular-nums">
            <CalendarIcon className="h-3 w-3" />
            desde {card.date}
          </span>
        </span>
      </div>

      <div className="mt-2.5 flex items-center gap-1.5">
        <StageSelect card={card} onMove={onMove} className="flex-1" />
        {next && (
          <button
            type="button"
            onClick={() => onMove(card.id, next.key)}
            title={`Avançar para ${next.label}`}
            aria-label={`Avançar ${card.name} para ${next.label}`}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary text-white transition hover:bg-primary/90 active:scale-95"
          >
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </article>
  );
}

/** Mover um cliente para qualquer etapa — `<select>` nativo, acessível. */
function StageSelect({
  card,
  onMove,
  className = "",
}: {
  card: PipelineCard;
  onMove: (cardId: string, situation: SituationKey) => void;
  className?: string;
}) {
  return (
    <label className={`relative inline-flex min-w-0 ${className}`}>
      <span className="sr-only">Mover {card.name} para</span>
      <select
        value={card.situation}
        onChange={(event) => {
          const target = STAGES.find((s) => s.key === event.target.value);
          if (target) onMove(card.id, target.key);
        }}
        className="w-full min-w-0 cursor-pointer appearance-none truncate rounded-lg bg-page py-1 pr-6 pl-2 text-[11px] font-medium text-primary ring-1 ring-black/5 outline-none hover:bg-light-gray/60 focus-visible:ring-2 focus-visible:ring-primary/30"
      >
        {STAGES.map((s) => (
          <option key={s.key} value={s.key} className="text-primary">
            {s.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[9px] opacity-60">
        ▼
      </span>
    </label>
  );
}

const ArrowRightIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
    <path
      d="M4 10h12m0 0-4.5-4.5M16 10l-4.5 4.5"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
