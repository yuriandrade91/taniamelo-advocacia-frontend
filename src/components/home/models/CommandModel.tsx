"use client";

import { useEffect } from "react";
import {
  HBarList,
  Legend,
  Meter,
  SegmentBar,
  TONE_BG,
  toneAt,
} from "@/components/ui/models/viz";
import {
  AlertIcon,
  CalendarIcon,
  CheckCircleIcon,
  PulseIcon,
  ReceiptIcon,
} from "@/components/ui/icons/glyphs";
import {
  BUCKET_TONE,
  Empty,
  Illustrative,
  Kicker,
  LinesSkeleton,
  LiveDot,
  STAGES,
  activeAppointments,
  apptTone,
  bucketLabel,
  buildPriorities,
  clock,
  dayLabel,
  dueLabel,
  isOngoingAppt,
  leadsValue,
  localTime,
  longDate,
  money,
  relativeTo,
  statRatio,
  summarizePayments,
  usePipeline,
  useNow,
} from "./homeKit";
import type { HomeModelProps } from "./shared";

/**
 * 3 · Central de comando — o escritório num painel escuro.
 *
 * Fundo azul da marca com grade pontilhada e brilhos, números grandes em
 * vidro, um radar de alertas e atalhos de teclado de verdade (N, L, C, A, P)
 * — ignorados enquanto se digita ou com um diálogo aberto.
 */

type Shortcut = { key: string; label: string; run: () => void };

