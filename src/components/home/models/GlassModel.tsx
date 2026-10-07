"use client";

import type { ReactNode } from "react";
import { SegmentBar, Legend, toneAt, TONE_BG, TONE_TEXT, type Tone } from "@/components/ui/models/viz";
import {
  AlertIcon,
  CalendarIcon,
  DocumentIcon,
  UsersIcon,
  WalletIcon,
} from "@/components/ui/icons/glyphs";
import {
  ApptTile,
  BucketPill,
  Empty,
  Illustrative,
  Kicker,
  LinesSkeleton,
  LinkButton,
  QuickActions,
  STAGES,
  activeAppointments,
  clock,
  dayLabel,
  dueLabel,
  firstName,
  isOngoingAppt,
  leadsValue,
  localTime,
  longDate,
  money,
  plural,
  relativeTo,
  statRatio,
  summarizePayments,
  usePipeline,
  useNow,
  type IconComponent,
} from "./homeKit";
import { financeEmptyText, openPayments, todayOnly } from "./homeKit2";
import type { HomeModelProps } from "./shared";

/**
 * 12 · Vidro — painéis foscos sobre uma aurora da marca.
 *
 * Fundo claro com uma aurora lenta de dourado, azul e violeta; por cima,
 * placas de vidro fosco (desfoque + saturação + filete de luz no topo). O
 * conteúdo é o de sempre — números, agenda, recebimentos, esteira e
 * documentos — com a leveza de quem olha através.
 */

const GLASS =
  "rounded-3xl bg-white/45 ring-1 ring-white/70 shadow-[0_12px_40px_-14px_rgba(9,13,76,0.28),inset_0_1px_0_rgba(255,255,255,0.85)] backdrop-blur-2xl backdrop-saturate-150";

