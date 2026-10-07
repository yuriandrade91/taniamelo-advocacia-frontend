"use client";

import {
  BarChart,
  DeltaChip,
  Donut,
  HBarList,
  Legend,
  RadialProgress,
  Sparkline,
  TONE_BG,
  toneAt,
} from "@/components/ui/models/viz";
import { ChartBarIcon } from "@/components/ui/icons/glyphs";
import {
  BUCKET_TONE,
  Empty,
  Illustrative,
  Kicker,
  LinesSkeleton,
  LinkButton,
  QuickActions,
  STAGES,
  activeAppointments,
  amountOf,
  bucketLabel,
  dateParts,
  dayLabel,
  leadsValue,
  localTime,
  money,
  plural,
  statRatio,
  summarizePayments,
  usePipeline,
  useNow,
} from "./homeKit";
import { bucketOf } from "@/components/payments/paymentBuckets";
import type { HomeModelProps } from "./shared";

/**
 * 7 · Métricas — números primeiro, listas depois.
 *
 * Quatro indicadores com anel, linha ou rosca; os três do período (ainda
 * ilustrativos) em anéis grandes; dois gráficos — a esteira por etapa e os
 * recebimentos por vencimento, empilhados por balde — e, no fim, listas
 * compactas em formato de tabela.
 */
