"use client";

import type { ReactNode } from "react";
import { SegmentBar } from "@/components/ui/models/viz";
import {
  Illustrative,
  QuickActions,
  STAGES,
  activeAppointments,
  buildPriorities,
  dayLabel,
  isPriorityLoading,
  leadsValue,
  localTime,
  longDate,
  money,
  plural,
  summarizePayments,
  usePipeline,
  useNow,
} from "./homeKit";
import type { HomeModelProps } from "./shared";

/**
 * 10 · Calmo — pouca tinta, muito espaço.
 *
 * Uma coluna estreita, tipografia leve e frases no lugar de cartões. No topo,
 * só as três coisas que importam; depois agenda, esteira, financeiro e
 * documentos, cada um em poucas linhas, separados por filetes quase
 * invisíveis. Nenhuma cor forte além do dourado nos números.
 */
export function CalmModel(props: HomeModelProps) {
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
  const top = buildPriorities(props, now).slice(0, 3);
  const loading = isPriorityLoading(props);
  const appts = activeAppointments(upcomingAppointments);
  const pay = summarizePayments(upcomingPayments);
  const { columns, total } = usePipeline(pipeline, actions.moveCard);
  const words = ["Nada", "Uma coisa", "Duas coisas", "Três coisas"];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-14 px-1 py-6 sm:py-14">
      <header>
        <p className="text-sm text-gray-100/60">
          <span className="inline-block first-letter:uppercase">{longDate(now)}</span>
        </p>
        <h1 className="mt-4 text-4xl leading-tight font-extralight tracking-tight text-primary sm:text-5xl">
          {loading && top.length === 0
            ? "Um instante…"
            : top.length === 0
              ? "Nada pedindo atenção hoje."
              : `${words[top.length]} para hoje.`}
        </h1>

        {top.length > 0 && (
          <ol className="mt-10 flex flex-col gap-8">
            {top.map((p, i) => (
              <li key={p.id} className="flex gap-6">
                <span className="w-6 shrink-0 pt-1 text-2xl font-extralight text-secondary tabular-nums">{i + 1}</span>
                <div className="min-w-0">
                  <p className="text-lg font-light text-primary">{p.title}</p>
                  <p className="mt-1 text-sm text-gray-100/70">
                    {p.detail}
                    {p.when ? ` — ${p.when}` : ""}
                  </p>
                  <button
                    type="button"
                    onClick={p.onAction}
                    className="mt-2 text-sm text-secondary underline decoration-secondary/30 underline-offset-4 transition hover:decoration-secondary"
                  >
                    {p.actionLabel}
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </header>

      <Quiet title="Agenda">
        {upcomingAppointments === null ? (
          <p className="text-gray-100/50">Carregando…</p>
        ) : appts.length === 0 ? (
          <p className="text-gray-100/60">Nenhum compromisso à frente.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {appts.slice(0, 5).map((a) => (
              <li key={a.id} className="flex items-baseline gap-5">
                <span className="w-28 shrink-0 text-sm text-gray-100/60 tabular-nums">
                  {dayLabel(a.startAt, now).replace(/,.*/, "")} · {localTime(a.startAt)}
                </span>
                <span className="min-w-0 truncate font-light text-primary">
                  {a.title}
                  {a.clientName && <span className="text-gray-100/60"> — {a.clientName}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
        <SoftLink onClick={actions.openAgenda}>abrir a agenda</SoftLink>
      </Quiet>

      <Quiet title="Esteira">
        {total === 0 ? (
          <p className="text-gray-100/60">Nenhum cliente na esteira.</p>
        ) : (
          <>
            <p className="leading-relaxed font-light text-primary">
              {total} {plural(total, "cliente", "clientes")} em andamento.{" "}
              <span className="text-gray-100/70">
                {STAGES.filter((s) => columns[s.key].length > 0)
                  .map((s) => `${columns[s.key].length} em ${s.short.toLowerCase()}`)
                  .join(" · ")}
              </span>
            </p>
            <SegmentBar
              className="mt-4 h-1 opacity-70"
              segments={STAGES.map((s) => ({ label: s.label, value: columns[s.key].length, tone: s.tone }))}
            />
          </>
        )}
        <p className="mt-3 text-sm font-light text-gray-100/70">
          <span className="text-secondary tabular-nums">{leadsValue(pendingCount)}</span>{" "}
          {pendingCount === 1 ? "pessoa aguarda" : "pessoas aguardam"} o primeiro contato.
        </p>
        <div className="flex gap-5">
          <SoftLink onClick={actions.openLeads}>ver leads</SoftLink>
          <SoftLink onClick={actions.openClients}>ver clientes</SoftLink>
        </div>
      </Quiet>

      <Quiet title="Financeiro">
        {upcomingPayments.length === 0 ? (
          <p className="text-gray-100/60">Nenhum recebimento previsto para os clientes.</p>
        ) : (
          <p className="leading-relaxed font-light text-primary">
            {pay.overdue.count > 0 ? (
              <>
                <span className="text-danger/80 tabular-nums">{pay.overdue.count}</span>{" "}
                {plural(pay.overdue.count, "recebimento atrasado", "recebimentos atrasados")}
                {pay.overdue.amount > 0 ? `, somando ${money(pay.overdue.amount)}` : ""}.{" "}
              </>
            ) : (
              "Nenhum recebimento atrasado. "
            )}
            <span className="text-secondary tabular-nums">{pay.upcoming.count}</span>{" "}
            {plural(pay.upcoming.count, "previsto", "previstos")}
            {pay.upcoming.amount > 0 ? ` (${money(pay.upcoming.amount)})` : ""}.
          </p>
        )}
        <p className="mt-3 text-sm font-light text-gray-100/70">
          Saídas de {periodLabel.toLowerCase()}:{" "}
          {outflow.slices.length ? (
            <span className="text-primary tabular-nums">{money(outflow.total)}</span>
          ) : (
            "nenhuma despesa paga ainda."
          )}
        </p>
        <SoftLink onClick={actions.seeAllPayments}>ver pagamentos</SoftLink>
      </Quiet>

      <Quiet title="Documentos" illustrative>
        {pendingDocuments.length === 0 ? (
          <p className="text-gray-100/60">Nenhuma pendência de documentação.</p>
        ) : (
          <ul className="flex flex-col gap-2 font-light">
            {pendingDocuments.map((d) => (
              <li key={d.id} className="text-primary">
                {d.name} <span className={d.isCritical ? "text-danger/70" : "text-gray-100/60"}>— {d.issue}</span>
              </li>
            ))}
          </ul>
        )}
      </Quiet>

      <Quiet title="Indicadores" illustrative>
        <ul className="flex flex-col gap-2 font-light">
          {stats.map((s) => (
            <li key={s.title} className="flex items-baseline justify-between gap-4">
              <span className="text-gray-100/70">{s.title}</span>
              <span className="text-primary tabular-nums">
                {s.value}
                {s.total !== undefined && <span className="text-gray-100/40"> de {s.total}</span>}
              </span>
            </li>
          ))}
        </ul>
      </Quiet>

      <footer className="border-t border-black/5 pt-8">
        <QuickActions actions={actions} pendingCount={pendingCount} tone="quiet" className="-ml-4" />
      </footer>
    </div>
  );
}

function Quiet({
  title,
  illustrative = false,
  children,
}: {
  title: string;
  illustrative?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-black/5 pt-8">
      <h2 className="mb-5 flex items-center gap-2 text-[11px] font-normal tracking-[0.3em] text-gray-100/50 uppercase">
        {title}
        {illustrative && <Illustrative />}
      </h2>
      <div className="flex flex-col gap-1">{children}</div>
    </section>
  );
}

function SoftLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 self-start text-sm font-light text-gray-100/60 underline decoration-black/10 underline-offset-4 transition hover:text-primary hover:decoration-primary/40"
    >
      {children}
    </button>
  );
}
