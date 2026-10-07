"use client";

import {
  DeltaChip,
  Donut,
  Legend,
  RadialProgress,
  SegmentBar,
  TONE_BG,
  toneAt,
} from "@/components/ui/models/viz";
import {
  CalendarIcon,
  ClockIcon,
  DocumentIcon,
  ReceiptIcon,
} from "@/components/ui/icons/glyphs";
import {
  ApptTile,
  BUCKET_TONE,
  BucketPill,
  Empty,
  Illustrative,
  Kicker,
  LinesSkeleton,
  LinkButton,
  LiveDot,
  QuickActions,
  STAGES,
  activeAppointments,
  bucketLabel,
  dayLabel,
  dueLabel,
  isOngoingAppt,
  leadsValue,
  localTime,
  money,
  plural,
  relativeTo,
  statRatio,
  summarizePayments,
  usePipeline,
  useNow,
} from "./homeKit";
import type { HomeModelProps } from "./shared";

/**
 * 2 · Bento — a home inteira num mosaico de ladrilhos.
 *
 * Cada informação ganha um ladrilho do tamanho da sua importância: leads em
 * 2×2 no azul da marca, o próximo compromisso no degradê, indicadores com
 * anel, a esteira em colunas coloridas e os recebimentos numa rosca. A grade
 * usa `grid-flow-dense` para nunca deixar buraco.
 */