export function MetricsModel(props: HomeModelProps) {
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
  const pay = summarizePayments(upcomingPayments);
  const { columns, total } = usePipeline(pipeline, actions.moveCard);
  const appts = activeAppointments(upcomingAppointments);
  const open = pay.overdue.count + pay.upcoming.count + pay.paid.count;

  // Acumulado a receber, na ordem de vencimento.
  const pending = [...pay.upcoming.items].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const cumulative = pending.reduce<number[]>(
    (acc, p) => [...acc, (acc[acc.length - 1] ?? 0) + amountOf(p)],
    [],
  );

  // Recebimentos por dia de vencimento, empilhados por balde.
  const dueDays = [...new Set(upcomingPayments.map((p) => p.dueDate))].sort().slice(0, 8);
  // Sem valor nas parcelas, o gráfico conta parcelas em vez de somar reais.
  const hasAmounts = upcomingPayments.some((p) => amountOf(p) > 0);
  const byBucket = (bucket: "overdue" | "upcoming" | "paid") =>
    dueDays.map((day) =>
      upcomingPayments
        .filter((p) => p.dueDate === day && bucketOf(p) === bucket)
        .reduce((sum, p) => sum + (hasAmounts ? amountOf(p) : 1), 0),
    );

  const kpi = "rounded-3xl bg-white p-5 ring-1 ring-black/5";

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Kicker className="flex items-center gap-2 text-secondary">
            <ChartBarIcon className="h-4 w-4" /> Métricas · {periodLabel}
          </Kicker>
          <h1 className="mt-2 text-3xl font-light tracking-tight text-primary">O escritório em números</h1>
        </div>
        <QuickActions actions={actions} pendingCount={pendingCount} />
      </header>

      {/* ── Indicadores principais ── */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className={kpi}>
          <p className="text-xs text-gray-100">Leads aguardando</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <p className="text-4xl font-semibold text-primary tabular-nums">{leadsValue(pendingCount)}</p>
            <button type="button" onClick={actions.openLeads} className="text-xs font-medium text-secondary hover:text-primary">
              Contatar →
            </button>
          </div>
          <p className="mt-3 text-[11px] text-gray-100">
            {total} {plural(total, "cliente", "clientes")} na esteira ·{" "}
            {columns.FORMULARIO_PREENCHIDO.length} na primeira etapa
          </p>
        </article>

        <article className={kpi}>
          <p className="text-xs text-gray-100">A receber (clientes)</p>
          <p className="mt-2 text-4xl font-semibold text-primary tabular-nums">
            {pay.upcoming.count ? money(pay.upcoming.amount) : "—"}
          </p>
          {cumulative.length > 1 ? (
            <Sparkline values={cumulative} tone="previsto" height={36} className="mt-2" />
          ) : (
            <p className="mt-3 text-[11px] text-gray-100">
              {pay.upcoming.count
                ? `${pay.upcoming.count} ${plural(pay.upcoming.count, "parcela prevista", "parcelas previstas")}`
                : "Nenhum recebimento previsto."}
            </p>
          )}
        </article>

        <article className={`${kpi} flex items-center justify-between gap-4`}>
          <div className="min-w-0">
            <p className="text-xs text-gray-100">Atrasados</p>
            <p className="mt-2 text-4xl font-semibold text-danger tabular-nums">{pay.overdue.count}</p>
            <p className="mt-1 text-[11px] text-gray-100 tabular-nums">
              {pay.overdue.count ? money(pay.overdue.amount) : open ? "nenhum atraso" : "sem recebimentos"}
            </p>
          </div>
          <RadialProgress value={open ? pay.overdue.count / open : 0} size={72} thickness={8} tone="danger">
            <span className="text-xs font-semibold text-primary tabular-nums">
              {open ? `${Math.round((pay.overdue.count / open) * 100)}%` : "—"}
            </span>
          </RadialProgress>
        </article>

        <article className={`${kpi} flex items-center justify-between gap-4`}>
          <div className="min-w-0">
            <p className="text-xs text-gray-100">Saídas do mês</p>
            <p className="mt-2 text-3xl font-semibold text-primary tabular-nums">
              {outflow.slices.length ? money(outflow.total) : "—"}
            </p>
            <p className="mt-1 truncate text-[11px] text-gray-100">
              {outflow.slices[0] ? `maior: ${outflow.slices[0].label}` : "sem despesas pagas"}
            </p>
          </div>
          <Donut
            size={72}
            thickness={10}
            slices={outflow.slices.map((s, i) => ({ label: s.label, value: s.percentage, tone: toneAt(i) }))}
          />
        </article>
      </section>

      {/* ── Indicadores do período (ilustrativos) ── */}
      <section className="grid gap-3 md:grid-cols-3">
        {stats.map((s, i) => {
          const ratio = statRatio(s);
          return (
            <article key={s.title} className="flex items-center gap-5 rounded-3xl bg-white p-5 ring-1 ring-black/5">
              <RadialProgress value={ratio ?? 0} size={96} thickness={9} tone={i === 0 ? "secondary" : i === 1 ? "success" : "previsto"}>
                <span className="text-lg font-semibold text-primary tabular-nums">
                  {ratio === null ? "—" : `${Math.round(ratio * 100)}%`}
                </span>
              </RadialProgress>
              <div className="min-w-0">
                <p className="text-sm text-gray-100">{s.title}</p>
                <p className="mt-1 text-2xl font-semibold text-primary tabular-nums">
                  {s.value}
                  {s.total !== undefined && <span className="text-sm font-normal text-gray-100/50"> de {s.total}</span>}
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <DeltaChip value={s.delta ?? null} />
                  <Illustrative />
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {/* ── Gráficos ── */}
      <section className="grid gap-3 lg:grid-cols-2">
        <article className="rounded-3xl bg-white p-5 ring-1 ring-black/5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-primary">Clientes por etapa</p>
            <LinkButton onClick={actions.openClients}>Clientes</LinkButton>
          </div>
          {total === 0 ? (
            <Empty className="mt-4">Nenhum cliente na esteira.</Empty>
          ) : (
            <>
              <BarChart
                className="mt-5"
                height={170}
                labels={STAGES.map((s) => s.short)}
                series={[{ label: "Clientes", tone: "primary", values: STAGES.map((s) => columns[s.key].length) }]}
              />
              <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {STAGES.map((s) => (
                  <p key={s.key} className="text-center">
                    <span className={`mx-auto mb-1 block h-1 w-6 rounded-full ${TONE_BG[s.tone]}`} />
                    <span className="text-sm font-semibold text-primary tabular-nums">
                      {Math.round((columns[s.key].length / total) * 100)}%
                    </span>
                  </p>
                ))}
              </div>
            </>
          )}
        </article>

        <article className="rounded-3xl bg-white p-5 ring-1 ring-black/5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-primary">
              Recebimentos por vencimento {hasAmounts ? "" : "(parcelas)"}
            </p>
            <LinkButton onClick={actions.seeAllPayments}>Pagamentos</LinkButton>
          </div>
          {dueDays.length === 0 ? (
            <Empty className="mt-4">Nenhum recebimento previsto.</Empty>
          ) : (
            <>
              <BarChart
                className="mt-5"
                height={170}
                stacked
                format={hasAmounts ? money : (v) => String(v)}
                labels={dueDays.map((d) => {
                  const p = dateParts(d);
                  return `${p.day} ${p.month}`;
                })}
                series={(["overdue", "upcoming", "paid"] as const).map((b) => ({
                  label: bucketLabel(b),
                  tone: BUCKET_TONE[b],
                  values: byBucket(b),
                }))}
              />
              <Legend
                className="mt-4"
                items={(["overdue", "upcoming", "paid"] as const).map((b) => ({
                  label: bucketLabel(b),
                  tone: BUCKET_TONE[b],
                  value: hasAmounts ? money(pay[b].amount) : String(pay[b].count),
                }))}
              />
            </>
          )}
        </article>
      </section>

      {/* ── Listas compactas ── */}
      <section className="grid gap-3 lg:grid-cols-3">
        <article className="rounded-3xl bg-white p-5 ring-1 ring-black/5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-primary">Próximos compromissos</p>
            <LinkButton onClick={actions.openAgenda}>Agenda</LinkButton>
          </div>
          {upcomingAppointments === null ? (
            <LinesSkeleton rows={4} className="mt-4" rowClassName="h-7" />
          ) : appts.length === 0 ? (
            <Empty className="mt-4">Nenhum compromisso à frente.</Empty>
          ) : (
            <table className="mt-3 w-full table-fixed text-xs">
              <tbody className="divide-y divide-black/5">
                {appts.slice(0, 6).map((a) => (
                  <tr key={a.id}>
                    <td className="w-24 py-2 text-gray-100 tabular-nums">
                      {dayLabel(a.startAt, now).replace(/,.*/, "")} {localTime(a.startAt)}
                    </td>
                    <td className="truncate py-2 text-primary">{a.title}</td>
                    <td className="w-20 truncate py-2 text-right text-gray-100">{String(a.type)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </article>

        <article className="rounded-3xl bg-white p-5 ring-1 ring-black/5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-primary">Documentação pendente</p>
            <Illustrative />
          </div>
          {pendingDocuments.length === 0 ? (
            <Empty className="mt-4">Nenhuma pendência.</Empty>
          ) : (
            <table className="mt-3 w-full table-fixed text-xs">
              <tbody className="divide-y divide-black/5">
                {pendingDocuments.map((d) => (
                  <tr key={d.id}>
                    <td className="truncate py-2 text-primary">{d.name}</td>
                    <td className={`w-32 truncate py-2 text-right ${d.isCritical ? "text-danger" : "text-gray-100"}`}>
                      {d.issue}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </article>

        <article className="rounded-3xl bg-white p-5 ring-1 ring-black/5">
          <p className="text-sm font-medium text-primary">Composição das saídas</p>
          {outflow.slices.length === 0 ? (
            <Empty className="mt-4">Sem despesas pagas neste mês.</Empty>
          ) : (
            <HBarList
              className="mt-4"
              format={(v) => `${v}%`}
              items={outflow.slices.map((s, i) => ({ label: s.label, value: s.percentage, tone: toneAt(i) }))}
            />
          )}
        </article>
      </section>
    </div>
  );
}