export function CommandModel(props: HomeModelProps) {
  const {
    pendingCount,
    stats,
    upcomingPayments,
    outflow,
    pipeline,
    upcomingAppointments,
    periodLabel,
    actions,
  } = props;
  const now = useNow(30_000);
  const appts = activeAppointments(upcomingAppointments);
  const pay = summarizePayments(upcomingPayments);
  const { columns, total } = usePipeline(pipeline, actions.moveCard);
  const alerts = buildPriorities(props, now).filter((p) => p.urgent).slice(0, 6);

  const shortcuts: Shortcut[] = [
    { key: "N", label: "Novo cliente", run: actions.newClient },
    { key: "L", label: "Leads", run: actions.openLeads },
    { key: "C", label: "Clientes", run: actions.openClients },
    { key: "A", label: "Agenda", run: actions.openAgenda },
    { key: "P", label: "Pagamentos", run: actions.seeAllPayments },
  ];

  useEffect(() => {
    const map: Record<string, () => void> = {
      n: actions.newClient,
      l: actions.openLeads,
      c: actions.openClients,
      a: actions.openAgenda,
      p: actions.seeAllPayments,
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]')
      )
        return;
      if (document.querySelector('[role="dialog"]')) return;
      const run = map[event.key.toLowerCase()];
      if (run) {
        event.preventDefault();
        run();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [actions]);

  const kpis = [
    { label: "Leads aguardando", value: leadsValue(pendingCount), tone: "secondary" as const, hint: "formulários sem retorno" },
    { label: "Clientes na esteira", value: String(total), tone: "sky" as const, hint: "em todas as etapas" },
    {
      label: "Compromissos à frente",
      value: upcomingAppointments === null ? "—" : String(appts.length),
      tone: "violet" as const,
      hint: appts[0] ? `próximo ${relativeTo(appts[0].startAt, now)}` : "agenda livre",
    },
    {
      label: "Recebimentos atrasados",
      value: String(pay.overdue.count),
      tone: "danger" as const,
      hint: pay.overdue.count ? money(pay.overdue.amount) : "nenhum atraso",
    },
  ];

  const glass = "rounded-3xl bg-white/[0.04] p-5 ring-1 ring-white/10 backdrop-blur-md";

  return (
    <div className="relative isolate overflow-hidden rounded-[2rem] bg-primary p-4 text-white sm:p-8">
      <span className="pointer-events-none absolute inset-0 -z-10 [background-image:radial-gradient(rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:22px_22px]" />
      <span className="pointer-events-none absolute -top-32 -left-24 -z-10 h-96 w-96 rounded-full bg-secondary/25 blur-[110px]" />
      <span className="pointer-events-none absolute top-1/3 -right-32 -z-10 h-[28rem] w-[28rem] rounded-full bg-indigo-500/25 blur-[120px]" />

      {/* Cabeçalho */}
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <Kicker className="flex items-center gap-2 text-secondary">
            <PulseIcon className="h-4 w-4" /> Central de comando
          </Kicker>
          <h1 className="mt-2 text-3xl font-light tracking-tight sm:text-4xl">Painel do escritório</h1>
          <p className="mt-1 flex items-center gap-2 text-xs text-white/50">
            <LiveDot /> <span className="inline-block first-letter:uppercase">{longDate(now)}</span>
          </p>
        </div>
        <p className="font-mono text-5xl font-extralight tracking-tight text-white/90 tabular-nums sm:text-6xl">
          {clock(now)}
        </p>
      </header>

      {/* Barra de comandos */}
      <nav aria-label="Atalhos" className="mt-6 flex flex-wrap gap-2">
        {shortcuts.map((s, i) => (
          <button
            key={s.key}
            type="button"
            onClick={s.run}
            aria-keyshortcuts={s.key}
            className={`group inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs transition active:scale-95 ${
              i === 0
                ? "bg-secondary text-primary hover:bg-secondary/90"
                : "bg-white/5 text-white/80 ring-1 ring-white/10 hover:bg-white/10 hover:text-white"
            }`}
          >
            <kbd
              className={`grid h-5 min-w-5 place-items-center rounded-md px-1 font-mono text-[10px] font-semibold ${
                i === 0 ? "bg-primary/15" : "bg-white/10 text-secondary"
              }`}
            >
              {s.key}
            </kbd>
            {s.label}
          </button>
        ))}
      </nav>

      {/* Indicadores */}
      <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <article key={k.label} className={glass}>
            <p className="flex items-center gap-2 text-[11px] text-white/60">
              <span className={`h-1.5 w-1.5 rounded-full ${TONE_BG[k.tone]}`} />
              {k.label}
            </p>
            <p className="mt-3 font-mono text-4xl font-light tabular-nums sm:text-5xl">{k.value}</p>
            <p className="mt-1 truncate text-[11px] text-white/45">{k.hint}</p>
          </article>
        ))}
      </section>

      {/* Esteira + radar */}
      <section className="mt-3 grid gap-3 lg:grid-cols-3">
        <article className={`${glass} lg:col-span-2`}>
          <div className="flex items-center justify-between">
            <Kicker className="text-white/60">Esteira · fluxo por etapa</Kicker>
            <span className="font-mono text-xs text-white/50 tabular-nums">{total} no total</span>
          </div>
          {total === 0 ? (
            <Empty dark className="mt-4">
              Nenhum cliente na esteira.
            </Empty>
          ) : (
            <div className="mt-5 grid gap-x-8 sm:grid-cols-2">
              <HBarList
                dark
                items={STAGES.slice(0, 3).map((s) => ({ label: s.label, value: columns[s.key].length, tone: s.tone }))}
              />
              <HBarList
                dark
                className="mt-3 sm:mt-0"
                items={STAGES.slice(3).map((s) => ({ label: s.label, value: columns[s.key].length, tone: s.tone }))}
              />
            </div>
          )}
          {total > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-white/10 pt-4 font-mono text-[11px] text-white/50">
              <span>
                conversão para benefício:{" "}
                <span className="text-success">
                  {Math.round(((columns.BENEFICIO_CONCLUIDO.length + columns.BENEFICIO_FUTURO.length) / total) * 100)}%
                </span>
              </span>
              <span>
                em planejamento:{" "}
                <span className="text-secondary">
                  {columns.PLANEJAMENTO_EM_EXECUCAO.length + columns.PLANEJAMENTO_CONCLUIDO.length}
                </span>
              </span>
              <button type="button" onClick={actions.openClients} className="ml-auto text-secondary hover:text-white">
                abrir clientes →
              </button>
            </div>
          )}
        </article>

        <article className={glass}>
          <Kicker className="flex items-center gap-2 text-white/60">
            <AlertIcon className="h-3.5 w-3.5 text-danger" /> Radar
          </Kicker>
          {upcomingAppointments === null || pendingCount === null ? (
            <LinesSkeleton dark rows={3} className="mt-4" rowClassName="h-12" />
          ) : alerts.length === 0 ? (
            <div className="mt-6 flex flex-col items-center gap-2 py-6 text-center text-sm text-white/60">
              <CheckCircleIcon className="h-8 w-8 text-success" />
              Nenhum alerta. Tudo sob controle.
            </div>
          ) : (
            <ul className="mt-4 flex flex-col gap-2">
              {alerts.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={a.onAction}
                    className="flex w-full items-stretch gap-3 rounded-2xl bg-white/5 p-3 text-left ring-1 ring-white/5 transition hover:bg-white/10"
                  >
                    <span className={`w-1 shrink-0 rounded-full ${TONE_BG[a.tone]}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-mono text-[10px] tracking-wider text-white/45 uppercase">
                        {a.kicker}
                        {a.when ? ` · ${a.when}` : ""}
                      </span>
                      <span className="block truncate text-sm">{a.title}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      {/* Agenda, recebimentos, saídas */}
      <section className="mt-3 grid gap-3 lg:grid-cols-3">
        <article className={glass}>
          <div className="flex items-center justify-between">
            <Kicker className="flex items-center gap-2 text-white/60">
              <CalendarIcon className="h-3.5 w-3.5" /> Próximos
            </Kicker>
            <button type="button" onClick={actions.openAgenda} className="text-xs text-secondary hover:text-white">
              agenda →
            </button>
          </div>
          {upcomingAppointments === null ? (
            <LinesSkeleton dark rows={4} className="mt-4" rowClassName="h-9" />
          ) : appts.length === 0 ? (
            <Empty dark icon={CalendarIcon} className="mt-4">
              Nenhum compromisso à frente.
            </Empty>
          ) : (
            <ol className="mt-4 flex flex-col gap-3 border-l border-white/10 pl-4">
              {appts.slice(0, 5).map((a) => (
                <li key={a.id} className="relative">
                  <span className={`absolute top-1.5 -left-[21px] h-2.5 w-2.5 rounded-full ring-4 ring-primary ${TONE_BG[apptTone(String(a.type))]}`} />
                  <p className="flex items-center gap-2 font-mono text-[11px] text-white/50 tabular-nums">
                    {isOngoingAppt(a, now) && <LiveDot />}
                    {dayLabel(a.startAt, now)} · {localTime(a.startAt)}
                  </p>
                  <p className="truncate text-sm">{a.title}</p>
                  <p className="truncate text-[11px] text-white/45">
                    {String(a.type)}
                    {a.clientName ? ` · ${a.clientName}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </article>

        <article className={glass}>
          <div className="flex items-center justify-between">
            <Kicker className="flex items-center gap-2 text-white/60">
              <ReceiptIcon className="h-3.5 w-3.5" /> Recebimentos
            </Kicker>
            <button type="button" onClick={actions.seeAllPayments} className="text-xs text-secondary hover:text-white">
              pagamentos →
            </button>
          </div>
          {upcomingPayments.length === 0 ? (
            <Empty dark icon={ReceiptIcon} className="mt-4">
              Nenhum recebimento previsto.
            </Empty>
          ) : (
            <>
              <SegmentBar
                className="mt-5 h-2.5"
                segments={(["overdue", "upcoming", "paid"] as const).map((b) => ({
                  label: bucketLabel(b),
                  value: pay[b].amount || pay[b].count,
                  tone: BUCKET_TONE[b],
                }))}
              />
              <Legend
                dark
                className="mt-3"
                items={(["overdue", "upcoming", "paid"] as const).map((b) => ({
                  label: bucketLabel(b),
                  tone: BUCKET_TONE[b],
                  value: money(pay[b].amount),
                }))}
              />
              <ul className="mt-4 flex flex-col divide-y divide-white/5">
                {upcomingPayments.slice(0, 4).map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-xs">
                    <span className="min-w-0 truncate">{p.clientName}</span>
                    <span className="shrink-0 font-mono text-white/50 tabular-nums">{dueLabel(p.dueDate, now)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </article>

        <article className={glass}>
          <Kicker className="text-white/60">Saídas · {periodLabel}</Kicker>
          {outflow.slices.length === 0 ? (
            <Empty dark className="mt-4">
              Sem despesas pagas neste mês.
            </Empty>
          ) : (
            <>
              <p className="mt-3 font-mono text-3xl font-light tabular-nums">{money(outflow.total)}</p>
              <HBarList
                dark
                className="mt-4"
                format={(v) => `${v}%`}
                items={outflow.slices.slice(0, 4).map((s, i) => ({ label: s.label, value: s.percentage, tone: toneAt(i) }))}
              />
            </>
          )}
          <div className="mt-5 border-t border-white/10 pt-4">
            <p className="mb-3 flex items-center justify-between text-[11px] text-white/50">
              Indicadores do período <Illustrative dark />
            </p>
            <ul className="flex flex-col gap-2.5">
              {stats.map((s) => (
                <li key={s.title}>
                  <div className="mb-1 flex justify-between text-[11px] text-white/70">
                    <span className="truncate">{s.title}</span>
                    <span className="font-mono tabular-nums">
                      {s.value}
                      {s.total !== undefined ? `/${s.total}` : ""}
                    </span>
                  </div>
                  <Meter value={statRatio(s) ?? 0} tone="secondary" track="bg-white/10" className="h-1.5" />
                </li>
              ))}
            </ul>
          </div>
        </article>
      </section>
    </div>
  );
}
