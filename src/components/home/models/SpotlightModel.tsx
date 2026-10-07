"use client";

import { useState } from "react";
import { SegmentBar, TONE_TEXT, type Tone } from "@/components/ui/models/viz";
import { CheckCircleIcon, FocusIcon } from "@/components/ui/icons/glyphs";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  Illustrative,
  Kicker,
  QuickActions,
  STAGES,
  activeAppointments,
  buildPriorities,
  isPriorityLoading,
  leadsValue,
  money,
  summarizePayments,
  usePipeline,
  useNow,
} from "./homeKit";
import type { HomeModelProps } from "./shared";

/**
 * 9 · Holofote — um assunto por vez, grande, e o "próximo" logo ao lado.
 *
 * A mesma fila de prioridades do feed, mas sem lista: o item da vez ocupa o
 * palco escuro, com a ação dele em destaque. "Próximo" avança; no fim, um
 * fechamento diz que não sobrou nada. Embaixo, a fila e um panorama discreto.
 */

/** Brilho do palco na cor do item. Classes literais. */
const GLOW: Record<Tone, string> = {
  primary: "bg-indigo-400/35",
  secondary: "bg-secondary/45",
  success: "bg-success/35",
  danger: "bg-danger/40",
  previsto: "bg-previsto/40",
  gray: "bg-white/15",
  sky: "bg-sky-500/35",
  violet: "bg-violet-500/40",
  white: "bg-white/20",
};

const ON_DARK: Record<Tone, string> = {
  primary: "text-indigo-200",
  secondary: "text-secondary",
  success: "text-success",
  danger: "text-red-300",
  previsto: "text-orange-300",
  gray: "text-white/60",
  sky: "text-sky-300",
  violet: "text-violet-300",
  white: "text-white",
};

