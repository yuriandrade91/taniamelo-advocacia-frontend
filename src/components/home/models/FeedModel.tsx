"use client";

import { useState } from "react";
import { SegmentBar, TONE_BG, TONE_TEXT, toneAt } from "@/components/ui/models/viz";
import { CheckCircleIcon, FeedIcon } from "@/components/ui/icons/glyphs";
import {
  IconTile,
  Illustrative,
  Kicker,
  LinesSkeleton,
  QuickActions,
  STAGES,
  buildPriorities,
  isPriorityLoading,
  leadsValue,
  money,
  plural,
  usePipeline,
  useNow,
  type Priority,
  type PriorityKind,
} from "./homeKit";
import type { HomeModelProps } from "./shared";

/**
 * 4 · Feed de prioridades — tudo numa fila só, do mais urgente ao resto.
 *
 * Leads, recebimentos atrasados, documentos e compromissos deixam de morar em
 * cartões separados: viram itens de um feed, cada um com a sua ação. Filtros
 * no topo e, ao lado, um resumo fixo com a esteira e os atalhos.
 */

type Filter = "all" | "appointment" | "finance" | "lead" | "document";

const FILTER_OF: Record<PriorityKind, Exclude<Filter, "all">> = {
  appointment: "appointment",
  overdue: "finance",
  upcoming: "finance",
  lead: "lead",
  document: "document",
};

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Tudo" },
  { id: "appointment", label: "Agenda" },
  { id: "finance", label: "Financeiro" },
  { id: "lead", label: "Leads" },
  { id: "document", label: "Documentos" },
];

