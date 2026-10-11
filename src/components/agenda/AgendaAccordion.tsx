"use client";

import { useState } from "react";
import { Skeleton, Tooltip } from "@heroui/react";
import { TablePagination } from "@/components/ui/table/TablePagination";
import { ActionButton } from "@/components/ui/actions/ActionGroup";
import { plural } from "@/lib/format";
import { slicePage } from "@/lib/pagination";
import {
  isCancelled,
  localDayOf,
  rulerSpan,
  type AgendaDay,
} from "./agendaGrouping";
import {
  AppointmentRow,
  DayHeading,
  TYPE_ORDER,
  appointmentActions,
  typeSolid,
  typeStyle,
  typeTile,
  type AgendaActions,
} from "./agendaRow";
import { useNow } from "@/hooks/useNow";
import { ChevronRightIcon } from "@/components/ui/icons/glyphs";

export type { AgendaActions };

/**
 * A agenda do mês em sanfona — o modelo escolhido no estudo visual.
 *
 * - Um cartão por dia. Fechado, já conta o que tem: o dia da semana, quantos
 *   compromissos, das quantas às quantas, os ícones dos tipos e a régua do
 *   expediente com os blocos ocupados.
 * - Por padrão só **hoje** vem aberto; os outros, fechados. Depois do
 *   primeiro clique, abrir e fechar é com quem usa (o estado zera ao trocar de
 *   mês — a página dá uma `key` por mês).
 * - Paginada: 10 dias por página e, dentro de cada dia, 10 compromissos por
 *   página. A página dos dias começa na que tem hoje.
 * - Tipos na rampa de azul do funil (`@/components/ui/stageRamp`): o ícone só
 *   no cabeçalho do dia; na linha, o tipo vem escrito.
 * - A linha e o cabeçalho do dia são as peças de `agendaRow`, as mesmas que o
 *   cartão da Home usa no modo compacto.
 * - Ações em ícone, com a regra que o backend impõe (ver `appointmentActions`).
 */

const DAYS_PER_PAGE = 10;
const ITEMS_PER_PAGE = 10;

const todayKey = () => localDayOf(new Date().toISOString());

// ── Sanfona ──