export function BentoModel(props: HomeModelProps) {
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
  const { columns, total, max } = usePipeline(pipeline, actions.moveCard);
  const [stat1, stat2, stat3] = stats;
  const buckets = (["overdue", "upcoming", "paid"] as const).map((b) => ({
    label: bucketLabel(b),
    value: pay[b].count,
    tone: BUCKET_TONE[b],
  }));
  const tile = "rounded-3xl bg-white p-5 ring-1 ring-black/5 transition hover:shadow-xl hover:shadow-primary/5";

  return (
    <div className="grid auto-rows-[minmax(150px,auto)] grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-flow-row-dense lg:grid-cols-4">
      {/* Leads — 2×2 */}
      <article className="relative isolate flex flex-col overflow-hidden rounded-3xl bg-primary p-6 text-white sm:col-span-2 lg:row-span-2">
        <span className="pointer-events-none absolute -top-20 -right-16 -z-10 h-64 w-64 rounded-full bg-secondary/35 blur-3xl" />
        <span className="pointer-events-none absolute -bottom-24 -left-10 -z-10 h-56 w-56 rounded-full bg-indigo-400/25 blur-3xl" />
        <Kicker className="text-white/60">Leads · formulários sem retorno</Kicker>
        <p className="mt-auto pt-6 text-8xl font-extralight tracking-tighter tabular-nums">
          {leadsValue(pendingCount)}
        </p>
        <p className="mt-2 max-w-sm text-white/75">
          {pendingCount === null
            ? "Contando quem preencheu o formulário…"
            : pendingCount === 0
              ? "Ninguém esperando contato. Tudo respondido."
              : `${plural(pendingCount, "pessoa preencheu", "pessoas preencheram")} o formulário e ainda não ${plural(pendingCount, "virou cliente", "viraram clientes")}.`}
        </p>
        <button
          type="button"
          onClick={actions.openLeads}
          className="mt-6 self-start rounded-full bg-secondary px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-black/20 transition hover:-translate-y-0.5 active:scale-95"
        >
          Entrar em contato
        </button>
      </article>

      {/* Próximo compromisso */}
      <article className="relative isolate overflow-hidden rounded-3xl bg-gradient-brand p-5 text-white sm:col-span-2">
        <div className="flex items-center justify-between">
          <Kicker className="flex items-center gap-1.5 text-white/70">
            <ClockIcon className="h-3.5 w-3.5" /> Próximo
          </Kicker>
          <button type="button" onClick={actions.openAgenda} className="text-xs text-white/70 hover:text-white">
            Agenda →
          </button>
        </div>
        {upcomingAppointments === null ? (
          <LinesSkeleton dark rows={2} className="mt-4" rowClassName="h-7" />
        ) : next ? (
          <div className="mt-3 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-xl font-medium">{next.title}</p>
              <p className="mt-1 truncate text-sm text-white/75">
                {dayLabel(next.startAt, now)} · {String(next.type)}
                {next.clientName ? ` · ${next.clientName}` : ""}
              </p>
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs backdrop-blur">
                {isOngoingAppt(next, now) && <LiveDot />}
                {isOngoingAppt(next, now) ? "acontecendo agora" : relativeTo(next.startAt, now)}
              </p>
            </div>
            <p className="shrink-0 text-5xl font-extralight tracking-tight tabular-nums">
              {localTime(next.startAt)}
            </p>
          </div>
        ) : (
          <p className="mt-4 text-sm text-white/80">Nenhum compromisso à frente.</p>
        )}
      </article>

      {/* Indicadores 1 e 2 */}
      {[stat1, stat2].map((stat, i) =>
        stat ? <StatTile key={stat.title} stat={stat} tone={i === 0 ? "secondary" : "primary"} /> : null,
      )}

      {/* Esteira em colunas */}
      <article className={`${tile} flex flex-col sm:col-span-2`}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-primary">Esteira</p>
          <span className="text-xs text-gray-100 tabular-nums">
            {total} {plural(total, "cliente", "clientes")}
          </span>
        </div>
        {total === 0 ? (
          <Empty className="mt-4">Nenhum cliente na esteira.</Empty>
        ) : (
          <div className="mt-4 grid flex-1 grid-cols-6 items-end gap-2">
            {STAGES.map((s) => {
              const n = columns[s.key].length;
              return (
                <div key={s.key} className="flex h-full min-w-0 flex-col items-center justify-end gap-1.5" title={s.label}>
                  <span className="text-xs font-semibold text-primary tabular-nums">{n}</span>
                  <div className="flex h-20 w-full items-end overflow-hidden rounded-xl bg-page">
                    <div
                      className={`w-full rounded-xl ${TONE_BG[s.tone]} transition-all duration-700`}
                      style={{ height: `${Math.max(n ? 8 : 0, (n / max) * 100)}%` }}
                    />
                  </div>
                  <span className="w-full truncate text-center text-[10px] text-gray-100">{s.short}</span>
                </div>
              );
            })}
          </div>
        )}
      </article>

      {/* Recebimentos — 1×2 */}
      <article className={`${tile} flex flex-col lg:row-span-2`}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-primary">Recebimentos</p>
          <ReceiptIcon className="h-4 w-4 text-secondary" />
        </div>
        <p className="text-[11px] text-gray-100">o que o INSS paga aos clientes</p>
        {upcomingPayments.length === 0 ? (
          <Empty icon={ReceiptIcon} className="mt-4">
            Nenhum recebimento previsto.
          </Empty>
        ) : (
          <>
            <div className="mt-4 flex justify-center">
              <Donut slices={buckets} size={132} thickness={14}>
                <span className="text-2xl font-semibold text-primary tabular-nums">
                  {upcomingPayments.length}
                </span>
                <span className="text-[10px] text-gray-100">parcelas</span>
              </Donut>
            </div>
            <Legend
              className="mt-4 justify-center"
              items={buckets.map((b) => ({ label: b.label, tone: b.tone, value: String(b.value) }))}
            />
            <ul className="mt-4 flex flex-col gap-2 border-t border-black/5 pt-3">
              {upcomingPayments.slice(0, 3).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="min-w-0">
                    <span className="block truncate text-primary">{p.clientName}</span>
                    <span className="text-gray-100">{dueLabel(p.dueDate, now)}</span>
                  </span>
                  <BucketPill payment={p} />
                </li>
              ))}
            </ul>
          </>
        )}
        <LinkButton onClick={actions.seeAllPayments} className="mt-auto self-start pt-4">
          Ver todos
        </LinkButton>
      </article>

      {stat3 && <StatTile stat={stat3} tone="primary" />}

      {/* Agenda — próximos */}
      <article className={`${tile} sm:col-span-2`}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-primary">Agenda</p>
          <LinkButton onClick={actions.openAgenda}>Abrir</LinkButton>
        </div>
        {upcomingAppointments === null ? (
          <LinesSkeleton rows={3} className="mt-4" rowClassName="h-9" />
        ) : appts.length === 0 ? (
          <Empty icon={CalendarIcon} className="mt-4">
            Nenhum compromisso à frente.
          </Empty>
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {appts.slice(1, 5).concat(appts.length === 1 ? appts : []).map((a) => (
              <li key={a.id} className="flex items-center gap-3 rounded-2xl bg-page/70 p-2.5">
                <ApptTile type={String(a.type)} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate text-xs font-medium text-primary">{a.title}</span>
                  <span className="text-[11px] text-gray-100 tabular-nums">
                    {dayLabel(a.startAt, now)} · {localTime(a.startAt)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </article>

      {/* Documentos */}
      <article className={tile}>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-primary">Documentos</p>
          <Illustrative />
        </div>
        {pendingDocuments.length === 0 ? (
          <Empty icon={DocumentIcon} className="mt-4">
            Nada pendente.
          </Empty>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {pendingDocuments.slice(0, 3).map((d) => (
              <li key={d.id} className="flex items-start gap-2 text-xs">
                <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${d.isCritical ? "bg-danger" : "bg-gray-100/30"}`} />
                <span className="min-w-0">
                  <span className="block truncate text-primary">{d.name}</span>
                  <span className={d.isCritical ? "text-danger" : "text-gray-100"}>{d.issue}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </article>

      {/* Saídas do mês */}
      <article className={`${tile} lg:col-span-2`}>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-primary">Saídas de {periodLabel.toLowerCase()}</p>
          {outflow.slices.length > 0 && (
            <p className="text-lg font-semibold text-primary tabular-nums">{money(outflow.total)}</p>
          )}
        </div>
        {outflow.slices.length === 0 ? (
          <Empty className="mt-4">Sem despesas pagas neste mês.</Empty>
        ) : (
          <>
            <SegmentBar
              className="mt-4 h-3"
              segments={outflow.slices.map((s, i) => ({ label: s.label, value: s.percentage, tone: toneAt(i) }))}
            />
            <Legend
              className="mt-3"
              items={outflow.slices.map((s, i) => ({ label: s.label, tone: toneAt(i), value: `${s.percentage}%` }))}
            />
          </>
        )}
      </article>

      {/* Atalhos */}
      <article className="flex flex-col justify-between gap-4 rounded-3xl bg-light-secondary p-5 ring-1 ring-secondary/15 sm:col-span-2">
        <p className="text-sm font-medium text-primary">Atalhos</p>
        <QuickActions actions={actions} pendingCount={pendingCount} />
      </article>
    </div>
  );
}

function StatTile({
  stat,
  tone,
}: {
  stat: HomeModelProps["stats"][number];
  tone: "primary" | "secondary";
}) {
  const ratio = statRatio(stat);
  return (
    <article className="flex flex-col justify-between rounded-3xl bg-white p-5 ring-1 ring-black/5 transition hover:shadow-xl hover:shadow-primary/5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs leading-snug text-gray-100">{stat.title}</p>
        <Illustrative />
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-3xl font-semibold text-primary tabular-nums">
            {stat.value}
            {stat.total !== undefined && (
              <span className="text-base font-normal text-gray-100/50">/{stat.total}</span>
            )}
          </p>
          <DeltaChip value={stat.delta ?? null} className="mt-1" />
        </div>
        <RadialProgress value={ratio ?? 0} size={56} thickness={6} tone={tone}>
          <span className="text-[11px] font-semibold text-primary tabular-nums">
            {ratio === null ? "—" : `${Math.round(ratio * 100)}%`}
          </span>
        </RadialProgress>
      </div>
    </article>
  );
}