export function FeedModel(props: HomeModelProps) {
  const { pendingCount, outflow, pipeline, periodLabel, actions } = props;
  const now = useNow();
  const [filter, setFilter] = useState<Filter>("all");
  const all = buildPriorities(props, now);
  const loading = isPriorityLoading(props);
  const visible = filter === "all" ? all : all.filter((p) => FILTER_OF[p.kind] === filter);
  const urgent = visible.filter((p) => p.urgent);
  const rest = visible.filter((p) => !p.urgent);
  const { columns, total } = usePipeline(pipeline, actions.moveCard);

  const countOf = (f: Filter) =>
    f === "all" ? all.length : all.filter((p) => FILTER_OF[p.kind] === f).length;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Kicker className="flex items-center gap-2 text-secondary">
              <FeedIcon className="h-4 w-4" /> Feed de prioridades
            </Kicker>
            <h1 className="mt-2 text-3xl font-light tracking-tight text-primary">
              {loading
                ? "Montando a sua fila…"
                : all.length === 0
                  ? "Nada pendente."
                  : `${all.length} ${plural(all.length, "coisa pede", "coisas pedem")} sua atenção`}
            </h1>
          </div>
          <p className="text-xs text-gray-100">Do mais urgente para o resto.</p>
        </header>

        <div role="tablist" aria-label="Filtrar prioridades" className="mt-5 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(f.id)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium transition ${
                  active ? "bg-primary text-white" : "bg-white text-gray-100 ring-1 ring-black/5 hover:text-primary"
                }`}
              >
                {f.label}
                <span
                  className={`rounded-full px-1.5 text-[10px] tabular-nums ${
                    active ? "bg-white/20" : "bg-page"
                  }`}
                >
                  {countOf(f.id)}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex flex-col gap-6">
          {urgent.length > 0 && (
            <FeedGroup title="Pede atenção agora" items={urgent} accent />
          )}
          {rest.length > 0 && <FeedGroup title="Na sequência" items={rest} />}

          {loading && (
            <div>
              <Kicker className="mb-3 text-gray-100/60">Carregando mais…</Kicker>
              <LinesSkeleton rows={2} rowClassName="h-20" />
            </div>
          )}

          {!loading && visible.length === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-black/5">
              <CheckCircleIcon className="h-10 w-10 text-success" />
              <p className="text-lg font-medium text-primary">Tudo em dia por aqui.</p>
              <p className="max-w-sm text-sm text-gray-100">
                {filter === "all"
                  ? "Nenhum lead esperando, nenhum atraso e nada na agenda à frente."
                  : "Nada nesta categoria agora."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Lateral fixa */}
      <aside className="flex flex-col gap-4 lg:sticky lg:top-4 lg:self-start">
        <section className="rounded-3xl bg-white p-5 ring-1 ring-black/5">
          <Kicker className="text-gray-100/70">Atalhos</Kicker>
          <QuickActions actions={actions} pendingCount={pendingCount} className="mt-3" />
        </section>

        <section className="rounded-3xl bg-white p-5 ring-1 ring-black/5">
          <div className="flex items-center justify-between">
            <Kicker className="text-gray-100/70">Esteira</Kicker>
            <span className="text-xs text-gray-100 tabular-nums">{total}</span>
          </div>
          {total === 0 ? (
            <p className="mt-3 text-sm text-gray-100/70">Nenhum cliente na esteira.</p>
          ) : (
            <>
              <SegmentBar
                className="mt-3 h-2"
                segments={STAGES.map((s) => ({ label: s.label, value: columns[s.key].length, tone: s.tone }))}
              />
              <ul className="mt-3 grid grid-cols-2 gap-2">
                {STAGES.map((s) => (
                  <li key={s.key} className="flex items-center justify-between gap-2 rounded-xl bg-page px-2.5 py-1.5 text-[11px]">
                    <span className="flex min-w-0 items-center gap-1.5 text-gray-100">
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE_BG[s.tone]}`} />
                      <span className="truncate">{s.short}</span>
                    </span>
                    <span className="font-semibold text-primary tabular-nums">{columns[s.key].length}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <button
            type="button"
            onClick={actions.openClients}
            className="mt-3 text-xs font-medium text-secondary hover:text-primary"
          >
            Ver clientes →
          </button>
        </section>

        <section className="rounded-3xl bg-white p-5 ring-1 ring-black/5">
          <div className="flex items-center justify-between gap-2">
            <Kicker className="text-gray-100/70">Saídas · {periodLabel}</Kicker>
          </div>
          {outflow.slices.length === 0 ? (
            <p className="mt-3 text-sm text-gray-100/70">Sem despesas pagas neste mês.</p>
          ) : (
            <>
              <p className="mt-2 text-2xl font-semibold text-primary tabular-nums">{money(outflow.total)}</p>
              <SegmentBar
                className="mt-3 h-2"
                segments={outflow.slices.map((s, i) => ({ label: s.label, value: s.percentage, tone: toneAt(i) }))}
              />
              <p className="mt-2 truncate text-[11px] text-gray-100">
                Maior: {outflow.slices[0].label} ({outflow.slices[0].percentage}%)
              </p>
            </>
          )}
        </section>

        <section className="rounded-3xl bg-light-secondary p-5 ring-1 ring-secondary/15">
          <div className="flex items-center justify-between gap-2">
            <Kicker className="text-secondary">Indicadores</Kicker>
            <Illustrative />
          </div>
          <ul className="mt-3 flex flex-col gap-2">
            {props.stats.map((s) => (
              <li key={s.title} className="flex items-baseline justify-between gap-3 text-xs">
                <span className="truncate text-gray-100">{s.title}</span>
                <span className="font-semibold text-primary tabular-nums">
                  {s.value}
                  {s.total !== undefined ? `/${s.total}` : ""}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-gray-100">
            Leads agora: <span className="font-semibold text-primary">{leadsValue(pendingCount)}</span>
          </p>
        </section>
      </aside>
    </div>
  );
}

function FeedGroup({
  title,
  items,
  accent = false,
}: {
  title: string;
  items: Priority[];
  accent?: boolean;
}) {
  return (
    <section>
      <Kicker className={`mb-3 flex items-center gap-2 ${accent ? "text-danger" : "text-gray-100/60"}`}>
        {accent && <span className="h-1.5 w-1.5 rounded-full bg-danger" />}
        {title}
        <span className="h-px flex-1 bg-black/5" />
      </Kicker>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <FeedItem key={item.id} item={item} />
        ))}
      </ul>
    </section>
  );
}

function FeedItem({ item }: { item: Priority }) {
  return (
    <li
      className={`group flex flex-col gap-4 rounded-3xl bg-white p-4 ring-1 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/5 motion-reduce:transform-none sm:flex-row sm:items-center sm:p-5 ${
        item.urgent ? "ring-danger/15" : "ring-black/5"
      }`}
    >
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <IconTile icon={item.icon} tone={item.tone} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 text-[11px]">
            <span className={`font-medium tracking-wider uppercase ${TONE_TEXT[item.tone]}`}>{item.kicker}</span>
            {item.when && <span className="text-gray-100/70">· {item.when}</span>}
          </p>
          <p className="mt-0.5 truncate font-medium text-primary">{item.title}</p>
          <p className="truncate text-sm text-gray-100">{item.detail}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={item.onAction}
        className={`shrink-0 self-start rounded-full px-4 py-2 text-xs font-medium transition active:scale-95 sm:self-center ${
          item.urgent
            ? "bg-primary text-white hover:bg-primary/90"
            : "bg-page text-primary hover:bg-light-gray/60"
        }`}
      >
        {item.actionLabel}
      </button>
    </li>
  );
}
