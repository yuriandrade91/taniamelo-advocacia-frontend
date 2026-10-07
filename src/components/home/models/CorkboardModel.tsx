"use client";

import type { ReactNode } from "react";
import { Skeleton } from "@heroui/react";
import { bucketOf } from "@/components/payments/paymentBuckets";
import {
  Illustrative,
  STAGES,
  activeAppointments,
  dayLabel,
  dueLabel,
  firstName,
  leadsValue,
  localTime,
  longDate,
  money,
  plural,
  summarizePayments,
  usePipeline,
  useNow,
} from "./homeKit";
import { financeEmptyText, openPayments } from "./homeKit2";
import type { HomeModelProps } from "./shared";

/**
 * 13 · Mural — o escritório num quadro de cortiça.
 *
 * Lembretes adesivos levemente tortos, fichas pautadas presas com tachinha,
 * fita crepe, uma polaroide com os indicadores e marcas de contagem (||||)
 * para a esteira. Os atalhos viram etiquetas de rotuladora no topo. Passar o
 * mouse endireita o papel.
 */

const PAPER = {
  yellow: "bg-linear-to-b from-[#fff8b8] to-[#ffeb7a] text-[#3d3200]",
  pink: "bg-linear-to-b from-[#ffe0e8] to-[#ffc2d1] text-[#4a1022]",
  blue: "bg-linear-to-b from-[#e3f1ff] to-[#c4e1ff] text-[#0b2a4a]",
  green: "bg-linear-to-b from-[#e6fadf] to-[#c9f0bd] text-[#163d0c]",
  white: "bg-white text-primary",
  kraft: "bg-[#dcc096] text-[#3b2a12]",
} as const;

const PIN = {
  red: "bg-[radial-gradient(circle_at_35%_35%,#ff9a9a,#d62828_55%,#6e0d0d)]",
  blue: "bg-[radial-gradient(circle_at_35%_35%,#9fd2ff,#1d6fd6_55%,#0b2f63)]",
  gold: "bg-[radial-gradient(circle_at_35%_35%,#ffe2a1,#b5843c_55%,#5c3f12)]",
  green: "bg-[radial-gradient(circle_at_35%_35%,#b5f5c4,#1f9d4a_55%,#0b4a1f)]",
} as const;

const TILT = {
  l2: "-rotate-2",
  l1: "-rotate-1",
  r1: "rotate-1",
  r2: "rotate-2",
  none: "rotate-[0.4deg]",
} as const;

function Note({
  paper,
  tilt,
  pin,
  tape = false,
  className = "",
  children,
}: {
  paper: keyof typeof PAPER;
  tilt: keyof typeof TILT;
  pin?: keyof typeof PIN;
  tape?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-7 break-inside-avoid pt-3">
      <article
        className={`relative p-5 shadow-[2px_10px_16px_-6px_rgba(0,0,0,0.5)] transition duration-300 hover:rotate-0 motion-safe:hover:scale-[1.02] motion-reduce:transition-none ${PAPER[paper]} ${TILT[tilt]} ${className}`}
      >
        {pin && (
          <span
            aria-hidden="true"
            className={`absolute -top-2.5 left-1/2 h-5 w-5 -translate-x-1/2 rounded-full shadow-[0_4px_4px_rgba(0,0,0,0.35)] ${PIN[pin]}`}
          />
        )}
        {tape && (
          <span
            aria-hidden="true"
            className="absolute -top-3 left-1/2 h-6 w-24 -translate-x-1/2 -rotate-3 bg-white/55 shadow-[0_1px_2px_rgba(0,0,0,0.15)]"
          />
        )}
        {children}
      </article>
    </div>
  );
}

/** Marcas de contagem: grupos de cinco (quatro traços e um risco). */
function Tally({ count }: { count: number }) {
  const shown = Math.min(count, 25);
  const groups = Math.floor(shown / 5);
  const rest = shown % 5;
  return (
    <span className="inline-flex flex-wrap items-center gap-2" aria-hidden="true">
      {Array.from({ length: groups }, (_, g) => (
        <span key={g} className="relative inline-flex gap-[3px] px-0.5">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="h-4 w-[2px] rounded bg-current opacity-80" />
          ))}
          <span className="absolute top-1/2 -left-0.5 h-[2px] w-[calc(100%+4px)] -rotate-[24deg] rounded bg-current opacity-80" />
        </span>
      ))}
      {rest > 0 && (
        <span className="inline-flex gap-[3px] px-0.5">
          {Array.from({ length: rest }, (_, i) => (
            <span key={i} className="h-4 w-[2px] rounded bg-current opacity-80" />
          ))}
        </span>
      )}
      {count > shown && <span className="text-xs font-medium">+{count - shown}</span>}
    </span>
  );
}

const LABEL_BASE =
  "px-3 py-1.5 font-mono text-[11px] tracking-[0.22em] uppercase shadow-[1px_3px_4px_rgba(0,0,0,0.45)] [text-shadow:0_1px_0_rgba(255,255,255,0.25)] transition motion-safe:hover:-translate-y-0.5";
