"use client";

import type { ReactNode } from "react";
import { Skeleton } from "@heroui/react";
import {
  DeltaChip,
  Legend,
  Meter,
  SegmentBar,
  deltaPercent,
} from "@/components/ui/models/viz";
import {
  AGENDA_LABELS,
  AGENDA_TONES,
  FLOW_TONES,
  INTAKE_TONES,
  PAYMENT_LABELS,
  PAYMENT_TONES,
  STAGE_BG,
  FinanceSummary,
  SeriesGate,
  money,
  moneyShort,
  useReport,
  type AgendaRow,
  type FlowRow,
  type IntakeRow,
  type PaymentRow,
} from "./kit";
import type { ReportViewProps } from "./types";

/**
 * Mês a mês — o período do mais recente para trás.
 *
 * Abre com o financeiro em resumo (só para quem pode ver). Depois, cada mês é
 * um cartão no trilho com tudo o que aconteceu nele — primeiro o caixa do
 * escritório e as parcelas dos clientes que venceram, depois cadastros e
 * agenda. Em vez de quatro gráficos separados, a leitura é "o que foi
 * outubro", "o que foi setembro". A esteira como está hoje fecha a página
 * (etapa é retrato, não série mensal).
 */

const MONTHS_LONG = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function monthParts(key: string) {
  const [y, m] = key.split("-").map(Number);
  return { name: MONTHS_LONG[m - 1], year: y };
}

