"use client";

import { Skeleton } from "@heroui/react";
import {
  BarChart,
  Legend,
  RadialProgress,
  SegmentBar,
} from "@/components/charts/svgCharts";
import { ArrowDownIcon } from "@/components/ui/icons/glyphs";
import {
  AGENDA_LABELS,
  AGENDA_TONES,
  INTAKE_TONES,
  useReport,
  type Report,
} from "./useReport";
import { FinanceSummary, SeriesGate } from "./ReportBlocks";
import { stageBg } from "@/components/ui/feedback/stageRamp";
import type { ReportViewProps } from "./types";

/**
 * Jornada do cliente — o financeiro em resumo e, logo abaixo, a esteira.
 *
 * O dinheiro do escritório abre a página numa faixa curta (só para quem pode
 * ver); o resto é o caminho do cliente. A esteira desenhada como funil: cada etapa é uma barra centrada do tamanho
 * de quantos **chegaram** até ela (estão nela ou adiante), e entre uma e outra
 * aparece quantos por cento seguiram. A passagem mais estreita ganha destaque.
 * A ordem é sempre a da esteira — nunca por tamanho.
 *
 * Ao lado, o que alimenta o funil (cadastros) e o ritmo de atendimento
 * (agenda).
 */

function Funnel({ r }: { r: Report }) {
  const top = Math.max(1, r.funnel.stages[0]?.reached ?? 0);
  const bottleneckKey = r.funnel.bottleneck?.to.key;
  return (
    <ol className="flex flex-col">
      {r.funnel.stages.map((s) => {
        const width = Math.max(10, (s.reached / top) * 100);
        const isBottleneck = s.key === bottleneckKey;
        return (
          <li key={s.key} className="flex flex-col">
            {s.stepRate !== null && (
              <div className="flex justify-center py-1.5">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium tabular-nums ${
                    isBottleneck ? "bg-danger/10 text-danger ring-1 ring-danger/30" : "bg-page text-gray-100"
                  }`}
                >
                  <ArrowDownIcon className="h-3 w-3" />
                  {s.stepRate}% seguem
                  {isBottleneck && <span className="font-normal"> · maior queda</span>}
                </span>
              </div>
            )}
            <div className="grid grid-cols-1 items-center gap-2 lg:grid-cols-[12rem_minmax(0,1fr)_7rem] lg:gap-4">
              <p className="flex items-center gap-2 text-sm text-primary">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-primary/10 text-[11px] font-semibold tabular-nums">
                  {s.index + 1}
                </span>
                <span className="truncate">{s.label}</span>
              </p>
              <div className="flex justify-center">
                <div
                  title={`${s.reached} chegaram a ${s.label}`}
                  className={`flex h-11 items-center justify-center rounded-2xl text-sm font-semibold tabular-nums transition-all duration-700 ${stageBg(s.index)} ${
                    s.index >= 4 ? "text-primary" : "text-white"
                  }`}
                  style={{ width: `${width}%` }}
                >
                  {s.reached}
                </div>
              </div>
              <p className="text-xs text-gray-100 lg:text-right">
                <span className="font-medium text-primary tabular-nums">{s.count}</span> nesta etapa
                <span className="text-gray-100/70 tabular-nums"> · {s.share}%</span>
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function JourneyView(props: ReportViewProps) {
  const { canSeeFinance, isLoading, isFinanceLoading } = props;
  const r = useReport(props);
  const c = r.intake.current;

  return (
    <div className="flex flex-col gap-4">
      {canSeeFinance && <FinanceSummary r={r} loading={isFinanceLoading} />}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <section className="rounded-3xl bg-white p-5 ring-1 ring-black/5 sm:p-7 xl:col-span-2">
          <header className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium tracking-[0.2em] text-secondary uppercase">Funil de clientes</p>
              {isLoading ? (
                <Skeleton className="mt-1.5 h-7 w-64 rounded-lg" />
              ) : (
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-primary">
                  {r.funnel.total} clientes na esteira
                </h2>
              )}
            </div>
            <p className="max-w-xs text-[11px] leading-relaxed text-gray-100">
              A barra mostra quantos <strong className="font-medium text-primary">chegaram</strong> à etapa — estão
              nela ou adiante. Etapa atual de cada cliente, na ordem da esteira.
            </p>
          </header>
          <div className="mt-6">
            <SeriesGate loading={isLoading} hasData={r.funnel.hasData} empty={r.empty.funnel} loadingClassName="h-96">
              {() => <Funnel r={r} />}
            </SeriesGate>
          </div>
          {!isLoading && r.funnel.bottleneck && (
            <p className="mt-6 rounded-2xl bg-light-secondary px-4 py-3 text-sm text-primary">
              A passagem mais estreita é de <strong className="font-semibold">{r.funnel.bottleneck.from.label}</strong> para{" "}
              <strong className="font-semibold">{r.funnel.bottleneck.to.label}</strong>: só {r.funnel.bottleneck.rate}% seguem.
            </p>
          )}
        </section>

        <div className="flex flex-col gap-4">
          <section className="flex flex-col gap-4 rounded-3xl bg-white p-5 ring-1 ring-black/5">
            <header className="flex items-baseline justify-between gap-2">
              <h3 className="text-sm font-medium text-primary">Entrada do funil</h3>
              <span className="text-[11px] text-gray-100">cadastros por mês</span>
            </header>
            <SeriesGate loading={isLoading} hasData={r.intake.hasData} empty={r.empty.intake} loadingClassName="h-48">
              {() => (
                <>
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-4xl font-semibold tracking-tight text-primary tabular-nums">{c.total}</p>
                      <p className="text-xs text-gray-100">em {r.monthShort} · média 3m {c.average.toLocaleString("pt-BR")}</p>
                    </div>
                    <RadialProgress value={(r.intake.verifiedShare ?? 0) / 100} size={72} thickness={8} tone="primary">
                      <span className="text-xs font-semibold text-primary tabular-nums">{r.intake.verifiedShare ?? 0}%</span>
                    </RadialProgress>
                  </div>
                  <SegmentBar
                    className="h-2.5"
                    segments={[
                      { label: "Verificado", value: c.verified, tone: INTAKE_TONES.verified },
                      { label: "Potencial", value: c.potential, tone: INTAKE_TONES.potential },
                    ]}
                  />
                  <BarChart
                    stacked
                    labels={r.intake.rows.map((i) => i.label)}
                    series={[
                      { label: "Verificado", values: r.intake.rows.map((i) => i.verified), tone: INTAKE_TONES.verified },
                      { label: "Potencial", values: r.intake.rows.map((i) => i.potential), tone: INTAKE_TONES.potential },
                    ]}
                    height={100}
                  />
                  <Legend
                    items={[
                      { label: "Verificado", tone: INTAKE_TONES.verified, value: String(r.intake.sum.verified) },
                      { label: "Potencial", tone: INTAKE_TONES.potential, value: String(r.intake.sum.potential) },
                    ]}
                  />
                  <p className="text-[11px] text-gray-100/80">O anel é a fatia de verificados nos 6 meses.</p>
                </>
              )}
            </SeriesGate>
          </section>

          <section className="flex flex-col gap-4 rounded-3xl bg-white p-5 ring-1 ring-black/5">
            <header className="flex items-baseline justify-between gap-2">
              <h3 className="text-sm font-medium text-primary">Ritmo da agenda</h3>
              <span className="text-[11px] text-gray-100">jan – {r.monthShort}</span>
            </header>
            <SeriesGate loading={isLoading} hasData={r.agenda.hasData} empty={r.empty.agenda} loadingClassName="h-32">
              {() => (
                <>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {(
                      [
                        ["completed", r.agenda.sum.completed],
                        ["scheduled", r.agenda.sum.scheduled],
                        ["cancelled", r.agenda.sum.cancelled],
                      ] as const
                    ).map(([k, v]) => (
                      <div key={k} className="rounded-2xl bg-page px-2 py-3">
                        <p className="text-xl font-semibold text-primary tabular-nums">{v}</p>
                        <p className="text-[10px] text-gray-100">{AGENDA_LABELS[k]}</p>
                      </div>
                    ))}
                  </div>
                  <SegmentBar
                    className="h-2"
                    segments={[
                      { label: AGENDA_LABELS.completed, value: r.agenda.sum.completed, tone: AGENDA_TONES.completed },
                      { label: AGENDA_LABELS.scheduled, value: r.agenda.sum.scheduled, tone: AGENDA_TONES.scheduled },
                      { label: AGENDA_LABELS.cancelled, value: r.agenda.sum.cancelled, tone: AGENDA_TONES.cancelled },
                    ]}
                  />
                  <p className="text-xs text-gray-100">
                    Em {r.monthShort}: <span className="font-medium text-primary tabular-nums">{r.agenda.current.total}</span>{" "}
                    compromissos, {r.agenda.current.completed} concluídos.
                  </p>
                </>
              )}
            </SeriesGate>
          </section>
        </div>
      </div>
    </div>
  );
}
