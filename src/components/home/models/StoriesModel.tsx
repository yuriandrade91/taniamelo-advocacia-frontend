"use client";

import { useEffect, useReducer, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import {
  CalendarIcon,
  DocumentIcon,
  KanbanIcon,
  UsersIcon,
  WalletIcon,
} from "@/components/ui/icons/glyphs";
import {
  Kicker,
  QuickActions,
  STAGES,
  activeAppointments,
  dayLabel,
  dueLabel,
  firstName,
  isOngoingAppt,
  leadsValue,
  localTime,
  money,
  plural,
  relativeTo,
  summarizePayments,
  usePipeline,
  useNow,
  type IconComponent,
} from "./homeKit";
import {
  PauseIcon,
  PlayIcon,
  ReplayIcon,
  financeEmptyText,
  openPayments,
  useReducedMotion,
} from "./homeKit2";
import type { HomeModelProps } from "./shared";

/**
 * 14 · Stories — o dia em cinco telas verticais.
 *
 * Leads, Recebimentos, Agenda, Documentos e Esteira passam sozinhos, com as
 * barrinhas segmentadas no topo. Toque à direita avança, à esquerda volta;
 * o botão (ou espaço) pausa. Com "reduzir movimento" nada passa sozinho.
 * No fim, os atalhos.
 */

const SLIDES: { key: string; label: string; bg: string; icon: IconComponent }[] = [
  { key: "leads", label: "Leads", bg: "bg-linear-to-br from-[#d6a45c] via-secondary to-[#4a3210]", icon: UsersIcon },
  { key: "recebimentos", label: "Recebimentos", bg: "bg-linear-to-br from-emerald-500 via-emerald-700 to-primary", icon: WalletIcon },
  { key: "agenda", label: "Agenda", bg: "bg-linear-to-br from-violet-500 via-indigo-700 to-primary", icon: CalendarIcon },
  { key: "documentos", label: "Documentos", bg: "bg-linear-to-br from-rose-500 via-rose-700 to-primary", icon: DocumentIcon },
  { key: "esteira", label: "Esteira", bg: "bg-linear-to-br from-sky-500 via-sky-700 to-primary", icon: KanbanIcon },
];
const COUNT = SLIDES.length;
const DURATION = 6000;
const STEP = 100;

type State = { index: number; elapsed: number; paused: boolean; done: boolean; seen: number };
type Action =
  | { type: "tick" }
  | { type: "next" }
  | { type: "prev" }
  | { type: "goto"; index: number }
  | { type: "toggle" }
  | { type: "restart" }
  | { type: "finish" };

const INITIAL: State = { index: 0, elapsed: 0, paused: false, done: false, seen: 0 };

function advance(s: State): State {
  if (s.index >= COUNT - 1) return { ...s, done: true, elapsed: 0 };
  const index = s.index + 1;
  return { ...s, index, elapsed: 0, seen: Math.max(s.seen, index) };
}

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "tick": {
      const elapsed = s.elapsed + STEP;
      return elapsed >= DURATION ? advance(s) : { ...s, elapsed };
    }
    case "next":
      return s.done ? s : advance(s);
    case "prev":
      return s.done
        ? { ...s, done: false, index: COUNT - 1, elapsed: 0 }
        : { ...s, index: Math.max(0, s.index - 1), elapsed: 0 };
    case "goto":
      return { ...s, index: a.index, elapsed: 0, done: false, seen: Math.max(s.seen, a.index) };
    case "toggle":
      return { ...s, paused: !s.paused };
    case "restart":
      return { ...INITIAL, seen: s.seen };
    case "finish":
      return { ...s, done: true, elapsed: 0, seen: COUNT - 1 };
  }
}

function Cta({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="pointer-events-auto inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-primary shadow-lg shadow-black/20 transition hover:bg-white/90 active:scale-95 motion-reduce:transform-none"
    >
      {children} <span aria-hidden="true">→</span>
    </button>
  );
}

function Big({ value, caption }: { value: string; caption: string }) {
  return (
    <div>
      <p className="text-8xl leading-none font-extralight tracking-tight tabular-nums">{value}</p>
      <p className="mt-3 text-xl font-light">{caption}</p>
    </div>
  );
}