function Cell({
  title,
  basis,
  loading,
  children,
}: {
  title: string;
  basis: string;
  loading: boolean;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-2xl bg-page/70 p-3.5">
      <p className="flex items-baseline justify-between gap-2 text-[11px] text-gray-100">
        <span className="font-medium text-primary">{title}</span>
        <span className="truncate text-gray-100/70">{basis}</span>
      </p>
      <div className="mt-2">
        {loading ? (
          <div className="flex flex-col gap-1.5" role="status" aria-label="Carregando…">
            <Skeleton className="h-5 w-20 rounded" />
            <Skeleton className="h-2 w-full rounded" />
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

const NoData = () => <p className="text-xs text-gray-100/70">Sem dados para mostrar.</p>;

export function MonthByMonthView(props: ReportViewProps) {
  const { canSeeFinance, isLoading, isFinanceLoading } = props;
  const r = useReport(props);

  const flowBy = new Map<string, FlowRow>(r.flow.rows.map((f) => [f.month, f]));
  const payBy = new Map<string, PaymentRow>(r.payments.rows.map((p) => [p.month, p]));
  const intakeBy = new Map<string, IntakeRow>(r.intake.rows.map((i) => [i.month, i]));
  const agendaBy = new Map<string, AgendaRow>(r.agenda.rows.map((a) => [a.month, a]));
  const flowMax = Math.max(1, ...r.flow.rows.flatMap((f) => [f.inflow, f.outflow]));
  const topIntake = r.intake.rows.reduce((best, i) => Math.max(best, i.total), 0);
  const months = [...r.windowKeys].reverse();

  return (
    <div className="flex flex-col gap-6">
      {canSeeFinance && <FinanceSummary r={r} loading={isFinanceLoading} />}

      {/*
        Legenda no topo, à direita, antes dos meses. Pagamentos e agenda usam
        as mesmas três cores (verde, azul, vermelho), então cada cor aparece
        uma vez só, com os dois nomes: "Pago / Concluído" e assim por diante.
      */}
      <Legend
        className="justify-end"
        items={
          canSeeFinance
            ? [
                { label: `${PAYMENT_LABELS.paid} / ${AGENDA_LABELS.completed}`, tone: PAYMENT_TONES.paid },
                { label: `${PAYMENT_LABELS.upcoming} / ${AGENDA_LABELS.scheduled}`, tone: PAYMENT_TONES.upcoming },
                { label: `${PAYMENT_LABELS.overdue} / ${AGENDA_LABELS.cancelled}`, tone: PAYMENT_TONES.overdue },
                { label: "Verificado", tone: INTAKE_TONES.verified },
                { label: "Potencial", tone: INTAKE_TONES.potential },
              ]
            : [
                { label: AGENDA_LABELS.completed, tone: AGENDA_TONES.completed },
                { label: AGENDA_LABELS.scheduled, tone: AGENDA_TONES.scheduled },
                { label: AGENDA_LABELS.cancelled, tone: AGENDA_TONES.cancelled },
                { label: "Verificado", tone: INTAKE_TONES.verified },
                { label: "Potencial", tone: INTAKE_TONES.potential },
              ]
        }
      />

      <div className="relative">
        <span className="absolute top-3 bottom-3 left-[11px] w-px bg-linear-to-b from-secondary via-primary/20 to-transparent sm:left-[15px]" />

        <ol className="flex flex-col gap-6">
          {months.map((key, idx) => {
            const chosen = idx === 0;
            const { name, year } = monthParts(key);
            const f = flowBy.get(key);
            const p = payBy.get(key);
            const i = intakeBy.get(key);
            const a = agendaBy.get(key);
            const negative = !!f && r.flow.hasData && f.outflow > f.inflow;
            const peakIntake = !!i && r.intake.hasData && i.total === topIntake && topIntake > 0;
            return (
              <li key={key} className="relative pl-9 sm:pl-12">
                <span
                  className={`absolute top-5 left-[5px] grid h-3.5 w-3.5 place-items-center rounded-full ring-4 ring-page sm:left-[9px] ${
                    chosen ? "bg-secondary" : "bg-white ring-offset-0 outline-2 outline-primary/25"
                  }`}
                >
                  {chosen && <span className="absolute inset-0 rounded-full bg-secondary motion-safe:animate-halo" />}
                </span>
                <article
                  className={`rounded-3xl p-5 ring-1 transition hover:shadow-xl hover:shadow-primary/5 ${
                    chosen ? "bg-white ring-secondary/40" : "bg-white/70 ring-black/5"
                  }`}
                >
                  <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h3 className="text-xl font-semibold tracking-tight text-primary">
                      {name} <span className="font-light text-gray-100">{year}</span>
                    </h3>
                    {chosen && (
                      <span className="rounded-full bg-secondary/15 px-2.5 py-0.5 text-[11px] font-medium text-secondary">
                        mês escolhido
                      </span>
                    )}
                    {canSeeFinance && negative && (
                      <span className="rounded-full bg-danger/10 px-2.5 py-0.5 text-[11px] font-medium text-danger">
                        saídas &gt; entradas
                      </span>
                    )}
                    {peakIntake && (
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
                        pico de cadastros
                      </span>
                    )}
                  </header>

                  <div className={`mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 ${canSeeFinance ? "xl:grid-cols-4" : ""}`}>
                    {canSeeFinance && (
                      <Cell title="Caixa" basis="por pagamento" loading={isFinanceLoading}>
                        {r.flow.hasData && f ? (
                          <>
                            <p className={`text-lg font-semibold tabular-nums ${f.net < 0 ? "text-danger" : "text-primary"}`}>
                              {money(f.net)}
                            </p>
                            <div className="mt-2 flex flex-col gap-1.5 text-[11px] text-gray-100">
                              <div className="flex items-center gap-2">
                                <span className="w-14 shrink-0">Entradas</span>
                                <Meter value={f.inflow} max={flowMax} tone={FLOW_TONES.inflow} className="flex-1" />
                                <span className="w-16 shrink-0 text-right tabular-nums">{moneyShort(f.inflow)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="w-14 shrink-0">Saídas</span>
                                <Meter value={f.outflow} max={flowMax} tone={FLOW_TONES.outflow} className="flex-1" />
                                <span className="w-16 shrink-0 text-right tabular-nums">{moneyShort(f.outflow)}</span>
                              </div>
                            </div>
                          </>
                        ) : (
                          <NoData />
                        )}
                      </Cell>
                    )}
                    {canSeeFinance && (
                      <Cell title="Parcelas dos clientes" basis="por vencimento" loading={isFinanceLoading}>
                        {r.payments.hasData && p ? (
                          <>
                            <p className="text-lg font-semibold text-primary tabular-nums">{money(p.total)}</p>
                            <SegmentBar
                              className="mt-2 h-2"
                              segments={[
                                { label: PAYMENT_LABELS.paid, value: p.paid, tone: PAYMENT_TONES.paid },
                                { label: PAYMENT_LABELS.upcoming, value: p.upcoming, tone: PAYMENT_TONES.upcoming },
                                { label: PAYMENT_LABELS.overdue, value: p.overdue, tone: PAYMENT_TONES.overdue },
                              ]}
                            />
                            <p className="mt-1.5 text-[11px] text-gray-100 tabular-nums">
                              {p.overdue > 0 ? (
                                <span className="text-danger">{moneyShort(p.overdue)} em atraso</span>
                              ) : (
                                "nada em atraso"
                              )}
                            </p>
                          </>
                        ) : (
                          <NoData />
                        )}
                      </Cell>
                    )}
                    <Cell title="Cadastros" basis="verif. · potencial" loading={isLoading}>
                      {r.intake.hasData && i ? (
                        <>
                          <div className="flex items-center gap-2">
                            <p className="text-lg font-semibold text-primary tabular-nums">{i.total}</p>
                            <DeltaChip value={deltaPercent(i.total, i.average)} />
                          </div>
                          <SegmentBar
                            className="mt-2 h-2"
                            segments={[
                              { label: "Verificado", value: i.verified, tone: INTAKE_TONES.verified },
                              { label: "Potencial", value: i.potential, tone: INTAKE_TONES.potential },
                            ]}
                          />
                          <p className="mt-1.5 text-[11px] text-gray-100 tabular-nums">
                            {i.verified} verificados · {i.potential} potenciais · média 3m {i.average.toLocaleString("pt-BR")}
                          </p>
                        </>
                      ) : (
                        <NoData />
                      )}
                    </Cell>
                    <Cell title="Agenda" basis="por status" loading={isLoading}>
                      {!a ? (
                        <p className="text-xs text-gray-100/70">Fora do ano da agenda ({r.year}).</p>
                      ) : r.agenda.hasData ? (
                        <>
                          <p className="text-lg font-semibold text-primary tabular-nums">
                            {a.total} <span className="text-xs font-normal text-gray-100">compromissos</span>
                          </p>
                          <SegmentBar
                            className="mt-2 h-2"
                            segments={[
                              { label: AGENDA_LABELS.completed, value: a.completed, tone: AGENDA_TONES.completed },
                              { label: AGENDA_LABELS.scheduled, value: a.scheduled, tone: AGENDA_TONES.scheduled },
                              { label: AGENDA_LABELS.cancelled, value: a.cancelled, tone: AGENDA_TONES.cancelled },
                            ]}
                          />
                          <p className="mt-1.5 text-[11px] text-gray-100 tabular-nums">
                            {a.completed} concl. · {a.scheduled} agend. · {a.cancelled} canc.
                          </p>
                        </>
                      ) : (
                        <NoData />
                      )}
                    </Cell>
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Retrato de hoje: a esteira (etapa é retrato, não série mensal). */}
      <article className="rounded-3xl bg-white p-5 ring-1 ring-black/5">
        <header className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold tracking-tight text-primary">Hoje · a esteira</h2>
          <span className="text-[11px] text-gray-100">etapa atual de cada cliente</span>
        </header>
        <div className="mt-3">
          <SeriesGate loading={isLoading} hasData={r.funnel.hasData} empty={r.empty.funnel} loadingClassName="h-16">
            {() => (
              <>
                <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full">
                  {r.funnel.stages.map((s) =>
                    s.count > 0 ? (
                      <span
                        key={s.key}
                        title={`${s.label}: ${s.count}`}
                        className={`${STAGE_BG[s.index]} transition-all duration-700`}
                        style={{ width: `${s.share}%` }}
                      />
                    ) : null,
                  )}
                </div>
                <ol className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-3 lg:grid-cols-6">
                  {r.funnel.stages.map((s) => (
                    <li key={s.key} className="flex min-w-0 items-center gap-1.5 text-gray-100">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${STAGE_BG[s.index]}`} />
                      <span className="truncate">{s.label}</span>
                      <span className="ml-auto font-medium text-primary tabular-nums">{s.count}</span>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </SeriesGate>
        </div>
      </article>
    </div>
  );
}