const LABEL_TAPE = `${LABEL_BASE} bg-zinc-900 text-white hover:bg-primary`;
const LABEL_MAIN = `${LABEL_BASE} bg-secondary text-primary hover:bg-[#c99a52]`;

export function CorkboardModel(props: HomeModelProps) {
  const {
    pendingCount,
    stats,
    canSeeFinance,
    upcomingPayments,
    outflow,
    pendingDocuments,
    pipeline,
    upcomingAppointments,
    periodLabel,
    actions,
  } = props;
  const now = useNow();
  const appts = activeAppointments(upcomingAppointments);
  const pay = summarizePayments(upcomingPayments);
  const open = openPayments(upcomingPayments);
  const { columns, total } = usePipeline(pipeline, actions.moveCard);

  return (
    <section className="relative overflow-hidden rounded-[2rem] border-[10px] border-[#6f4a2a] bg-[#c99d6b] p-4 shadow-[inset_0_0_70px_rgba(60,30,5,0.35)] [background-image:radial-gradient(rgba(90,55,20,0.28)_1px,transparent_1.6px),radial-gradient(rgba(255,240,210,0.18)_1px,transparent_1.6px)] [background-position:0_0,4px_5px] [background-size:7px_7px,11px_11px] sm:p-8">
      {/* Etiquetas de rotuladora */}
      <header className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="-rotate-1 bg-primary px-4 py-2 font-mono text-xs tracking-[0.3em] text-white uppercase shadow-[1px_3px_4px_rgba(0,0,0,0.45)] sm:text-sm">
          Mural · {longDate(now)}
        </h1>
        <nav className="flex flex-wrap items-center gap-2" aria-label="Atalhos">
          <button type="button" onClick={actions.newClient} className={`${LABEL_MAIN} rotate-1`}>
            + Novo cliente
          </button>
          <button type="button" onClick={actions.openClients} className={`${LABEL_TAPE} -rotate-1`}>
            Clientes
          </button>
          <button type="button" onClick={actions.openAgenda} className={`${LABEL_TAPE} rotate-[0.6deg]`}>
            Agenda
          </button>
          <button type="button" onClick={actions.seeAllPayments} className={`${LABEL_TAPE} -rotate-[0.8deg]`}>
            Pagamentos
          </button>
        </nav>
      </header>

      <div className="columns-1 gap-7 sm:columns-2 xl:columns-3">
        {/* Leads */}
        <Note paper="yellow" tilt="l2" pin="red">
          <p className="text-xs font-semibold tracking-widest uppercase opacity-70">Ligar hoje!</p>
          <p className="mt-1 text-7xl leading-none font-semibold tabular-nums">{leadsValue(pendingCount)}</p>
          <p className="mt-2 text-sm">
            {pendingCount === null
              ? "contando os formulários…"
              : `${plural(pendingCount, "pessoa preencheu", "pessoas preencheram")} o formulário e ${plural(pendingCount, "espera", "esperam")} contato.`}
          </p>
          <button
            type="button"
            onClick={actions.openLeads}
            className="mt-4 inline-flex items-center gap-1 bg-[linear-gradient(transparent_60%,rgba(181,132,60,0.45)_60%)] text-sm font-semibold hover:bg-[linear-gradient(transparent_40%,rgba(181,132,60,0.6)_40%)]"
          >
            Ver leads →
          </button>
        </Note>

        {/* Agenda — ficha pautada */}
        <Note paper="white" tilt="r1" pin="blue" className="pl-12">
          <span aria-hidden="true" className="absolute inset-y-0 left-9 w-px bg-rose-300" />
          <div className="[background-image:repeating-linear-gradient(to_bottom,transparent_0,transparent_27px,rgba(14,165,233,0.22)_27px,rgba(14,165,233,0.22)_28px)] leading-7">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold">Agenda</h2>
              <button type="button" onClick={actions.openAgenda} className="text-xs text-secondary hover:underline">
                abrir →
              </button>
            </div>
            {upcomingAppointments === null ? (
              <div className="mt-1 flex flex-col gap-2 py-1" aria-busy="true" aria-label="Carregando">
                <Skeleton className="h-5 w-4/5 rounded" />
                <Skeleton className="h-5 w-3/5 rounded" />
                <Skeleton className="h-5 w-2/3 rounded" />
              </div>
            ) : appts.length === 0 ? (
              <p className="text-sm text-gray-100">Nada marcado. Dia livre!</p>
            ) : (
              <ul className="text-sm">
                {appts.slice(0, 6).map((a) => (
                  <li key={a.id} className="flex min-w-0 gap-2">
                    <span className="shrink-0 font-semibold tabular-nums">{localTime(a.startAt)}</span>
                    <span className="min-w-0 truncate">
                      {a.title}
                      <span className="text-gray-100"> · {dayLabel(a.startAt, now)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Note>

        {/* Recebimentos */}
        <Note paper="blue" tilt="l1" tape>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold">A receber (INSS)</h2>
            <button type="button" onClick={actions.seeAllPayments} className="text-xs font-medium hover:underline">
              ver tudo →
            </button>
          </div>
          {!canSeeFinance || open.length === 0 ? (
            <p className="mt-3 text-sm opacity-70">{financeEmptyText(canSeeFinance)}</p>
          ) : (
            <>
              <ul className="mt-3 flex flex-col gap-1.5 text-sm">
                {open.slice(0, 5).map((p) => {
                  const late = bucketOf(p) === "overdue";
                  return (
                    <li key={p.id} className="flex min-w-0 items-baseline gap-2">
                      <span className={late ? "text-danger" : "opacity-60"}>{late ? "✗" : "•"}</span>
                      <span className="min-w-0 flex-1 truncate">
                        {firstName(p.clientName)} <span className="opacity-60">· {dueLabel(p.dueDate, now)}</span>
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums">{p.amount ? money(p.amount) : "—"}</span>
                    </li>
                  );
                })}
              </ul>
              {pay.overdue.count > 0 && (
                <p className="mt-4 inline-block -rotate-2 rounded-[50%] border-2 border-danger px-3 py-1 text-sm font-semibold text-danger">
                  {money(pay.overdue.amount)} em atraso
                </p>
              )}
            </>
          )}
        </Note>

        {/* Esteira em marcas de contagem */}
        <Note paper="green" tilt="r2" pin="green">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold">Esteira</h2>
            <span className="text-xs font-medium tabular-nums opacity-70">
              {total} {plural(total, "cliente", "clientes")}
            </span>
          </div>
          {total === 0 ? (
            <p className="mt-3 text-sm opacity-70">Nenhum cliente na esteira ainda.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2.5">
              {STAGES.map((s) => {
                const count = columns[s.key].length;
                return (
                  <li key={s.key} className="text-sm">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate">{s.label}</span>
                      <span className="font-semibold tabular-nums">{count}</span>
                    </div>
                    {count > 0 ? <Tally count={count} /> : <span className="text-xs opacity-50">—</span>}
                  </li>
                );
              })}
            </ul>
          )}
          <button type="button" onClick={actions.openClients} className="mt-4 text-xs font-semibold hover:underline">
            abrir clientes →
          </button>
        </Note>

        {/* Polaroide dos indicadores */}
        <Note paper="white" tilt="l1" tape className="pb-3">
          <div className="bg-gradient-brand p-5 text-white">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] tracking-[0.2em] uppercase opacity-80">Indicadores</span>
              <Illustrative dark />
            </div>
            {stats.length === 0 ? (
              <p className="mt-6 text-sm opacity-80">Sem indicadores por enquanto.</p>
            ) : (
              <ul className="mt-4 flex flex-col gap-3">
                {stats.map((s) => (
                  <li key={s.title} className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-xs opacity-80">{s.title}</span>
                    <span className="shrink-0 text-2xl font-light tabular-nums">
                      {s.value}
                      {s.total ? <span className="text-sm opacity-60">/{s.total}</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="mt-3 text-center text-sm text-gray-100 italic">{periodLabel}, até aqui</p>
        </Note>

        {/* Documentos */}
        <Note paper="pink" tilt="r1" pin="gold">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold">Documentos</h2>
            <Illustrative />
          </div>
          {pendingDocuments.length === 0 ? (
            <p className="mt-3 text-sm opacity-70">Nada pendente. Tudo em dia!</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {pendingDocuments.slice(0, 5).map((d) => (
                <li key={d.id} className="min-w-0">
                  <span className="font-semibold">{d.isCritical ? "!! " : ""}{d.name}</span>
                  <span className={`block text-xs ${d.isCritical ? "text-danger" : "opacity-70"}`}>{d.issue}</span>
                </li>
              ))}
            </ul>
          )}
          <button type="button" onClick={actions.openClients} className="mt-4 text-xs font-semibold hover:underline">
            cobrar documentos →
          </button>
        </Note>

        {/* Saídas — papel pardo */}
        <Note paper="kraft" tilt="none" tape>
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-base font-semibold">Saídas de {periodLabel.toLowerCase()}</h2>
            {outflow.slices.length > 0 && <span className="text-sm font-semibold tabular-nums">{money(outflow.total)}</span>}
          </div>
          {!canSeeFinance || outflow.slices.length === 0 ? (
            <p className="mt-3 text-sm opacity-70">
              {canSeeFinance ? "Sem despesas pagas neste mês." : "Despesas visíveis só para administradores."}
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-1 text-sm">
              {outflow.slices.map((s) => (
                <li key={s.label} className="flex items-baseline gap-2">
                  <span className="min-w-0 truncate">{s.label}</span>
                  <span className="mb-1 flex-1 border-b border-dashed border-current opacity-30" />
                  <span className="shrink-0 font-semibold tabular-nums">{s.percentage}%</span>
                </li>
              ))}
            </ul>
          )}
        </Note>
      </div>
    </section>
  );
}