function Pane({
  title,
  aside,
  className = "",
  children,
}: {
  title: string;
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <article className={`${GLASS} flex min-w-0 flex-col p-5 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-primary">{title}</h2>
        {aside}
      </div>
      <div className="mt-4 min-w-0 flex-1">{children}</div>
    </article>
  );
}

function Orb({ icon: Icon, tone }: { icon: IconComponent; tone: Tone }) {
  return (
    <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/60 ring-1 ring-white shadow-[inset_0_1px_0_white,0_6px_16px_-6px_rgba(9,13,76,0.35)]">
      <span className={`absolute inset-2 rounded-xl opacity-20 blur-md ${TONE_BG[tone]}`} />
      <Icon className={`relative h-5 w-5 ${TONE_TEXT[tone]}`} />
    </span>
  );
}

export function GlassModel(props: HomeModelProps) {
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
  const loadingAppts = upcomingAppointments === null;
  const appts = activeAppointments(upcomingAppointments);
  const today = todayOnly(appts, now);
  const pay = summarizePayments(upcomingPayments);
  const open = openPayments(upcomingPayments);
  const { columns, total, max } = usePipeline(pipeline, actions.moveCard);

  const kpis: { label: string; value: string; hint: string; icon: IconComponent; tone: Tone; onClick: () => void }[] = [
    {
      label: "Leads aguardando",
      value: leadsValue(pendingCount),
      hint: pendingCount === null ? "contando…" : "formulários sem retorno",
      icon: UsersIcon,
      tone: "secondary",
      onClick: actions.openLeads,
    },
    {
      label: "Compromissos hoje",
      value: loadingAppts ? "—" : String(today.length),
      hint: appts[0] ? `próximo ${relativeTo(appts[0].startAt, now)}` : loadingAppts ? "carregando…" : "agenda livre",
      icon: CalendarIcon,
      tone: "violet",
      onClick: actions.openAgenda,
    },
    {
      label: "Clientes na esteira",
      value: String(total),
      hint: `${columns.BENEFICIO_CONCLUIDO.length} com benefício concluído`,
      icon: UsersIcon,
      tone: "sky",
      onClick: actions.openClients,
    },
    {
      label: "Recebimentos atrasados",
      value: canSeeFinance ? String(pay.overdue.count) : "—",
      hint: canSeeFinance ? (pay.overdue.count ? money(pay.overdue.amount) : "nenhum atraso") : "só administradores",
      icon: AlertIcon,
      tone: "danger",
      onClick: actions.seeAllPayments,
    },
  ];

  return (
    <section className="relative isolate overflow-hidden rounded-[2rem] bg-[#eef0f8] p-4 sm:p-8">
      {/* Aurora */}
      <span className="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[140%] w-[140%] -translate-x-1/2 -translate-y-1/2 bg-[conic-gradient(from_90deg,rgba(181,132,60,0.55),rgba(14,165,233,0.4),rgba(124,58,237,0.38),rgba(244,63,94,0.28),rgba(181,132,60,0.55))] opacity-80 blur-[90px] motion-safe:animate-[spin_60s_linear_infinite]" />
      <span className="pointer-events-none absolute -top-24 -left-16 -z-10 h-80 w-80 rounded-full bg-secondary/40 blur-[90px]" />
      <span className="pointer-events-none absolute -right-20 -bottom-24 -z-10 h-96 w-96 rounded-full bg-primary/25 blur-[100px]" />

      {/* Cabeçalho */}
      <header className={`${GLASS} flex flex-wrap items-center justify-between gap-5 p-5 sm:p-6`}>
        <div className="min-w-0">
          <Kicker className="text-secondary">Início · {longDate(now)}</Kicker>
          <h1 className="mt-1.5 text-2xl font-light tracking-tight text-primary sm:text-3xl">
            {periodLabel}, à vista
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-4xl font-extralight text-primary tabular-nums sm:text-5xl">{clock(now)}</span>
          <QuickActions actions={actions} pendingCount={pendingCount} />
        </div>
      </header>

      {/* Números */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <button
            key={k.label}
            type="button"
            onClick={k.onClick}
            className={`${GLASS} group flex items-center gap-4 p-5 text-left transition hover:bg-white/60 motion-safe:hover:-translate-y-0.5`}
          >
            <Orb icon={k.icon} tone={k.tone} />
            <span className="min-w-0">
              <span className="block text-3xl font-light text-primary tabular-nums">{k.value}</span>
              <span className="block truncate text-xs font-medium text-primary/80">{k.label}</span>
              <span className="block truncate text-[11px] text-gray-100">{k.hint}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Agenda */}
        <Pane
          title="Próximos compromissos"
          aside={<LinkButton onClick={actions.openAgenda}>Agenda</LinkButton>}
          className="lg:col-span-2"
        >
          {loadingAppts ? (
            <LinesSkeleton rows={3} rowClassName="h-14" />
          ) : appts.length === 0 ? (
            <Empty icon={CalendarIcon}>Agenda livre — nenhum compromisso à frente.</Empty>
          ) : (
            <ul className="flex flex-col gap-2">
              {appts.slice(0, 4).map((a) => {
                const live = isOngoingAppt(a, now);
                return (
                  <li key={a.id} className="flex items-center gap-3 rounded-2xl bg-white/50 p-3 ring-1 ring-white/80">
                    <span className="w-14 shrink-0 text-center">
                      <span className="block text-lg font-light text-primary tabular-nums">{localTime(a.startAt)}</span>
                      <span className="block text-[10px] text-gray-100">{dayLabel(a.startAt, now)}</span>
                    </span>
                    <ApptTile type={String(a.type)} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-primary">{a.title}</span>
                      <span className="block truncate text-xs text-gray-100">
                        {[String(a.type), a.clientName?.trim()].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span
                      className={`hidden shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium sm:inline ${
                        live ? "bg-success/20 text-emerald-700" : "bg-white/70 text-primary"
                      }`}
                    >
                      {live ? "agora" : relativeTo(a.startAt, now)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Pane>

        {/* Esteira */}
        <Pane title="Esteira" aside={<span className="text-xs text-gray-100 tabular-nums">{total} {plural(total, "cliente", "clientes")}</span>}>
          {total === 0 ? (
            <Empty>Nenhum cliente na esteira ainda.</Empty>
          ) : (
            <ul className="flex flex-col gap-3">
              {STAGES.map((s) => {
                const count = columns[s.key].length;
                return (
                  <li key={s.key}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="truncate text-primary">{s.label}</span>
                      <span className="font-medium text-primary tabular-nums">{count}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/60 ring-1 ring-white/80">
                      <div
                        className={`h-full rounded-full ${TONE_BG[s.tone]} opacity-80 transition-all duration-700 motion-reduce:transition-none`}
                        style={{ width: `${(count / max) * 100}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Pane>

        {/* Recebimentos */}
        <Pane
          title="Recebimentos dos clientes"
          aside={<LinkButton onClick={actions.seeAllPayments}>Pagamentos</LinkButton>}
          className="lg:col-span-2"
        >
          {!canSeeFinance || open.length === 0 ? (
            <Empty icon={WalletIcon}>{financeEmptyText(canSeeFinance)}</Empty>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-danger/10 px-3 py-1 text-danger">
                  {pay.overdue.count} {plural(pay.overdue.count, "atrasado", "atrasados")} · {money(pay.overdue.amount)}
                </span>
                <span className="rounded-full bg-previsto/10 px-3 py-1 text-previsto">
                  {pay.upcoming.count} {plural(pay.upcoming.count, "previsto", "previstos")} · {money(pay.upcoming.amount)}
                </span>
              </div>
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {open.slice(0, 4).map((p) => (
                  <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-white/50 p-3 ring-1 ring-white/80">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-primary">{firstName(p.clientName)}</span>
                      <span className="block truncate text-[11px] text-gray-100">{dueLabel(p.dueDate, now)}</span>
                    </span>
                    <span className="flex flex-col items-end gap-1">
                      <span className="text-sm font-medium text-primary tabular-nums">{p.amount ? money(p.amount) : "—"}</span>
                      <BucketPill payment={p} />
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Pane>

        {/* Documentos */}
        <Pane title="Documentos" aside={<Illustrative />}>
          {pendingDocuments.length === 0 ? (
            <Empty icon={DocumentIcon}>Nenhum documento pendente.</Empty>
          ) : (
            <ul className="flex flex-col gap-2">
              {pendingDocuments.slice(0, 4).map((d) => (
                <li key={d.id} className="flex items-start gap-2.5 rounded-2xl bg-white/50 px-3 py-2.5 ring-1 ring-white/80">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${d.isCritical ? "bg-danger" : "bg-gray-100/40"}`} />
                  <span className="min-w-0 text-xs">
                    <span className="block truncate font-medium text-primary">{d.name}</span>
                    <span className={d.isCritical ? "text-danger" : "text-gray-100"}>{d.issue}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Pane>

        {/* Indicadores */}
        <Pane title="Indicadores" aside={<Illustrative />} className="lg:col-span-1">
          {stats.length === 0 ? (
            <Empty>Sem indicadores por enquanto.</Empty>
          ) : (
            <ul className="flex flex-col gap-3">
              {stats.map((s) => {
                const ratio = statRatio(s);
                return (
                  <li key={s.title}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-xs text-primary">{s.title}</span>
                      <span className="text-sm font-medium text-primary tabular-nums">
                        {s.value}
                        {s.total ? <span className="text-gray-100"> / {s.total}</span> : null}
                      </span>
                    </div>
                    {ratio !== null && (
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/60">
                        <div className="h-full rounded-full bg-secondary" style={{ width: `${ratio * 100}%` }} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Pane>

        {/* Saídas */}
        <Pane
          title={`Saídas de ${periodLabel.toLowerCase()}`}
          aside={outflow.slices.length > 0 ? <span className="text-sm font-medium text-primary tabular-nums">{money(outflow.total)}</span> : undefined}
          className="lg:col-span-2"
        >
          {!canSeeFinance || outflow.slices.length === 0 ? (
            <Empty>{canSeeFinance ? "Sem despesas pagas neste mês." : "Despesas visíveis só para administradores."}</Empty>
          ) : (
            <>
              <SegmentBar
                className="h-3"
                segments={outflow.slices.map((s, i) => ({ label: s.label, value: s.percentage, tone: toneAt(i) }))}
              />
              <Legend
                className="mt-3"
                items={outflow.slices.map((s, i) => ({ label: s.label, tone: toneAt(i), value: `${s.percentage}%` }))}
              />
            </>
          )}
        </Pane>
      </div>
    </section>
  );
}
