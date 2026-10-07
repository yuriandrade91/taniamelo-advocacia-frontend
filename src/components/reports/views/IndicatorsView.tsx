"use client";

import type { ReactNode } from "react";
import { Skeleton } from "@heroui/react";
import {
  BarChart,
  DeltaChip,
  HBarList,
  Legend,
  LineChart,
  SegmentBar,
  Sparkline,
  deltaPercent,
  type Tone,
} from "@/components/ui/models/viz";
import { SparkleIcon } from "@/components/ui/icons/glyphs";
import {
  AGENDA_LABELS,
  AGENDA_TONES,
  FLOW_TONES,
  INTAKE_TONES,
  PAYMENT_LABELS,
  PAYMENT_TONES,
  SeriesGate,
  money,
  moneyShort,
  useReport,
} from "./kit";
import type { ReportViewProps } from "./types";

/**
 * Indicadores — o painel de diretoria.
 *
 * Uma faixa de indicadores no topo, cada um com o valor do mês, a variação
 * contra o mês anterior e a linha dos 6 meses; logo abaixo, as frases de
 * destaque. Os gráficos grandes vêm depois, para quem quer o detalhe: primeiro
 * o número, depois a explicação. Em cada camada o financeiro vem antes de
 * clientes e agenda — indicadores, destaques e gráficos.
 */

type Kpi = {
  label: string;
  value: string;
  delta: number | null;
  invert?: boolean;
  spark: readonly number[];
  tone: Tone;
  loading: boolean;
  hasData: boolean;
  foot: string;
};

function KpiCard({ kpi }: { kpi: Kpi }) {
  return (
    <div className="group flex min-w-0 flex-col justify-between rounded-2xl bg-white p-4 ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5 motion-reduce:hover:translate-y-0">
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-xs text-gray-100">{kpi.label}</p>
        {!kpi.loading && kpi.hasData && <DeltaChip value={kpi.delta} invert={kpi.invert} />}
      </div>
      {kpi.loading ? (
        <div className="mt-3 flex flex-col gap-2" role="status" aria-label="Carregando…">
          <Skeleton className="h-7 w-24 rounded-lg" />
          <Skeleton className="h-8 w-full rounded-lg" />
        </div>
      ) : kpi.hasData ? (
        <>
          <p className="mt-2 truncate text-2xl font-semibold tracking-tight text-primary tabular-nums">{kpi.value}</p>
          <Sparkline values={kpi.spark} tone={kpi.tone} height={32} className="mt-2" />
          <p className="mt-1 text-[10px] text-gray-100/70">{kpi.foot}</p>
        </>
      ) : (
        <p className="mt-3 text-xs text-gray-100/70">Sem dados para mostrar.</p>
      )}
    </div>
  );
}

function Panel({
  title,
  basis,
  children,
  className = "",
}: {
  title: string;
  basis?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`flex min-w-0 flex-col gap-4 rounded-3xl bg-white p-5 ring-1 ring-black/5 sm:p-6 ${className}`}>
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium text-primary">{title}</h3>
        {basis && <span className="text-[11px] text-gray-100">{basis}</span>}
      </header>
      {children}
    </section>
  );
}

