"use client";

import { useState } from "react";
import type { AppointmentResponse } from "@/interfaces/appointment/Appointment.interface";
import { TONE_BG, type Tone } from "@/components/ui/models/viz";
import {
  CalendarIcon,
  ClockIcon,
  DocumentIcon,
  ReceiptIcon,
} from "@/components/ui/icons/glyphs";
import {
  ApptTile,
  BucketPill,
  Empty,
  Illustrative,
  Kicker,
  LinesSkeleton,
  LinkButton,
  LiveDot,
  QuickActions,
  STAGES,
  activeAppointments,
  apptTone,
  clock,
  dueLabel,
  durationLabel,
  groupAppointmentsByDay,
  instantParts,
  isOngoingAppt,
  leadsValue,
  localDay,
  localTime,
  longDate,
  plural,
  relativeTo,
  todayOf,
  tomorrowOf,
  usePipeline,
  useNow,
} from "./homeKit";
import type { HomeModelProps } from "./shared";

/**
 * 6 · Agenda primeiro — o dia como linha do tempo, ocupando a página.
 *
 * Uma régua de horas mostra o que resta de hoje (com a linha do "agora"), a
 * lista do dia marca as janelas livres entre compromissos e, embaixo, os
 * próximos dias. Um seletor troca o resumo pela agenda completa (o cartão de
 * compromissos de verdade, com criação e edição). O resto vai para a lateral.
 */

const TONE_BORDER: Record<Tone, string> = {
  primary: "border-primary",
  secondary: "border-secondary",
  success: "border-success",
  danger: "border-danger",
  previsto: "border-previsto",
  gray: "border-gray-100/40",
  sky: "border-sky-500",
  violet: "border-violet-500",
  white: "border-white",
};

const minutesOf = (date: Date) => date.getHours() * 60 + date.getMinutes();

function freeLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min livres`;
  return m ? `${h}h${String(m).padStart(2, "0")} livres` : `${h}h livres`;
}

export function AgendaFirstModel(props: HomeModelProps) {
  const {
    pendingCount,
    upcomingPayments,
    pendingDocuments,
    pipeline,
    upcomingAppointments,
    appointmentsCard,
    actions,
  } = props;
  const now = useNow();
  const [view, setView] = useState<"resumo" | "completa">("resumo");
  const today = todayOf(now);
  const tomorrow = tomorrowOf(now);
  const appts = activeAppointments(upcomingAppointments);
  const todays = appts.filter((a) => localDay(a.startAt) === today);
  const later = groupAppointmentsByDay(appts.filter((a) => localDay(a.startAt) !== today));
  const next = appts[0];
  const { columns, total } = usePipeline(pipeline, actions.moveCard);

  // Régua: 07h–20h, alargada para caber os compromissos de hoje.
  let startH = 7;
  let endH = 20;
  for (const a of todays) {
    const s = new Date(a.startAt);
    const e = new Date(a.endAt);
    startH = Math.min(startH, s.getHours());
    endH = Math.max(endH, localDay(a.endAt) === today ? Math.ceil(minutesOf(e) / 60) : 24);
  }
  const span = (endH - startH) * 60;
  const pct = (minutes: number) =>
    Math.min(100, Math.max(0, ((minutes - startH * 60) / span) * 100));
  const nowMin = minutesOf(new Date(now));
  const hours = Array.from({ length: endH - startH + 1 }, (_, i) => startH + i);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-4">
        {/* Cabeçalho do dia */}
        <section className="rounded-[2rem] bg-white p-5 ring-1 ring-black/5 sm:p-7">
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Kicker className="flex items-center gap-2 text-secondary">
                <CalendarIcon className="h-4 w-4" /> Agenda
              </Kicker>
              <h1 className="mt-2 text-4xl font-light tracking-tight text-primary">
                Hoje{" "}
                <span className="inline-block text-lg text-gray-100 first-letter:uppercase">· {longDate(now)}</span>
              </h1>
              <p className="mt-1 text-sm text-gray-100">
                {upcomingAppointments === null
                  ? "Carregando a agenda…"
                  : todays.length
                    ? `${todays.length} ${plural(todays.length, "compromisso", "compromissos")} até o fim do dia`
                    : "Nada mais na agenda de hoje."}
              </p>
            </div>
            <div role="tablist" aria-label="Visualização da agenda" className="flex rounded-full bg-page p-1">
              {(["resumo", "completa"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  role="tab"
                  aria-selected={view === v}
                  onClick={() => setView(v)}
                  className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                    view === v ? "bg-primary text-white shadow" : "text-gray-100 hover:text-primary"
                  }`}
                >
                  {v === "resumo" ? "Linha do tempo" : "Agenda completa"}
                </button>
              ))}
            </div>
          </header>

          {view === "resumo" && (
            <div className="mt-7">
              {upcomingAppointments === null ? (
                <LinesSkeleton rows={1} rowClassName="h-14" />
              ) : (
                <div className="relative h-16">
                  <div className="absolute inset-x-0 top-5 h-6 rounded-full bg-page" />
                  {hours.map((h) => (
                    <span
                      key={h}
                      className={`absolute top-0 -translate-x-1/2 text-[10px] text-gray-100/60 tabular-nums ${
                        h % 2 ? "hidden sm:block" : ""
                      }`}
                      style={{ left: `${pct(h * 60)}%` }}
                    >
                      {String(h).padStart(2, "0")}
                    </span>
                  ))}
                  {todays.map((a) => {
                    const s = minutesOf(new Date(a.startAt));
                    const e = localDay(a.endAt) === today ? minutesOf(new Date(a.endAt)) : 24 * 60;
                    return (
                      <span
                        key={a.id}
                        title={`${localTime(a.startAt)} · ${a.title}`}
                        className={`absolute top-5 h-6 rounded-full opacity-90 ring-2 ring-white ${TONE_BG[apptTone(String(a.type))]}`}
                        style={{ left: `${pct(s)}%`, width: `${Math.max(1.5, pct(e) - pct(s))}%` }}
                      />
                    );
                  })}
                  {nowMin >= startH * 60 && nowMin <= endH * 60 && (
                    <span
                      className="absolute top-3 bottom-0 w-0.5 -translate-x-1/2 rounded-full bg-danger"
                      style={{ left: `${pct(nowMin)}%` }}
                    >
                      <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-danger" />
                      <span className="absolute top-full left-1/2 mt-0.5 -translate-x-1/2 text-[10px] font-medium text-danger tabular-nums">
                        {clock(now)}
                      </span>
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {view === "completa" ? (
          <div className="min-w-0">{appointmentsCard}</div>
        ) : (
          <>
            {/* Hoje */}
            <section className="rounded-[2rem] bg-white p-5 ring-1 ring-black/5 sm:p-7">
              <Kicker className="text-gray-100/70">Resto de hoje</Kicker>
              {upcomingAppointments === null ? (
                <LinesSkeleton rows={3} className="mt-4" rowClassName="h-20" />
              ) : todays.length === 0 ? (
                <Empty icon={CalendarIcon} className="mt-4">
                  Nenhum compromisso até o fim do dia.
                </Empty>
              ) : (
                <ol className="mt-4 flex flex-col">
                  {todays.map((a, i) => {
                    const prevEnd = i === 0 ? now : new Date(todays[i - 1].endAt).getTime();
                    const gap = Math.round((new Date(a.startAt).getTime() - prevEnd) / 60_000);
                    return (
                      <li key={a.id}>
                        {gap >= 60 && (
                          <p className="ml-[4.5rem] flex items-center gap-2 py-2 text-[11px] text-success">
                            <span className="h-px w-6 bg-success/40" />
                            {freeLabel(gap)}
                          </p>
                        )}
                        <TimelineRow appointment={a} now={now} />
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>

            {/* Próximos dias */}
            <section className="rounded-[2rem] bg-white p-5 ring-1 ring-black/5 sm:p-7">
              <div className="flex items-center justify-between">
                <Kicker className="text-gray-100/70">Próximos dias</Kicker>
                <LinkButton onClick={actions.openAgenda}>Abrir agenda</LinkButton>
              </div>
              {upcomingAppointments === null ? (
                <LinesSkeleton rows={2} className="mt-4" rowClassName="h-16" />
              ) : later.length === 0 ? (
                <Empty icon={CalendarIcon} className="mt-4">
                  Nada marcado nos próximos dias.
                </Empty>
              ) : (
                <div className="mt-4 flex flex-col gap-5">
                  {later.map(({ day, items }) => {
                    const p = instantParts(items[0].startAt);
                    return (
                      <div key={day} className="flex gap-4">
                        <div className="flex w-14 shrink-0 flex-col items-center rounded-2xl bg-page py-2">
                          <span className="text-[10px] tracking-wider text-gray-100 uppercase">
                            {day === tomorrow ? "Amanhã" : p.weekday}
                          </span>
                          <span className="text-xl font-semibold text-primary tabular-nums">{p.day}</span>
                          <span className="text-[10px] text-gray-100">{p.month}</span>
                        </div>
                        <ul className="flex min-w-0 flex-1 flex-col gap-2">
                          {items.map((a) => (
                            <li key={a.id} className="flex items-center gap-3 rounded-2xl p-2 transition hover:bg-page">
                              <ApptTile type={String(a.type)} size="sm" />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium text-primary">{a.title}</span>
                                <span className="block truncate text-xs text-gray-100">
                                  {String(a.type)}
                                  {a.clientName ? ` · ${a.clientName}` : ""}
                                </span>
                              </span>
                              <span className="shrink-0 text-sm text-primary tabular-nums">{localTime(a.startAt)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* ── Lateral ── */}
      <aside className="flex flex-col gap-4">
        <section className="relative isolate overflow-hidden rounded-[2rem] bg-gradient-brand p-6 text-white">
          <span className="pointer-events-none absolute -top-16 -right-16 -z-10 h-48 w-48 rounded-full bg-secondary/40 blur-3xl" />
          <Kicker className="flex items-center gap-1.5 text-white/70">
            <ClockIcon className="h-3.5 w-3.5" /> Próximo
          </Kicker>
          {upcomingAppointments === null ? (
            <LinesSkeleton dark rows={2} className="mt-4" rowClassName="h-8" />
          ) : next ? (
            <>
              <p className="mt-3 flex items-center gap-2 text-sm text-white/80">
                {isOngoingAppt(next, now) && <LiveDot />}
                {isOngoingAppt(next, now) ? "acontecendo agora" : relativeTo(next.startAt, now)}
              </p>
              <p className="text-5xl font-extralight tracking-tight tabular-nums">{localTime(next.startAt)}</p>
              <p className="mt-3 font-medium">{next.title}</p>
              <p className="text-xs text-white/70">
                {String(next.type)} · {durationLabel(next)}
                {next.clientName ? ` · ${next.clientName}` : ""}
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm text-white/80">Agenda livre.</p>
          )}
        </section>

        <section className="rounded-3xl bg-white p-5 ring-1 ring-black/5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-primary">Leads</p>
            <span className="text-2xl font-semibold text-primary tabular-nums">{leadsValue(pendingCount)}</span>
          </div>
          <p className="text-xs text-gray-100">aguardando o primeiro contato</p>
          <QuickActions actions={actions} pendingCount={pendingCount} className="mt-4" />
        </section>

        <section className="rounded-3xl bg-white p-5 ring-1 ring-black/5">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-medium text-primary">
              <ReceiptIcon className="h-4 w-4 text-secondary" /> Recebimentos
            </p>
            <LinkButton onClick={actions.seeAllPayments}>Todos</LinkButton>
          </div>
          {upcomingPayments.length === 0 ? (
            <p className="mt-3 text-sm text-gray-100/70">Nenhum recebimento previsto.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2.5">
              {upcomingPayments.slice(0, 4).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="min-w-0">
                    <span className="block truncate text-primary">{p.clientName}</span>
                    <span className="text-gray-100">{dueLabel(p.dueDate, now)}</span>
                  </span>
                  <BucketPill payment={p} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-3xl bg-white p-5 ring-1 ring-black/5">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-medium text-primary">
              <DocumentIcon className="h-4 w-4 text-secondary" /> Documentos
            </p>
            <Illustrative />
          </div>
          {pendingDocuments.length === 0 ? (
            <p className="mt-3 text-sm text-gray-100/70">Nenhuma pendência.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {pendingDocuments.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate text-primary">{d.name}</span>
                  <span className={`shrink-0 ${d.isCritical ? "text-danger" : "text-gray-100"}`}>{d.issue}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-3xl bg-white p-5 ring-1 ring-black/5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-primary">Esteira</p>
            <span className="text-xs text-gray-100 tabular-nums">{total}</span>
          </div>
          {total === 0 ? (
            <p className="mt-3 text-sm text-gray-100/70">Nenhum cliente na esteira.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-1.5">
              {STAGES.map((s) => (
                <li key={s.key} className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-2 text-gray-100">
                    <span className={`h-1.5 w-1.5 rounded-full ${TONE_BG[s.tone]}`} />
                    {s.label}
                  </span>
                  <span className="font-medium text-primary tabular-nums">{columns[s.key].length}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </div>
  );
}

function TimelineRow({ appointment: a, now }: { appointment: AppointmentResponse; now: number }) {
  const live = isOngoingAppt(a, now);
  return (
    <div className="flex gap-4">
      <div className="w-14 shrink-0 pt-3 text-right">
        <p className="text-sm font-semibold text-primary tabular-nums">{localTime(a.startAt)}</p>
        <p className="text-[10px] text-gray-100 tabular-nums">{localTime(a.endAt)}</p>
      </div>
      <div
        className={`relative mb-2 flex min-w-0 flex-1 items-center gap-3 rounded-2xl border-l-4 p-3 ${
          live ? "bg-success/5 ring-1 ring-success/30" : "bg-page"
        } ${TONE_BORDER[apptTone(String(a.type))]}`}
      >
        <ApptTile type={String(a.type)} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-primary">{a.title}</p>
          <p className="truncate text-xs text-gray-100">
            {String(a.type)} · {durationLabel(a)}
            {a.modality ? ` · ${String(a.modality)}` : ""}
            {a.clientName ? ` · ${a.clientName}` : ""}
          </p>
        </div>
        <span className="hidden shrink-0 items-center gap-1.5 text-[11px] text-gray-100 sm:inline-flex">
          {live && <LiveDot />}
          {live ? "agora" : relativeTo(a.startAt, now)}
        </span>
      </div>
    </div>
  );
}
