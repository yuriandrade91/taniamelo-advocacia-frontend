"use client";

import type { ReactNode } from "react";
import { Skeleton } from "@heroui/react";
import { bucketOf } from "@/components/payments/paymentBuckets";
import {
  Illustrative,
  STAGES,
  activeAppointments,
  bucketLabel,
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
import { financeEmptyText, openPayments, todayOnly } from "./homeKit2";
import type { HomeModelProps } from "./shared";

/**
 * 17 · Brutalista — neubrutalismo sem pedir desculpas.
 *
 * Bordas pretas grossas, sombras duras deslocadas, cores chapadas e tipo
 * pesado em caixa alta. Os botões "afundam" no clique (a sombra some). Nada
 * de degradê, nada de desfoque: cada bloco diz uma coisa só, bem alto.
 */

const BOX = "border-[3px] border-black shadow-[6px_6px_0_0_#000]";
const BTN =
  "inline-flex items-center gap-2 border-[3px] border-black px-4 py-2 text-xs font-extrabold tracking-wide uppercase shadow-[4px_4px_0_0_#000] transition-[translate,box-shadow] duration-100 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none motion-reduce:transition-none";

const FILL = {
  sky: "bg-[#7ad3ff]",
  violet: "bg-[#c3a6ff]",
  secondary: "bg-secondary",
  primary: "bg-primary",
  previsto: "bg-[#ffb36b]",
  success: "bg-[#7ee081]",
  danger: "bg-[#ff6b6b]",
  gray: "bg-[#d9d9d9]",
  white: "bg-white",
} as const;

function Block({
  title,
  bar,
  aside,
  className = "",
  children,
}: {
  title: string;
  bar: string;
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <article className={`${BOX} flex min-w-0 flex-col bg-white ${className}`}>
      <div className={`flex items-center justify-between gap-3 border-b-[3px] border-black px-4 py-2.5 ${bar}`}>
        <h2 className="text-sm font-black tracking-wide uppercase">{title}</h2>
        {aside}
      </div>
      <div className="min-w-0 flex-1 p-4">{children}</div>
    </article>
  );
}

function Flat({ children }: { children: ReactNode }) {
  return <p className="border-[3px] border-dashed border-black/40 px-4 py-5 text-sm font-bold uppercase">{children}</p>;
}

export function BrutalistModel(props: HomeModelProps) {
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

  const numbers = [
    { label: "Leads esperando", value: leadsValue(pendingCount), bg: "bg-[#ffd23f]", cta: "Ver leads", run: actions.openLeads },
    { label: "Compromissos hoje", value: loadingAppts ? "—" : String(today.length), bg: "bg-[#c3a6ff]", cta: "Agenda", run: actions.openAgenda },
    {
      label: "Recebimentos atrasados",
      value: canSeeFinance ? String(pay.overdue.count) : "—",
      bg: "bg-[#ff8fab]",
      cta: "Pagamentos",
      run: actions.seeAllPayments,
    },
    { label: "Clientes na esteira", value: String(total), bg: "bg-[#7ee081]", cta: "Clientes", run: actions.openClients },
  ];

  const ticker = [
    `${leadsValue(pendingCount)} leads`,
    `${loadingAppts ? "—" : appts.length} compromissos`,
    canSeeFinance ? `${pay.overdue.count} atrasados` : "financeiro restrito",
    `${total} na esteira`,
    `${pendingDocuments.length} documentos`,
  ];

  return (
    <section className="overflow-hidden border-[3px] border-black bg-[#fff4d6] p-4 text-black sm:p-8">
      {/* Cabeçalho */}
      <header className={`${BOX} relative bg-[#ffd23f] p-5 sm:p-7`}>
        <span className="absolute -top-4 right-4 rotate-6 border-[3px] border-black bg-[#ff8fab] px-3 py-1 text-xs font-black uppercase shadow-[3px_3px_0_0_#000]">
          {periodLabel}
        </span>
        <p className="inline-block border-[3px] border-black bg-white px-2 py-0.5 font-mono text-xs font-bold uppercase">
          {longDate(now)}
        </p>
        <h1 className="mt-3 text-6xl leading-[0.9] font-black tracking-tighter uppercase sm:text-8xl">Hoje.</h1>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={actions.newClient} className={`${BTN} bg-primary text-white`}>
            + Novo cliente
          </button>
          <button type="button" onClick={actions.openLeads} className={`${BTN} bg-white`}>
            Leads ({leadsValue(pendingCount)})
          </button>
          <button type="button" onClick={actions.openClients} className={`${BTN} bg-white`}>
            Clientes
          </button>
          <button type="button" onClick={actions.openAgenda} className={`${BTN} bg-white`}>
            Agenda
          </button>
          <button type="button" onClick={actions.seeAllPayments} className={`${BTN} bg-white`}>
            Pagamentos
          </button>
        </div>
      </header>

      {/* Faixa */}
      <p className="mt-6 flex flex-wrap gap-x-4 gap-y-1 border-[3px] border-black bg-black px-4 py-2 text-sm font-black tracking-wide text-[#ffd23f] uppercase">
        {ticker.map((t) => (
          <span key={t} className="whitespace-nowrap">
            ★ {t}
          </span>
        ))}
      </p>

      {/* Números */}
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {numbers.map((n) => (
          <article key={n.label} className={`${BOX} flex flex-col justify-between gap-4 p-5 ${n.bg}`}>
            <p className="text-xs font-black tracking-wide uppercase">{n.label}</p>
            <p className="text-7xl leading-none font-black tabular-nums">{n.value}</p>
            <button type="button" onClick={n.run} className={`${BTN} self-start bg-white`}>
              {n.cta} →
            </button>
          </article>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Agenda */}
        <Block title="Agenda" bar="bg-[#c3a6ff]" aside={<span className="font-mono text-xs font-bold">{loadingAppts ? "…" : appts.length}</span>}>
          {loadingAppts ? (
            <div className="flex flex-col gap-2" aria-busy="true" aria-label="Carregando">
              <Skeleton className="h-12 w-full rounded-none" />
              <Skeleton className="h-12 w-full rounded-none" />
            </div>
          ) : appts.length === 0 ? (
            <Flat>Agenda livre.</Flat>
          ) : (
            <ul className="flex flex-col">
              {appts.slice(0, 5).map((a) => (
                <li key={a.id} className="flex items-center gap-3 border-b-[3px] border-black py-2.5 last:border-b-0">
                  <span className="shrink-0 bg-black px-2 py-1 font-mono text-sm font-bold text-white tabular-nums">{localTime(a.startAt)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-extrabold uppercase">{a.title}</span>
                    <span className="block truncate text-xs font-medium">
                      {dayLabel(a.startAt, now)}
                      {a.clientName ? ` · ${a.clientName}` : ""}
                    </span>
                  </span>
                  <span className="hidden shrink-0 -rotate-2 border-2 border-black bg-[#ffd23f] px-2 py-0.5 text-[10px] font-black uppercase sm:inline">
                    {String(a.type)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Block>

        {/* Recebimentos */}
        <Block
          title="A receber do INSS"
          bar="bg-[#ff8fab]"
          aside={
            <button type="button" onClick={actions.seeAllPayments} className="text-xs font-black uppercase underline decoration-[3px] underline-offset-4">
              Tudo →
            </button>
          }
        >
          {!canSeeFinance || open.length === 0 ? (
            <Flat>{financeEmptyText(canSeeFinance)}</Flat>
          ) : (
            <>
              <ul className="flex flex-col">
                {open.slice(0, 5).map((p) => {
                  const bucket = bucketOf(p);
                  return (
                    <li key={p.id} className="flex items-center gap-3 border-b-[3px] border-black py-2.5 last:border-b-0">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-extrabold uppercase">{firstName(p.clientName)}</span>
                        <span className="block text-xs font-medium">{dueLabel(p.dueDate, now)}</span>
                      </span>
                      <span
                        className={`shrink-0 rotate-2 border-2 border-black px-2 py-0.5 text-[10px] font-black uppercase ${
                          bucket === "overdue" ? "bg-[#ff6b6b]" : "bg-[#ffb36b]"
                        }`}
                      >
                        {bucketLabel(bucket)}
                      </span>
                      <span className="w-20 shrink-0 text-right text-base font-black tabular-nums">{p.amount ? money(p.amount) : "—"}</span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 border-t-[3px] border-black pt-2 text-sm font-black uppercase">
                Em atraso: {money(pay.overdue.amount)} · previsto: {money(pay.upcoming.amount)}
              </p>
            </>
          )}
        </Block>
      </div>

      {/* Esteira */}
      <Block title={`Esteira · ${total} ${plural(total, "cliente", "clientes")}`} bar="bg-[#7ad3ff]" className="mt-6">
        {total === 0 ? (
          <Flat>Nenhum cliente na esteira ainda.</Flat>
        ) : (
          <ul className="flex flex-col gap-3">
            {STAGES.map((s) => {
              const count = columns[s.key].length;
              return (
                <li key={s.key} className="grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-3 sm:grid-cols-[minmax(0,13rem)_1fr_auto]">
                  <span className="truncate text-xs font-extrabold uppercase">
                    <span className="sm:hidden">{s.short}</span>
                    <span className="hidden sm:inline">{s.label}</span>
                  </span>
                  <span className="h-7 border-[3px] border-black bg-white">
                    <span
                      className={`block h-full ${FILL[s.tone]} [background-image:repeating-linear-gradient(45deg,rgba(0,0,0,0.18)_0_2px,transparent_2px_8px)] ${count > 0 && count < max ? "border-r-[3px] border-black" : ""}`}
                      style={{ width: `${(count / max) * 100}%` }}
                    />
                  </span>
                  <span className="min-w-9 bg-black px-2 py-0.5 text-center font-mono text-sm font-bold text-white tabular-nums">{count}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Block>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Documentos */}
        <Block title="Documentos" bar="bg-[#ffd23f]" aside={<Illustrative />}>
          {pendingDocuments.length === 0 ? (
            <Flat>Nada pendente.</Flat>
          ) : (
            <ul className="flex flex-col gap-2">
              {pendingDocuments.slice(0, 5).map((d) => (
                <li key={d.id} className="flex items-start gap-2.5">
                  <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center border-[3px] border-black text-[10px] font-black ${d.isCritical ? "bg-[#ff6b6b]" : "bg-white"}`}>
                    {d.isCritical ? "!" : ""}
                  </span>
                  <span className="min-w-0 text-sm">
                    <span className="block truncate font-extrabold uppercase">{d.name}</span>
                    <span className="block text-xs font-medium">{d.issue}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Block>

        {/* Indicadores */}
        <Block title="Indicadores" bar="bg-[#7ee081]" aside={<Illustrative />}>
          {stats.length === 0 ? (
            <Flat>Sem indicadores.</Flat>
          ) : (
            <ul className="flex flex-col gap-3">
              {stats.map((s, i) => (
                <li
                  key={s.title}
                  className={`border-[3px] border-black p-3 shadow-[3px_3px_0_0_#000] ${i % 2 ? "rotate-1 bg-[#c3a6ff]" : "-rotate-1 bg-[#ffd23f]"}`}
                >
                  <p className="truncate text-[11px] font-black uppercase">{s.title}</p>
                  <p className="text-3xl font-black tabular-nums">
                    {s.value}
                    {s.total ? <span className="text-base">/{s.total}</span> : null}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Block>

        {/* Saídas */}
        <Block
          title={`Saídas · ${periodLabel}`}
          bar="bg-[#ff8fab]"
          aside={outflow.slices.length > 0 ? <span className="text-sm font-black tabular-nums">{money(outflow.total)}</span> : undefined}
        >
          {!canSeeFinance || outflow.slices.length === 0 ? (
            <Flat>{canSeeFinance ? "Sem despesas pagas neste mês." : "Despesas só para administradores."}</Flat>
          ) : (
            <ul className="flex flex-col gap-2">
              {outflow.slices.map((s) => (
                <li key={s.label}>
                  <div className="flex justify-between gap-2 text-xs font-extrabold uppercase">
                    <span className="truncate">{s.label}</span>
                    <span className="tabular-nums">{s.percentage}%</span>
                  </div>
                  <span className="mt-1 block h-4 border-[3px] border-black bg-white">
                    <span className="block h-full bg-black" style={{ width: `${s.percentage}%` }} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Block>
      </div>
    </section>
  );
}
