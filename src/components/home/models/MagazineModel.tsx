"use client";

import type { ReactNode } from "react";
import {
  activeAppointments,
  bucketLabel,
  buildPriorities,
  dayLabel,
  dueLabel,
  Illustrative,
  isPriorityLoading,
  joinPt,
  leadsValue,
  localTime,
  longDate,
  money,
  plural,
  relativeTo,
  STAGES,
  summarizePayments,
  usePipeline,
  useNow,
} from "./homeKit";
import { bucketOf } from "@/components/payments/paymentBuckets";
import type { HomeModelProps } from "./shared";

/**
 * 8 · Revista — a home diagramada como a primeira página de um jornal.
 *
 * Cabeçalho com a data da edição, uma manchete escrita a partir do que mais
 * pede atenção, lide com capitular, colunas separadas por filetes (agenda,
 * financeiro, documentos) e a esteira como um sumário de capítulos.
 */
export function MagazineModel(props: HomeModelProps) {
  const {
    pendingCount,
    stats,
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
  const next = appts[0];
  const pay = summarizePayments(upcomingPayments);
  const { columns, total } = usePipeline(pipeline, actions.moveCard);
  const top = buildPriorities(props, now)[0];
  const loading = isPriorityLoading(props);

  const date = new Date(now);
  const edition = Math.floor(
    (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 0)) /
      86_400_000,
  );

  let headline: string;
  let cta: { label: string; run: () => void } | null = null;
  if (loading) {
    headline = "A edição de hoje está sendo montada…";
  } else if (top?.kind === "lead" && pendingCount) {
    headline = `${pendingCount} ${plural(pendingCount, "pessoa espera", "pessoas esperam")} o primeiro contato`;
    cta = { label: "Ler os leads", run: actions.openLeads };
  } else if (top?.kind === "overdue") {
    headline = `${pay.overdue.count} ${plural(pay.overdue.count, "recebimento atrasado pede", "recebimentos atrasados pedem")} atenção`;
    cta = { label: "Ver pagamentos", run: actions.seeAllPayments };
  } else if (top?.kind === "appointment" && next) {
    headline = `${next.title}, ${relativeTo(next.startAt, now)}`;
    cta = { label: "Abrir a agenda", run: actions.openAgenda };
  } else if (top) {
    headline = `${top.kicker}: ${top.title}`;
    cta = { label: top.actionLabel, run: top.onAction };
  } else {
    headline = `Dia tranquilo: ${total} ${plural(total, "cliente segue", "clientes seguem")} na esteira`;
    cta = { label: "Ver clientes", run: actions.openClients };
  }

  const nextDay = next ? dayLabel(next.startAt, now) : "";
  const nextWhen = nextDay === "Hoje" || nextDay === "Amanhã" ? nextDay.toLowerCase() : `em ${nextDay}`;
  const lead: string[] = [];
  if (upcomingAppointments !== null) {
    lead.push(
      appts.length
        ? `a agenda tem ${appts.length} ${plural(appts.length, "compromisso", "compromissos")} pela frente${next ? `, o primeiro ${nextWhen} às ${localTime(next.startAt)}` : ""}`
        : "a agenda está livre",
    );
  }
  if (upcomingPayments.length) {
    lead.push(
      `${pay.upcoming.count} ${plural(pay.upcoming.count, "recebimento previsto", "recebimentos previstos")} para os clientes`,
    );
  }
  if (pendingDocuments.length) {
    lead.push(
      `${pendingDocuments.length} ${plural(pendingDocuments.length, "pendência", "pendências")} de documentação`,
    );
  }
  const leadText = lead.length
    ? `${joinPt(lead).replace(/^./, (c) => c.toUpperCase())}.`
    : "Sem novidades por enquanto.";

  const numbers = [
    { label: "Leads", value: leadsValue(pendingCount) },
    { label: "Na esteira", value: String(total) },
    { label: "Compromissos", value: upcomingAppointments === null ? "—" : String(appts.length) },
    { label: "Atrasados", value: String(pay.overdue.count) },
  ];

  return (
    <article className="rounded-[2rem] bg-white px-5 py-6 ring-1 ring-black/5 sm:px-10 sm:py-8">
      {/* Cabeçalho da edição */}
      <header className="border-b-4 border-double border-primary/80 pb-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2 text-[11px] tracking-[0.2em] text-gray-100 uppercase">
          <span>Edição nº {edition}</span>
          <span className="inline-block first-letter:uppercase">{longDate(now)}</span>
        </div>
        <p className="mt-3 text-center text-3xl font-semibold tracking-tight text-primary sm:text-5xl">
          O Diário do Escritório
        </p>
        <p className="mt-1 text-center text-[11px] tracking-[0.3em] text-secondary uppercase">
          Previdenciário · {periodLabel}
        </p>
      </header>

      {/* Manchete */}
      <section className="grid gap-8 border-b border-black/10 py-8 lg:grid-cols-[2fr_1fr]">
        <div>
          <p className="text-[11px] font-medium tracking-[0.25em] text-secondary uppercase">Manchete</p>
          <h1 className="mt-3 text-4xl leading-[1.05] font-light tracking-tight text-primary sm:text-6xl">
            {headline}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-gray-100 first-letter:float-left first-letter:mt-1 first-letter:mr-3 first-letter:text-6xl first-letter:leading-[0.8] first-letter:font-semibold first-letter:text-secondary">
            {leadText}
          </p>
          {cta && (
            <button
              type="button"
              onClick={cta.run}
              className="mt-6 border-b-2 border-secondary pb-0.5 text-sm font-medium text-primary transition hover:border-primary"
            >
              {cta.label} →
            </button>
          )}
        </div>

        <aside className="lg:border-l lg:border-black/10 lg:pl-8">
          <p className="text-[11px] font-medium tracking-[0.25em] text-gray-100 uppercase">Em números</p>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-5">
            {numbers.map((n) => (
              <div key={n.label} className="border-t border-black/10 pt-2">
                <dt className="text-[11px] tracking-wider text-gray-100 uppercase">{n.label}</dt>
                <dd className="text-4xl font-extralight text-primary tabular-nums">{n.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 text-[11px] tracking-wider text-gray-100 uppercase">
            Saídas do mês{" "}
            <span className="ml-1 text-sm font-medium tracking-normal text-primary normal-case tabular-nums">
              {outflow.slices.length ? money(outflow.total) : "sem despesas pagas"}
            </span>
          </p>
        </aside>
      </section>

      {/* Colunas */}
      <section className="grid gap-8 py-8 md:grid-cols-3 md:gap-0 md:divide-x md:divide-black/10">
        <div className="md:pr-6">
          <ColumnTitle>Agenda</ColumnTitle>
          {upcomingAppointments === null ? (
            <p className="mt-3 text-sm text-gray-100/70">Carregando…</p>
          ) : appts.length === 0 ? (
            <p className="mt-3 text-sm text-gray-100/70 italic">Nenhum compromisso à frente.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-4">
              {appts.slice(0, 4).map((a) => (
                <li key={a.id}>
                  <p className="text-[11px] tracking-wider text-secondary uppercase tabular-nums">
                    {dayLabel(a.startAt, now)} · {localTime(a.startAt)}
                  </p>
                  <p className="mt-0.5 leading-snug font-medium text-primary">{a.title}</p>
                  <p className="text-xs text-gray-100">
                    {String(a.type)}
                    {a.clientName ? `, com ${a.clientName}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <MoreLink onClick={actions.openAgenda}>Toda a agenda</MoreLink>
        </div>

        <div className="md:px-6">
          <ColumnTitle>Financeiro</ColumnTitle>
          <p className="mt-1 text-[11px] text-gray-100 italic">O que o INSS paga aos clientes.</p>
          {upcomingPayments.length === 0 ? (
            <p className="mt-3 text-sm text-gray-100/70 italic">Nenhum recebimento previsto.</p>
          ) : (
            <ul className="mt-3 flex flex-col divide-y divide-black/5">
              {upcomingPayments.slice(0, 5).map((p) => {
                const bucket = bucketOf(p);
                return (
                  <li key={p.id} className="flex items-baseline justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-primary">{p.clientName}</span>
                      <span className={`text-[11px] ${bucket === "overdue" ? "text-danger" : "text-gray-100"}`}>
                        {bucketLabel(bucket)} · {dueLabel(p.dueDate, now)}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm text-primary tabular-nums">
                      {p.amount ? money(p.amount) : "—"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          <MoreLink onClick={actions.seeAllPayments}>Todos os pagamentos</MoreLink>
        </div>

        <div className="md:pl-6">
          <ColumnTitle>
            Documentos <Illustrative />
          </ColumnTitle>
          {pendingDocuments.length === 0 ? (
            <p className="mt-3 text-sm text-gray-100/70 italic">Nenhuma pendência de documentação.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {pendingDocuments.map((d) => (
                <li key={d.id}>
                  <p className="leading-snug font-medium text-primary">{d.name}</p>
                  <p className={`text-xs ${d.isCritical ? "text-danger" : "text-gray-100"}`}>
                    {d.isCritical ? "Urgente — " : ""}
                    {d.issue}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-6 border-t border-black/10 pt-4">
            <p className="flex items-center gap-2 text-[11px] tracking-[0.2em] text-gray-100 uppercase">
              Indicadores <Illustrative />
            </p>
            <ul className="mt-2 flex flex-col gap-1">
              {stats.map((s) => (
                <li key={s.title} className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="text-gray-100">{s.title}</span>
                  <span className="text-primary tabular-nums">
                    {s.value}
                    {s.total !== undefined ? ` de ${s.total}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Sumário: a esteira */}
      <section className="border-t border-black/10 pt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <ColumnTitle>Sumário da esteira</ColumnTitle>
          <span className="text-xs text-gray-100 italic">
            {total} {plural(total, "cliente", "clientes")} em seis capítulos
          </span>
        </div>
        {total === 0 ? (
          <p className="mt-4 text-sm text-gray-100/70 italic">Nenhum cliente na esteira ainda.</p>
        ) : (
          <ol className="mt-4 grid gap-x-10 gap-y-3 md:grid-cols-2">
            {STAGES.map((s, i) => (
              <li key={s.key} className="flex items-baseline gap-3">
                <span className="text-sm font-semibold text-secondary tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-primary">{s.label}</span>
                <span className="mb-1 min-w-6 flex-1 border-b border-dotted border-gray-100/40" />
                <span className="text-lg font-light text-primary tabular-nums">{columns[s.key].length}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Leia também */}
      <footer className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-t-4 border-double border-primary/80 pt-4 text-sm">
        <span className="text-[11px] tracking-[0.25em] text-gray-100 uppercase">Leia também</span>
        <button type="button" onClick={actions.newClient} className="text-primary underline-offset-4 hover:underline">
          Cadastrar novo cliente
        </button>
        <button type="button" onClick={actions.openLeads} className="text-primary underline-offset-4 hover:underline">
          Leads ({leadsValue(pendingCount)})
        </button>
        <button type="button" onClick={actions.openClients} className="text-primary underline-offset-4 hover:underline">
          Todos os clientes
        </button>
        <button type="button" onClick={actions.openAgenda} className="text-primary underline-offset-4 hover:underline">
          Agenda
        </button>
        <button type="button" onClick={actions.seeAllPayments} className="text-primary underline-offset-4 hover:underline">
          Pagamentos
        </button>
      </footer>
    </article>
  );
}

function ColumnTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 border-b-2 border-primary pb-1 text-sm font-semibold tracking-[0.2em] text-primary uppercase">
      {children}
    </h2>
  );
}

function MoreLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-4 text-xs font-medium text-secondary italic hover:text-primary"
    >
      {children} →
    </button>
  );
}