export function SpotlightModel(props: HomeModelProps) {
  const {
    pendingCount,
    stats,
    upcomingPayments,
    outflow,
    pipeline,
    upcomingAppointments,
    actions,
  } = props;
  const now = useNow();
  const [index, setIndex] = useState(0);
  const items = buildPriorities(props, now);
  const loading = isPriorityLoading(props);
  // `index === items.length` é o fechamento ("nada mais").
  const at = Math.min(index, items.length);
  const item = items[at];
  const queue = items.slice(at + 1, at + 5);
  const { columns, total } = usePipeline(pipeline, actions.moveCard);
  const pay = summarizePayments(upcomingPayments);
  const appts = activeAppointments(upcomingAppointments);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Kicker className="flex items-center gap-2 text-secondary">
          <FocusIcon className="h-4 w-4" /> Holofote · um assunto por vez
        </Kicker>
        {items.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-100 tabular-nums">
              {Math.min(at + 1, items.length)} de {items.length}
            </span>
            <div className="flex gap-1">
              {items.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  aria-label={`Ir para ${p.title}`}
                  onClick={() => setIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === at ? "w-6 bg-primary" : i < at ? "w-1.5 bg-primary/40" : "w-1.5 bg-light-gray"
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Palco */}
      <section className="relative isolate min-h-[22rem] overflow-hidden rounded-[2.5rem] bg-primary p-7 text-white sm:p-12">
        <span
          className={`pointer-events-none absolute -top-24 -right-24 -z-10 h-96 w-96 rounded-full blur-[110px] transition-colors duration-700 ${
            item ? GLOW[item.tone] : "bg-success/30"
          }`}
        />
        <span className="pointer-events-none absolute -bottom-32 -left-24 -z-10 h-80 w-80 rounded-full bg-secondary/20 blur-[100px]" />

        {items.length === 0 && loading ? (
          <div className="flex flex-col gap-4" aria-busy="true">
            <div className="h-16 w-16 animate-pulse rounded-3xl bg-white/10" />
            <div className="h-12 w-3/4 animate-pulse rounded-2xl bg-white/10" />
            <div className="h-5 w-1/2 animate-pulse rounded-xl bg-white/10" />
          </div>
        ) : item ? (
          <div key={item.id} className="animate__animated animate__fadeInUp animate__faster flex h-full flex-col">
            <div className="flex items-start justify-between gap-4">
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-3xl bg-white/10 ring-1 ring-white/15">
                <item.icon className={`h-8 w-8 ${ON_DARK[item.tone]}`} />
              </span>
              {item.urgent && (
                <span className="rounded-full bg-danger/20 px-3 py-1 text-[11px] font-medium tracking-wider text-red-200 uppercase">
                  Urgente
                </span>
              )}
            </div>
            <p className={`mt-8 text-xs font-medium tracking-[0.25em] uppercase ${ON_DARK[item.tone]}`}>
              {item.kicker}
              {item.when ? <span className="text-white/50"> · {item.when}</span> : null}
            </p>
            <h1 className="mt-3 text-4xl leading-tight font-light tracking-tight sm:text-5xl">{item.title}</h1>
            <p className="mt-3 max-w-2xl text-lg text-white/70">{item.detail}</p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={item.onAction}
                className="rounded-full bg-secondary px-6 py-3 text-sm font-medium text-white shadow-lg shadow-black/20 transition hover:-translate-y-0.5 active:scale-95"
              >
                {item.actionLabel}
              </button>
              <button
                type="button"
                onClick={() => setIndex(at + 1)}
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-3 text-sm font-medium ring-1 ring-white/15 transition hover:bg-white/20"
              >
                Próximo <ArrowRightIcon className="h-4 w-4" />
              </button>
              {at > 0 && (
                <button
                  type="button"
                  onClick={() => setIndex(at - 1)}
                  aria-label="Anterior"
                  className="grid h-11 w-11 place-items-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
                >
                  <ArrowLeftIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="animate__animated animate__fadeIn flex flex-col items-start">
            <CheckCircleIcon className="h-14 w-14 text-success" />
            <h1 className="mt-6 text-4xl font-light tracking-tight sm:text-5xl">
              {items.length ? "Você passou por tudo." : "Nada pedindo atenção."}
            </h1>
            <p className="mt-3 max-w-xl text-lg text-white/70">
              {items.length
                ? "Sem mais prioridades na fila. Bom momento para adiantar a esteira."
                : "Nenhum lead esperando, nenhum atraso e a agenda livre."}
            </p>
            {loading && <p className="mt-2 text-sm text-white/50">Ainda carregando parte dos dados…</p>}
            <div className="mt-8 flex flex-wrap gap-3">
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIndex(0)}
                  className="rounded-full bg-white/10 px-5 py-3 text-sm font-medium ring-1 ring-white/15 hover:bg-white/20"
                >
                  Recomeçar
                </button>
              )}
              <button
                type="button"
                onClick={actions.newClient}
                className="rounded-full bg-secondary px-6 py-3 text-sm font-medium text-white hover:bg-secondary/90"
              >
                Novo cliente
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Fila */}
      {queue.length > 0 && (
        <section>
          <Kicker className="mb-2 text-gray-100/60">Na fila</Kicker>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {queue.map((p, i) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setIndex(at + 1 + i)}
                  className="flex w-full flex-col rounded-2xl bg-white p-4 text-left ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5"
                >
                  <span className={`text-[10px] font-medium tracking-wider uppercase ${TONE_TEXT[p.tone]}`}>{p.kicker}</span>
                  <span className="mt-1 truncate text-sm font-medium text-primary">{p.title}</span>
                  <span className="truncate text-xs text-gray-100">{p.when ?? p.detail}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Panorama */}
      <section className="grid gap-3 rounded-3xl bg-white p-5 ring-1 ring-black/5 sm:grid-cols-2 lg:grid-cols-5">
        <Figure label="Leads" value={leadsValue(pendingCount)} />
        <Figure label="Compromissos à frente" value={upcomingAppointments === null ? "—" : String(appts.length)} />
        <Figure
          label="Recebimentos"
          value={upcomingPayments.length ? `${pay.overdue.count} / ${pay.upcoming.count}` : "—"}
          hint={upcomingPayments.length ? "atrasados / previstos" : "nenhum previsto"}
        />
        <Figure label="Saídas do mês" value={outflow.slices.length ? money(outflow.total) : "—"} />
        <div>
          <p className="text-[11px] text-gray-100">Esteira · {total}</p>
          <SegmentBar
            className="mt-2 h-2"
            segments={STAGES.map((s) => ({ label: `${s.label}: ${columns[s.key].length}`, value: columns[s.key].length, tone: s.tone }))}
          />
          {total === 0 && <p className="mt-1 text-[11px] text-gray-100/70">Nenhum cliente.</p>}
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4">
        <QuickActions actions={actions} pendingCount={pendingCount} />
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-100">
          {stats.map((s) => (
            <span key={s.title}>
              {s.title}:{" "}
              <span className="font-medium text-primary tabular-nums">
                {s.value}
                {s.total !== undefined ? `/${s.total}` : ""}
              </span>
            </span>
          ))}
          <Illustrative />
        </p>
      </section>
    </div>
  );
}

function Figure({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="text-[11px] text-gray-100">{label}</p>
      <p className="text-2xl font-semibold text-primary tabular-nums">{value}</p>
      {hint && <p className="text-[10px] text-gray-100/70">{hint}</p>}
    </div>
  );
}