export function IndicatorsView(props: ReportViewProps) {
  const { canSeeFinance, isLoading, isFinanceLoading } = props;
  const r = useReport(props);
  const vsPrev = `vs ${r.prevShort}`;

  const financeKpis: Kpi[] = canSeeFinance
    ? [
        {
          label: "Entradas do mês",
          value: money(r.flow.current.inflow),
          delta: deltaPercent(r.flow.current.inflow, r.flow.previous.inflow),
          spark: r.flow.rows.map((f) => f.inflow),
          tone: FLOW_TONES.inflow,
          loading: isFinanceLoading,
          hasData: r.flow.hasData,
          foot: vsPrev,
        },
        {
          label: "Saídas do mês",
          value: money(r.flow.current.outflow),
          delta: deltaPercent(r.flow.current.outflow, r.flow.previous.outflow),
          invert: true,
          spark: r.flow.rows.map((f) => f.outflow),
          tone: FLOW_TONES.outflow,
          loading: isFinanceLoading,
          hasData: r.flow.hasData,
          foot: vsPrev,
        },
        {
          label: "Saldo acumulado",
          value: money(r.flow.balance),
          delta: deltaPercent(r.flow.current.cumulative, r.flow.previous.cumulative),
          spark: r.flow.rows.map((f) => f.cumulative),
          tone: FLOW_TONES.balance,
          loading: isFinanceLoading,
          hasData: r.flow.hasData,
          foot: `em ${r.windowLabel}`,
        },
        {
          label: "Pago aos clientes",
          value: money(r.payments.current.paid),
          delta: deltaPercent(r.payments.current.paid, r.payments.previous.paid),
          spark: r.payments.rows.map((p) => p.paid),
          tone: PAYMENT_TONES.paid,
          loading: isFinanceLoading,
          hasData: r.payments.hasData,
          foot: `vence em ${r.monthShort} · ${vsPrev}`,
        },
      ]
    : [];

  const clientKpis: Kpi[] = [
    {
      label: "Cadastros no mês",
      value: String(r.intake.current.total),
      delta: r.intake.previous ? deltaPercent(r.intake.current.total, r.intake.previous.total) : null,
      spark: r.intake.rows.map((i) => i.total),
      tone: INTAKE_TONES.verified,
      loading: isLoading,
      hasData: r.intake.hasData,
      foot: vsPrev,
    },
    {
      label: "Compromissos no mês",
      value: String(r.agenda.current.total),
      delta: r.agenda.previous ? deltaPercent(r.agenda.current.total, r.agenda.previous.total) : null,
      spark: r.agenda.rows.map((a) => a.total),
      tone: "sky",
      loading: isLoading,
      hasData: r.agenda.hasData,
      foot: `${r.agenda.sum.total} no ano`,
    },
  ];

  const kpis = [...financeKpis, ...clientKpis];
  const insights = [...(canSeeFinance ? r.insights.finance : []), ...r.insights.clients].slice(0, 6);
  const insightsLoading = isLoading || (canSeeFinance && isFinanceLoading);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium tracking-[0.2em] text-secondary uppercase">Indicadores</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-primary">{r.monthTitle}</h2>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs text-gray-100 ring-1 ring-black/5 tabular-nums">
          Janela {r.windowLabel}
        </span>
      </header>

      <div className={`grid grid-cols-2 gap-3 ${canSeeFinance ? "md:grid-cols-3 xl:grid-cols-6" : "md:grid-cols-2"}`}>
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} kpi={kpi} />
        ))}
      </div>

      <section className="relative overflow-hidden rounded-3xl bg-white p-5 ring-1 ring-black/5 sm:p-6">
        <span className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-brand" />
        <h3 className="flex items-center gap-2 text-sm font-medium text-primary">
          <SparkleIcon className="h-4 w-4 text-secondary" /> Destaques do período
        </h3>
        {insightsLoading ? (
          <div className="mt-4 grid gap-2 md:grid-cols-2" role="status" aria-label="Carregando…">
            <Skeleton className="h-4 w-3/4 rounded" />
            <Skeleton className="h-4 w-2/3 rounded" />
            <Skeleton className="h-4 w-1/2 rounded" />
          </div>
        ) : insights.length ? (
          <ul className="mt-4 grid gap-x-8 gap-y-2.5 md:grid-cols-2">
            {insights.map((text) => (
              <li key={text} className="flex gap-2.5 text-sm text-gray-100">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" />
                {text}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-gray-100">Sem dados suficientes para destacar algo neste período.</p>
        )}
      </section>

      {canSeeFinance && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Panel title="Carteira · entradas e saídas" basis="por pagamento" className="lg:col-span-2">
            <SeriesGate loading={isFinanceLoading} hasData={r.flow.hasData} empty={r.empty.flow} loadingClassName="h-56">
              {() => (
                <>
                  <Legend
                    items={[
                      { label: "Entradas", tone: FLOW_TONES.inflow, value: moneyShort(r.flow.sum.inflow) },
                      { label: "Saídas", tone: FLOW_TONES.outflow, value: moneyShort(r.flow.sum.outflow) },
                    ]}
                  />
                  <BarChart
                    labels={r.flow.rows.map((f) => f.label)}
                    series={[
                      { label: "Entradas", values: r.flow.rows.map((f) => f.inflow), tone: FLOW_TONES.inflow },
                      { label: "Saídas", values: r.flow.rows.map((f) => f.outflow), tone: FLOW_TONES.outflow },
                    ]}
                    height={200}
                    format={money}
                  />
                </>
              )}
            </SeriesGate>
          </Panel>
          <Panel title="Saldo acumulado" basis="por pagamento">
            <SeriesGate loading={isFinanceLoading} hasData={r.flow.hasData} empty={r.empty.flow} loadingClassName="h-56">
              {() => (
                <>
                  <p className="text-3xl font-semibold tracking-tight text-primary tabular-nums">{money(r.flow.balance)}</p>
                  <LineChart
                    labels={r.flow.rows.map((f) => f.label)}
                    series={[{ label: "Acumulado", values: r.flow.rows.map((f) => f.cumulative), tone: FLOW_TONES.balance }]}
                    area
                    height={150}
                    format={moneyShort}
                  />
                </>
              )}
            </SeriesGate>
          </Panel>
          <Panel title="Pagamentos aos clientes" basis="por vencimento" className="lg:col-span-2">
            <SeriesGate loading={isFinanceLoading} hasData={r.payments.hasData} empty={r.empty.payments} loadingClassName="h-56">
              {() => (
                <>
                  <Legend
                    items={[
                      { label: PAYMENT_LABELS.overdue, tone: PAYMENT_TONES.overdue, value: moneyShort(r.payments.sum.overdue) },
                      { label: PAYMENT_LABELS.upcoming, tone: PAYMENT_TONES.upcoming, value: moneyShort(r.payments.sum.upcoming) },
                      { label: PAYMENT_LABELS.paid, tone: PAYMENT_TONES.paid, value: moneyShort(r.payments.sum.paid) },
                    ]}
                  />
                  <BarChart
                    stacked
                    labels={r.payments.rows.map((p) => p.label)}
                    series={[
                      { label: PAYMENT_LABELS.paid, values: r.payments.rows.map((p) => p.paid), tone: PAYMENT_TONES.paid },
                      { label: PAYMENT_LABELS.upcoming, values: r.payments.rows.map((p) => p.upcoming), tone: PAYMENT_TONES.upcoming },
                      { label: PAYMENT_LABELS.overdue, values: r.payments.rows.map((p) => p.overdue), tone: PAYMENT_TONES.overdue },
                    ]}
                    height={200}
                    format={money}
                  />
                </>
              )}
            </SeriesGate>
          </Panel>
          <Panel title="Despesas pagas" basis={r.windowLabel}>
            <SeriesGate loading={isFinanceLoading} hasData={r.expenses.hasData} empty={r.empty.expenses} loadingClassName="h-56">
              {() => (
                <>
                  <p className="text-3xl font-semibold tracking-tight text-primary tabular-nums">{money(r.expenses.total)}</p>
                  <SegmentBar segments={r.expenses.slices} className="h-2.5" />
                  <HBarList
                    items={r.expenses.slices.map((s) => ({ label: s.label, value: s.value, tone: s.tone }))}
                    format={(v) => `${v}%`}
                  />
                </>
              )}
            </SeriesGate>
          </Panel>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Cadastros por mês" basis="verificado · potencial · média 3m">
          <SeriesGate loading={isLoading} hasData={r.intake.hasData} empty={r.empty.intake} loadingClassName="h-52">
            {() => (
              <>
                <Legend
                  items={[
                    { label: "Verificado", tone: INTAKE_TONES.verified },
                    { label: "Potencial", tone: INTAKE_TONES.potential },
                    { label: "Média 3m", tone: INTAKE_TONES.average },
                  ]}
                />
                <LineChart
                  labels={r.intake.rows.map((i) => i.label)}
                  series={[
                    { label: "Verificado", values: r.intake.rows.map((i) => i.verified), tone: INTAKE_TONES.verified },
                    { label: "Potencial", values: r.intake.rows.map((i) => i.potential), tone: INTAKE_TONES.potential },
                    { label: "Média 3m", values: r.intake.rows.map((i) => i.average), tone: INTAKE_TONES.average, dashed: true },
                  ]}
                  height={170}
                />
              </>
            )}
          </SeriesGate>
        </Panel>
        <Panel title="Clientes por etapa" basis="etapa atual, na ordem da esteira">
          <SeriesGate loading={isLoading} hasData={r.funnel.hasData} empty={r.empty.funnel} loadingClassName="h-52">
            {() => (
              <HBarList items={r.funnel.stages.map((s) => ({ label: s.label, value: s.count, tone: "primary" as Tone }))} />
            )}
          </SeriesGate>
        </Panel>
        <Panel title="Compromissos no ano" basis={`jan – ${r.monthShort}`}>
          <SeriesGate loading={isLoading} hasData={r.agenda.hasData} empty={r.empty.agenda} loadingClassName="h-52">
            {() => (
              <>
                <Legend
                  items={[
                    { label: AGENDA_LABELS.completed, tone: AGENDA_TONES.completed },
                    { label: AGENDA_LABELS.scheduled, tone: AGENDA_TONES.scheduled },
                    { label: AGENDA_LABELS.cancelled, tone: AGENDA_TONES.cancelled },
                  ]}
                />
                <BarChart
                  stacked
                  labels={r.agenda.rows.map((a) => a.label)}
                  series={[
                    { label: AGENDA_LABELS.completed, values: r.agenda.rows.map((a) => a.completed), tone: AGENDA_TONES.completed },
                    { label: AGENDA_LABELS.scheduled, values: r.agenda.rows.map((a) => a.scheduled), tone: AGENDA_TONES.scheduled },
                    { label: AGENDA_LABELS.cancelled, values: r.agenda.rows.map((a) => a.cancelled), tone: AGENDA_TONES.cancelled },
                  ]}
                  height={170}
                />
              </>
            )}
          </SeriesGate>
        </Panel>
      </div>
    </div>
  );
}