export function StoriesModel(props: HomeModelProps) {
  const {
    pendingCount,
    canSeeFinance,
    upcomingPayments,
    pendingDocuments,
    pipeline,
    upcomingAppointments,
    periodLabel,
    actions,
  } = props;
  const now = useNow();
  const reduced = useReducedMotion();
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const appts = activeAppointments(upcomingAppointments);
  const pay = summarizePayments(upcomingPayments);
  const open = openPayments(upcomingPayments);
  const { columns, total, max } = usePipeline(pipeline, actions.moveCard);

  const running = !state.paused && !state.done && !reduced;
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => dispatch({ type: "tick" }), STEP);
    return () => window.clearInterval(timer);
  }, [running]);

  const slide = SLIDES[state.index];
  const critical = pendingDocuments.filter((d) => d.isCritical).length;

  const summary: Record<string, string> = {
    leads: pendingCount === null ? "contando…" : `${pendingCount} ${plural(pendingCount, "aguarda", "aguardam")}`,
    recebimentos: !canSeeFinance ? "restrito" : pay.overdue.count ? `${pay.overdue.count} em atraso` : `${pay.upcoming.count} previstos`,
    agenda: upcomingAppointments === null ? "carregando…" : `${appts.length} à frente`,
    documentos: `${pendingDocuments.length} pendentes`,
    esteira: `${total} ${plural(total, "cliente", "clientes")}`,
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight") dispatch({ type: "next" });
    else if (event.key === "ArrowLeft") dispatch({ type: "prev" });
    else if (event.key === " ") {
      event.preventDefault();
      dispatch({ type: "toggle" });
    }
  };

  const renderSlide = (): ReactNode => {
    switch (slide.key) {
      case "leads":
        return (
          <>
            <Big
              value={leadsValue(pendingCount)}
              caption={pendingCount === null ? "contando os formulários…" : `${plural(pendingCount ?? 0, "pessoa aguarda", "pessoas aguardam")} contato`}
            />
            <p className="text-sm text-white/75">
              Preencheram o formulário e ainda não viraram clientes. Quanto antes o retorno, maior a chance de fechar.
            </p>
            <Cta onClick={actions.openLeads}>Ver leads</Cta>
          </>
        );
      case "recebimentos":
        if (!canSeeFinance || open.length === 0)
          return (
            <>
              <Big value="—" caption={financeEmptyText(canSeeFinance)} />
              <span />
              <Cta onClick={actions.seeAllPayments}>Ver pagamentos</Cta>
            </>
          );
        return (
          <>
            <Big
              value={String(pay.overdue.count)}
              caption={`${plural(pay.overdue.count, "recebimento atrasado", "recebimentos atrasados")} · ${money(pay.overdue.amount)}`}
            />
            <ul className="flex flex-col gap-2">
              {open.slice(0, 3).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white/10 px-4 py-2.5 ring-1 ring-white/15 backdrop-blur">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{firstName(p.clientName)}</span>
                    <span className="block text-[11px] text-white/60">{dueLabel(p.dueDate, now)}</span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">{p.amount ? money(p.amount) : "—"}</span>
                </li>
              ))}
            </ul>
            <Cta onClick={actions.seeAllPayments}>Ver pagamentos</Cta>
          </>
        );
      case "agenda": {
        if (upcomingAppointments === null)
          return (
            <>
              <div className="flex flex-col gap-3" aria-busy="true" aria-label="Carregando">
                <span className="h-20 w-40 animate-pulse rounded-2xl bg-white/15 motion-reduce:animate-none" />
                <span className="h-6 w-56 animate-pulse rounded-full bg-white/15 motion-reduce:animate-none" />
              </div>
              <span />
              <Cta onClick={actions.openAgenda}>Abrir agenda</Cta>
            </>
          );
        const [first, ...rest] = appts;
        if (!first)
          return (
            <>
              <Big value="0" caption="compromissos à frente — agenda livre" />
              <span />
              <Cta onClick={actions.openAgenda}>Abrir agenda</Cta>
            </>
          );
        return (
          <>
            <div>
              <p className="text-sm text-white/70">
                {isOngoingAppt(first, now) ? "Acontecendo agora" : `${dayLabel(first.startAt, now)} · ${relativeTo(first.startAt, now)}`}
              </p>
              <p className="mt-1 text-7xl leading-none font-extralight tabular-nums">{localTime(first.startAt)}</p>
              <p className="mt-3 text-xl leading-snug font-light">{first.title}</p>
              <p className="mt-1 text-sm text-white/70">
                {[String(first.type), first.clientName?.trim(), first.modality ? String(first.modality) : undefined]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <ul className="flex flex-col gap-1.5 text-sm">
              {rest.slice(0, 2).map((a) => (
                <li key={a.id} className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-2 ring-1 ring-white/15">
                  <span className="shrink-0 font-semibold tabular-nums">{localTime(a.startAt)}</span>
                  <span className="min-w-0 truncate">{a.title}</span>
                  <span className="ml-auto shrink-0 text-[11px] text-white/60">{dayLabel(a.startAt, now)}</span>
                </li>
              ))}
            </ul>
            <Cta onClick={actions.openAgenda}>Abrir agenda</Cta>
          </>
        );
      }
      case "documentos":
        return (
          <>
            <Big
              value={String(pendingDocuments.length)}
              caption={
                pendingDocuments.length === 0
                  ? "documentos pendentes — tudo em dia"
                  : `${plural(pendingDocuments.length, "documento pendente", "documentos pendentes")}${critical ? ` · ${critical} ${plural(critical, "crítico", "críticos")}` : ""}`
              }
            />
            <ul className="flex flex-col gap-1.5 text-sm">
              {pendingDocuments.slice(0, 3).map((d) => (
                <li key={d.id} className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-2 ring-1 ring-white/15">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${d.isCritical ? "bg-white" : "bg-white/40"}`} />
                  <span className="min-w-0 truncate">{d.name}</span>
                  <span className="ml-auto max-w-[45%] shrink-0 truncate text-[11px] text-white/70">{d.issue}</span>
                </li>
              ))}
              <li className="text-[10px] tracking-widest text-white/50 uppercase">dados ilustrativos</li>
            </ul>
            <Cta onClick={actions.openClients}>Ver clientes</Cta>
          </>
        );
      default:
        return (
          <>
            <Big value={String(total)} caption={`${plural(total, "cliente", "clientes")} na esteira`} />
            {total === 0 ? (
              <p className="text-sm text-white/75">Nenhum cliente na esteira ainda.</p>
            ) : (
              <div className="flex h-32 items-end gap-2">
                {STAGES.map((s) => {
                  const count = columns[s.key].length;
                  return (
                    <div key={s.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
                      <span className="text-xs font-semibold tabular-nums">{count}</span>
                      <span
                        className="w-full rounded-t-lg bg-white/80"
                        style={{ height: `${Math.max(count ? 8 : 2, (count / max) * 100)}%` }}
                      />
                      <span className="w-full truncate text-center text-[9px] text-white/70">{s.short}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <Cta onClick={actions.openClients}>Abrir clientes</Cta>
          </>
        );
    }
  };

  const fillOf = (i: number) => {
    if (state.done || i < state.index) return 100;
    if (i > state.index) return 0;
    return reduced ? 100 : (state.elapsed / DURATION) * 100;
  };

  return (
    <section className="relative isolate overflow-hidden rounded-[2rem] bg-white p-4 ring-1 ring-black/5 sm:p-8">
      <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,1fr)_22rem_minmax(0,1fr)]">
        {/* Bandeja */}
        <div className="min-w-0">
          <Kicker className="text-secondary">Stories · {periodLabel}</Kicker>
          <h1 className="mt-2 text-3xl font-light tracking-tight text-primary">Os destaques de hoje</h1>
          <p className="mt-2 text-sm text-gray-100">
            {reduced ? "Toque nas laterais do cartão para passar." : "Passam sozinhos — toque para avançar, espaço para pausar."}
          </p>
          <ul className="mt-6 flex flex-wrap justify-center gap-4 lg:flex-col lg:justify-start lg:gap-3">
            {SLIDES.map((s, i) => {
              const Icon = s.icon;
              const current = !state.done && i === state.index;
              const seen = i <= state.seen && !current;
              return (
                <li key={s.key}>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "goto", index: i })}
                    aria-current={current ? "step" : undefined}
                    className="group flex flex-col items-center gap-1.5 text-center lg:flex-row lg:gap-3 lg:text-left"
                  >
                    <span
                      className={`rounded-full p-[3px] transition ${
                        seen ? "bg-light-gray" : "bg-linear-to-tr from-secondary via-rose-500 to-violet-600"
                      } ${current ? "scale-110 motion-reduce:scale-100" : ""}`}
                    >
                      <span className="grid h-12 w-12 place-items-center rounded-full bg-white ring-2 ring-white">
                        <span className={`grid h-full w-full place-items-center rounded-full text-white ${s.bg}`}>
                          <Icon className="h-5 w-5" />
                        </span>
                      </span>
                    </span>
                    <span className="min-w-0">
                      <span className={`block text-xs font-medium ${current ? "text-primary" : "text-gray-100"}`}>{s.label}</span>
                      <span className="hidden text-[11px] text-gray-100/70 lg:block">{summary[s.key]}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Cartão */}
        <div className="relative mx-auto w-full max-w-[22rem]">
          <span className={`pointer-events-none absolute inset-6 -z-10 rounded-[2rem] opacity-50 blur-3xl ${state.done ? "bg-primary" : slide.bg}`} />
          <div
            role="region"
            aria-roledescription="stories"
            aria-label={state.done ? "Fim dos destaques" : `${slide.label}, ${state.index + 1} de ${COUNT}`}
            tabIndex={0}
            onKeyDown={onKeyDown}
            className={`relative h-[36rem] overflow-hidden rounded-[2rem] text-white shadow-2xl shadow-primary/30 outline-none focus-visible:ring-4 focus-visible:ring-secondary/50 ${
              state.done ? "bg-gradient-brand" : slide.bg
            }`}
          >
            <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.25),transparent_45%)]" />

            {/* Barrinhas */}
            <div className="absolute inset-x-0 top-0 z-30 flex gap-1 px-3 pt-3">
              {SLIDES.map((s, i) => (
                <span key={s.key} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
                  <span
                    className="block h-full rounded-full bg-white transition-[width] duration-100 ease-linear motion-reduce:transition-none"
                    style={{ width: `${fillOf(i)}%` }}
                  />
                </span>
              ))}
            </div>

            {/* Cabeçalho */}
            <div className="absolute inset-x-0 top-5 z-30 flex items-center gap-2.5 px-4">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-[11px] font-semibold text-primary ring-2 ring-secondary">
                TM
              </span>
              <span className="min-w-0 flex-1 text-xs">
                <span className="block font-semibold">Escritório</span>
                <span className="block text-white/70">{state.done ? "Atalhos" : slide.label}</span>
              </span>
              {!state.done && !reduced && (
                <button
                  type="button"
                  onClick={() => dispatch({ type: "toggle" })}
                  aria-label={state.paused ? "Continuar" : "Pausar"}
                  className="grid h-8 w-8 place-items-center rounded-full bg-white/15 transition hover:bg-white/25"
                >
                  {state.paused ? <PlayIcon className="h-4 w-4" /> : <PauseIcon className="h-4 w-4" />}
                </button>
              )}
              {!state.done && (
                <button
                  type="button"
                  onClick={() => dispatch({ type: "finish" })}
                  className="rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-medium transition hover:bg-white/25"
                >
                  Pular
                </button>
              )}
            </div>

            {/* Zonas de toque */}
            {!state.done && (
              <>
                <button
                  type="button"
                  aria-label="Story anterior"
                  onClick={() => dispatch({ type: "prev" })}
                  className="absolute inset-y-0 left-0 z-10 w-1/3 cursor-w-resize"
                />
                <button
                  type="button"
                  aria-label="Próximo story"
                  onClick={() => dispatch({ type: "next" })}
                  className="absolute inset-y-0 right-0 z-10 w-2/3 cursor-e-resize"
                />
              </>
            )}

            {/* Conteúdo */}
            {state.done ? (
              <div className="animate__animated animate__fadeIn animate__faster relative z-20 flex h-full flex-col justify-between px-6 pt-20 pb-6">
                <div>
                  <p className="text-sm text-white/70">Fim dos destaques</p>
                  <p className="mt-2 text-4xl leading-tight font-extralight">Por onde começamos?</p>
                </div>
                <QuickActions actions={actions} pendingCount={pendingCount} tone="glass" />
                <button
                  type="button"
                  onClick={() => dispatch({ type: "restart" })}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white/10 px-5 py-3 text-sm font-medium ring-1 ring-white/20 transition hover:bg-white/20"
                >
                  <ReplayIcon className="h-4 w-4" /> Rever os destaques
                </button>
              </div>
            ) : (
              <div
                key={slide.key}
                className="animate__animated animate__fadeIn animate__faster pointer-events-none relative z-20 flex h-full flex-col justify-between gap-5 px-6 pt-24 pb-6"
              >
                {renderSlide()}
              </div>
            )}

            {state.paused && !state.done && (
              <span className="pointer-events-none absolute bottom-24 left-1/2 z-30 -translate-x-1/2 rounded-full bg-black/40 px-3 py-1 text-[11px] backdrop-blur">
                pausado
              </span>
            )}
          </div>
        </div>

        {/* Atalhos */}
        <aside className="min-w-0 rounded-3xl bg-page p-5 ring-1 ring-black/5">
          <p className="text-sm font-medium text-primary">Atalhos</p>
          <p className="mt-1 text-xs text-gray-100">Sem esperar o fim dos stories.</p>
          <QuickActions actions={actions} pendingCount={pendingCount} className="mt-4" />
          <ul className="mt-5 flex flex-col gap-2 text-xs text-gray-100">
            {SLIDES.map((s) => (
              <li key={s.key} className="flex items-center justify-between gap-2 border-t border-black/5 pt-2">
                <span>{s.label}</span>
                <span className="font-medium text-primary tabular-nums">{summary[s.key]}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  );
}