export function AgendaAccordion({
  days,
  actions,
  isLoading,
}: {
  days: AgendaDay[];
  actions: AgendaActions;
  isLoading: boolean;
}) {
  const now = useNow();
  const today = todayKey();

  // `null` = ninguém mexeu ainda: só hoje aberto.
  const [open, setOpen] = useState<Set<string> | null>(null);
  const isOpen = (key: string) => (open ? open.has(key) : key === today);
  const toggle = (key: string) => {
    const next = new Set(open ?? [today]);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setOpen(next);
  };

  // Página dos dias: começa na que tem hoje (`null` = ainda não escolhida).
  const [dayPage, setDayPage] = useState<number | null>(null);
  const todayIndex = days.findIndex((d) => d.date === today);
  const initialPage =
    todayIndex >= 0 ? Math.floor(todayIndex / DAYS_PER_PAGE) + 1 : 1;
  const daysPage = slicePage(days, dayPage ?? initialPage, DAYS_PER_PAGE);

  // Página de cada dia, por data.
  const [itemPages, setItemPages] = useState<Record<string, number>>({});

  if (isLoading || days.length === 0)
    return <ListState isLoading={isLoading} actions={actions} />;

  const rowActions = appointmentActions(actions);

  return (
    <div>
      <div className="flex flex-col gap-3">
        {daysPage.slice.map((day) => {
          const expanded = isOpen(day.date);
          const panelId = `agenda-dia-${day.date}`;
          const items = slicePage(
            day.items,
            itemPages[day.date] ?? 1,
            ITEMS_PER_PAGE,
          );
          return (
            <section
              key={day.date}
              className={`overflow-hidden rounded-3xl bg-white ring-1 transition ${
                expanded ? "ring-secondary/40" : "ring-black/5"
              }`}
            >
              {/*
                O botão cobre a faixa toda (o `after` esticado): clicar em
                qualquer ponto abre e fecha. Os ícones dos tipos ficam por
                cima dele (`z-10`) para o tooltip — botão dentro de botão não
                é HTML válido, então eles não podem estar dentro.
              */}
              <div
                className={`relative flex flex-wrap items-center gap-5 px-6 py-5 transition hover:bg-secondary/5 ${
                  // Aberto: o creme do hover fica fixo — marca qual dia está aberto.
                  expanded ? "bg-secondary/5" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggle(day.date)}
                  aria-expanded={expanded}
                  aria-controls={panelId}
                  className="flex min-w-0 flex-1 items-center gap-5 text-left outline-none after:absolute after:inset-0 after:rounded-t-3xl after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-secondary/60 focus-visible:after:ring-inset"
                >
                  <DayHeading day={day} isToday={day.date === today} />
                </button>
                <TypeIcons day={day} />
                <DayRuler day={day} />
                <ChevronRightIcon
                  className={`pointer-events-none h-5 w-5 shrink-0 text-gray-100 transition-transform duration-300 motion-reduce:transition-none ${
                    expanded ? "rotate-90 text-secondary" : ""
                  }`}
                />
              </div>

              {/*
                Grade 0fr→1fr: abre e fecha com animação sem medir altura.
                `inert` fechado: as ações escondidas não recebem Tab.
              */}
              <div
                id={panelId}
                inert={!expanded}
                className={`grid transition-[grid-template-rows] duration-300 motion-reduce:transition-none ${
                  expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <ul className="border-t border-black/5">
                    {items.slice.map((a) => (
                      <AppointmentRow
                        key={a.id}
                        appointment={a}
                        actions={rowActions}
                        now={now}
                      />
                    ))}
                  </ul>
                  {items.totalPages > 1 && (
                    <div className="border-t border-black/5 px-6 pb-4">
                      <TablePagination
                        pageNumber={items.current}
                        pageSize={ITEMS_PER_PAGE}
                        total={day.items.length}
                        totalPages={items.totalPages}
                        onPageChange={(page) =>
                          setItemPages((pages) => ({
                            ...pages,
                            [day.date]: page,
                          }))
                        }
                        noun={["compromisso", "compromissos"]}
                      />
                    </div>
                  )}
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <TablePagination
        pageNumber={daysPage.current}
        pageSize={DAYS_PER_PAGE}
        total={days.length}
        totalPages={daysPage.totalPages}
        onPageChange={setDayPage}
        noun={["dia", "dias"]}
      />
    </div>
  );
}

/**
 * Os tipos do dia, um ícone cada, com tooltip (o mesmo das ações da tabela):
 * o nome do tipo e quantos compromissos dele há no dia.
 */
function TypeIcons({ day }: { day: AgendaDay }) {
  const types = TYPE_ORDER.filter((t) => day.items.some((a) => a.type === t));
  return (
    <span className="relative z-10 flex items-center gap-1.5">
      {types.map((t) => {
        const { icon: Icon } = typeStyle(t);
        const count = day.items.filter((a) => a.type === t).length;
        return (
          <Tooltip key={t} delay={0}>
            <Tooltip.Trigger
              aria-label={`${t}: ${plural(count, "compromisso", "compromissos")}`}
              className={`grid h-8 w-8 cursor-help place-items-center rounded-lg ${typeTile(t)}`}
            >
              <Icon className="h-4 w-4" />
            </Tooltip.Trigger>
            <Tooltip.Content showArrow placement="bottom">
              <Tooltip.Arrow />
              <p className="text-xs text-gray-100">
                <span className="font-medium">{t}</span> ·{" "}
                {plural(count, "compromisso", "compromissos")}
              </p>
            </Tooltip.Content>
          </Tooltip>
        );
      })}
    </span>
  );
}

/** A régua do expediente (07h–20h) com os blocos ocupados, na cor do tipo. */
function DayRuler({ day }: { day: AgendaDay }) {
  return (
    <span
      className="pointer-events-none relative hidden h-2 w-40 overflow-hidden rounded-full bg-page md:block"
      aria-hidden="true"
    >
      {day.items
        .filter((a) => !isCancelled(a))
        .map((a) => {
          const span = rulerSpan(a);
          return (
            span && (
              <span
                key={a.id}
                className={`absolute inset-y-0 ${typeSolid(String(a.type))}`}
                style={{ left: `${span.left}%`, width: `${span.width}%` }}
              />
            )
          );
        })}
    </span>
  );
}

/** Carregando ou vazio — o filtro fica em cima, então a tela não some. */
function ListState({
  isLoading,
  actions,
}: {
  isLoading: boolean;
  actions: AgendaActions;
}) {
  if (isLoading) {
    return (
      <div role="status" aria-label="Carregando a agenda" className="flex flex-col gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <DaySkeleton key={i} />
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-black/5">
      <p className="text-sm text-gray-100/80">
        Nenhum compromisso neste mês com os filtros escolhidos.
      </p>
      <ActionButton tone="primary" onClick={actions.onCreate}>
        Novo compromisso
      </ActionButton>
    </div>
  );
}

/** Um dia carregando: o cabeçalho real com skeleton só no que é dado, na largura dele. */
function DaySkeleton() {
  return (
    <section aria-hidden="true" className="overflow-hidden rounded-3xl bg-white ring-1 ring-black/5">
      <div className="flex flex-wrap items-center gap-5 px-6 py-5">
        <Skeleton className="h-14 w-14 shrink-0 rounded-2xl" />
        <span className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-28 rounded-md" />
          <Skeleton className="h-3 w-56 max-w-full rounded-md" />
        </span>
        <span className="flex items-center gap-1.5">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </span>
        <Skeleton className="hidden h-2 w-40 rounded-full md:block" />
        <ChevronRightIcon className="h-5 w-5 shrink-0 text-gray-100/40" />
      </div>
    </section>
  );
}
