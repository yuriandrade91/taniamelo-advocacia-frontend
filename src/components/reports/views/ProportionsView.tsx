"use client";

import type { ReactNode } from "react";
import {
  Donut,
  Legend,
  RadialProgress,
  TONE,
  TONE_BG,
  type Tone,
} from "@/components/charts/svgCharts";
import { ConcentricRings, type Ring } from "../../charts/ConcentricRings";
import {
  AGENDA_LABELS,
  AGENDA_TONES,
  FLOW_TONES,
  INTAKE_TONES,
  PAYMENT_TONES,
  useReport,
} from "./useReport";
import { LoadingBlock, SeriesGate } from "./ReportBlocks";
import { STAGE_BG, stageOpacity } from "@/components/ui/feedback/stageRamp";
import { formatBRLShort, formatBRLSigned } from "@/lib/format";
import type { ReportViewProps } from "./types";

/**
 * Proporções — o período em anéis.
 *
 * Tudo aqui é "quanto de quanto": quanto das parcelas já foi pago, quanto
 * está em atraso, quanto das entradas as saídas consomem, como se dividem as
 * despesas, os cadastros, a agenda e a esteira. Cada pergunta ganha um anel,
 * rosca ou anéis concêntricos. O topo junta as taxas do financeiro num só
 * alvo, e os anéis de dinheiro vêm antes dos de clientes e agenda.
 */

function RingCard({
  title,
  basis,
  className = "",
  children,
}: {
  title: string;
  basis?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`flex min-w-0 flex-col items-center gap-4 rounded-3xl bg-white p-5 text-center ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:ring-secondary/40 motion-reduce:hover:translate-y-0 ${className}`}
    >
      <header className="w-full">
        <h3 className="text-sm font-medium text-primary">{title}</h3>
        {basis && <p className="text-[11px] text-gray-100">{basis}</p>}
      </header>
      <div className="flex w-full flex-1 flex-col items-center justify-center gap-4">{children}</div>
    </section>
  );
}

function Center({ value, label }: { value: string; label: string }) {
  return (
    <>
      <span className="text-2xl font-semibold tracking-tight text-primary tabular-nums">{value}</span>
      <span className="text-[10px] text-gray-100">{label}</span>
    </>
  );
}

export function ProportionsView(props: ReportViewProps) {
  const { canSeeFinance, isLoading, isFinanceLoading } = props;
  const r = useReport(props);

  const coverage = r.flow.sum.inflow > 0 ? r.flow.sum.outflow / r.flow.sum.inflow : null;
  const financeReady = !isFinanceLoading;

  /*
    O alvo do topo é do dinheiro para quem pode vê-lo: quanto das parcelas foi
    pago, quanto atrasou e quanto das entradas as saídas consumiram. Clientes
    e agenda têm os anéis deles mais abaixo. Sem permissão, o alvo fica com as
    taxas de clientes e agenda — o financeiro nem zerado aparece.
  */
  const heroRings: (Ring & { text: string; ok: boolean })[] = canSeeFinance
    ? [
        {
          label: "Parcelas pagas",
          value: (r.payments.paidRate ?? 0) / 100,
          tone: PAYMENT_TONES.paid,
          text: `${r.payments.paidRate ?? 0}%`,
          ok: financeReady && r.payments.hasData,
        },
        {
          label: "Parcelas em atraso",
          value: (r.payments.overdueRate ?? 0) / 100,
          tone: PAYMENT_TONES.overdue,
          text: `${r.payments.overdueRate ?? 0}%`,
          ok: financeReady && r.payments.hasData,
        },
        {
          label: "Saídas sobre entradas",
          value: coverage ?? 0,
          tone: coverage !== null && coverage <= 1 ? "secondary" : FLOW_TONES.outflow,
          text: coverage === null ? "—" : `${Math.round(coverage * 100)}%`,
          ok: financeReady && r.flow.hasData && coverage !== null,
        },
      ]
    : [
        {
          label: "Compromissos concluídos",
          value: (r.agenda.doneRate ?? 0) / 100,
          tone: "secondary",
          text: `${r.agenda.doneRate ?? 0}%`,
          ok: !isLoading && r.agenda.hasData,
        },
        {
          label: "Cadastros verificados",
          value: (r.intake.verifiedShare ?? 0) / 100,
          tone: "primary",
          text: `${r.intake.verifiedShare ?? 0}%`,
          ok: !isLoading && r.intake.hasData,
        },
      ];
  const visibleHero = heroRings.filter((h) => h.ok);
  const heroLoading = canSeeFinance ? isFinanceLoading : isLoading;

  return (
    <div className="flex flex-col gap-4">
      <section className="relative isolate grid grid-cols-1 items-center gap-6 overflow-hidden rounded-3xl bg-white p-6 ring-1 ring-black/5 sm:p-8 md:grid-cols-[auto_1fr]">
        <span className="pointer-events-none absolute -top-24 -left-24 -z-10 h-72 w-72 rounded-full bg-secondary/10 blur-3xl" />
        <div className="flex justify-center">
          {heroLoading ? (
            <LoadingBlock className="h-56 w-56 rounded-full" />
          ) : visibleHero.length ? (
            <ConcentricRings rings={visibleHero} size={224} thickness={16} gap={6}>
              <span className="text-[10px] tracking-[0.2em] text-gray-100 uppercase">taxas em</span>
              <span className="text-lg font-semibold text-primary">6 meses</span>
            </ConcentricRings>
          ) : (
            <p className="text-sm text-gray-100">Sem taxas para mostrar.</p>
          )}
        </div>
        <div>
          <p className="text-[11px] font-medium tracking-[0.2em] text-secondary uppercase">Proporções · {r.windowLabel}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-primary">
            {canSeeFinance ? "O dinheiro do escritório em proporções" : "O período em proporções"}
          </h2>
          <ul className="mt-5 flex flex-col gap-3">
            {heroRings.map((h) => (
              <li key={h.label} className="flex items-center gap-3">
                <span className={`h-3 w-3 shrink-0 rounded-full ${TONE_BG[h.tone]}`} />
                <span className="flex-1 text-sm text-gray-100">{h.label}</span>
                <span className="text-lg font-semibold text-primary tabular-nums">{h.ok ? h.text : "—"}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {canSeeFinance && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 xl:grid-cols-5">
          <RingCard title="Parcelas pagas" basis="clientes · por vencimento">
            <SeriesGate loading={isFinanceLoading} hasData={r.payments.hasData} empty={r.empty.payments}>
              {() => (
                <>
                  <RadialProgress value={(r.payments.paidRate ?? 0) / 100} size={140} thickness={12} tone={PAYMENT_TONES.paid}>
                    <Center value={`${r.payments.paidRate ?? 0}%`} label="pago" />
                  </RadialProgress>
                  <p className="text-xs text-gray-100 tabular-nums">
                    {formatBRLShort(r.payments.sum.paid)} de {formatBRLShort(r.payments.sum.total)}
                  </p>
                </>
              )}
            </SeriesGate>
          </RingCard>
          <RingCard title="Em atraso" basis="clientes · por vencimento">
            <SeriesGate loading={isFinanceLoading} hasData={r.payments.hasData} empty={r.empty.payments}>
              {() => (
                <>
                  <RadialProgress value={(r.payments.overdueRate ?? 0) / 100} size={140} thickness={12} tone={PAYMENT_TONES.overdue}>
                    <Center value={`${r.payments.overdueRate ?? 0}%`} label="atrasado" />
                  </RadialProgress>
                  <p className="text-xs text-gray-100 tabular-nums">{formatBRLSigned(r.payments.sum.overdue)} em atraso</p>
                </>
              )}
            </SeriesGate>
          </RingCard>
          <RingCard title="Saídas sobre entradas" basis="carteira · por pagamento">
            <SeriesGate loading={isFinanceLoading} hasData={r.flow.hasData} empty={r.empty.flow}>
              {() => (
                <>
                  <RadialProgress
                    value={coverage ?? 1}
                    size={140}
                    thickness={12}
                    tone={coverage !== null && coverage <= 1 ? "secondary" : FLOW_TONES.outflow}
                  >
                    <Center value={coverage === null ? "—" : `${Math.round(coverage * 100)}%`} label="das entradas" />
                  </RadialProgress>
                  <p className="text-xs text-gray-100 tabular-nums">
                    saldo da janela{" "}
                    <span className={r.flow.sum.net < 0 ? "text-danger" : "text-primary"}>{formatBRLSigned(r.flow.sum.net)}</span>
                  </p>
                </>
              )}
            </SeriesGate>
          </RingCard>
          {/* Como a Esteira: um anel por categoria, a lista ao lado. Ocupa
              duas colunas porque a lista precisa caber ao lado dos anéis. */}
          <RingCard title="Despesas por categoria" basis="pagas na janela" className="sm:col-span-3 xl:col-span-2">
            <SeriesGate loading={isFinanceLoading} hasData={r.expenses.hasData} empty={r.empty.expenses} loadingClassName="h-56">
              {() => (
                <div className="flex w-full flex-col items-center gap-5 sm:flex-row sm:justify-center">
                  <ConcentricRings
                    size={176}
                    thickness={9}
                    gap={3}
                    rings={r.expenses.slices.map((s) => ({
                      label: `${s.label}: ${s.value}%`,
                      value: s.value / 100,
                      tone: s.tone,
                    }))}
                  >
                    <Center value={formatBRLShort(r.expenses.total)} label="total" />
                  </ConcentricRings>
                  <ol className="flex min-w-0 flex-col gap-1.5 text-left text-xs">
                    {r.expenses.slices.map((s) => (
                      <li key={s.label} className="flex items-center gap-2 text-gray-100">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${TONE_BG[s.tone]}`} />
                        <span className="truncate">{s.label}</span>
                        <span className="ml-auto pl-2 font-medium text-primary tabular-nums">{s.value}%</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </SeriesGate>
          </RingCard>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <RingCard title="Esteira">
          <SeriesGate loading={isLoading} hasData={r.funnel.hasData} empty={r.empty.funnel} loadingClassName="h-56">
            {() => (
              <div className="flex w-full flex-col items-center gap-5 sm:flex-row sm:justify-center">
                <ConcentricRings
                  size={176}
                  thickness={9}
                  gap={3}
                  rings={r.funnel.stages.map((s) => ({
                    label: `${s.label}: ${s.count}`,
                    value: s.share / 100,
                    tone: "primary" as Tone,
                    opacity: stageOpacity(s.index),
                  }))}
                >
                  <Center value={String(r.funnel.total)} label="clientes" />
                </ConcentricRings>
                <ol className="flex min-w-0 flex-col gap-1.5 text-left text-xs">
                  {r.funnel.stages.map((s) => (
                    <li key={s.key} className="flex items-center gap-2 text-gray-100">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${STAGE_BG[s.index]}`} />
                      <span className="truncate">{s.label}</span>
                      <span className="ml-auto pl-2 font-medium text-primary tabular-nums">{s.share}%</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </SeriesGate>
        </RingCard>

        <RingCard title="Cadastros" basis={`verificado · potencial · ${r.windowLabel}`}>
          <SeriesGate loading={isLoading} hasData={r.intake.hasData} empty={r.empty.intake} loadingClassName="h-56">
            {() => (
              <>
                <Donut
                  size={160}
                  thickness={18}
                  slices={[
                    { label: "Verificado", value: r.intake.sum.verified, tone: INTAKE_TONES.verified },
                    { label: "Potencial", value: r.intake.sum.potential, tone: INTAKE_TONES.potential },
                  ]}
                >
                  <Center value={String(r.intake.sum.total)} label="cadastros" />
                </Donut>
                <Legend
                  className="justify-center"
                  items={[
                    { label: "Verificado", tone: INTAKE_TONES.verified, value: String(r.intake.sum.verified) },
                    { label: "Potencial", tone: INTAKE_TONES.potential, value: String(r.intake.sum.potential) },
                  ]}
                />
              </>
            )}
          </SeriesGate>
        </RingCard>

        <RingCard title="Agenda" basis={`status no ano · jan – ${r.monthShort}`}>
          <SeriesGate loading={isLoading} hasData={r.agenda.hasData} empty={r.empty.agenda} loadingClassName="h-56">
            {() => {
              const t = Math.max(1, r.agenda.sum.total);
              return (
                <>
                  <ConcentricRings
                    size={160}
                    thickness={12}
                    gap={4}
                    track={`color-mix(in oklab, ${TONE.primary} 6%, transparent)`}
                    rings={[
                      { label: AGENDA_LABELS.completed, value: r.agenda.sum.completed / t, tone: AGENDA_TONES.completed },
                      { label: AGENDA_LABELS.scheduled, value: r.agenda.sum.scheduled / t, tone: AGENDA_TONES.scheduled },
                      { label: AGENDA_LABELS.cancelled, value: r.agenda.sum.cancelled / t, tone: AGENDA_TONES.cancelled },
                    ]}
                  >
                    <Center value={String(r.agenda.sum.total)} label="compromissos" />
                  </ConcentricRings>
                  <Legend
                    className="justify-center"
                    items={[
                      { label: AGENDA_LABELS.completed, tone: AGENDA_TONES.completed, value: String(r.agenda.sum.completed) },
                      { label: AGENDA_LABELS.scheduled, tone: AGENDA_TONES.scheduled, value: String(r.agenda.sum.scheduled) },
                      { label: AGENDA_LABELS.cancelled, tone: AGENDA_TONES.cancelled, value: String(r.agenda.sum.cancelled) },
                    ]}
                  />
                </>
              );
            }}
          </SeriesGate>
        </RingCard>
      </div>
    </div>
  );
}
