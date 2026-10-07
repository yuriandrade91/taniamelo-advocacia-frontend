"use client";

import {
  Legend,
  Meter,
  RadialProgress,
  SegmentBar,
  DeltaChip,
  TONE_BG,
  toneAt,
} from "@/components/ui/models/viz";
import {
  AlertIcon,
  CalendarIcon,
  ClockIcon,
  DocumentIcon,
  ReceiptIcon,
  SparkleIcon,
  UsersIcon,
  WalletIcon,
} from "@/components/ui/icons/glyphs";
import {
  ApptTile,
  Empty,
  Illustrative,
  Kicker,
  LinesSkeleton,
  LinkButton,
  LiveDot,
  QuickActions,
  STAGES,
  activeAppointments,
  dayLabel,
  dueLabel,
  durationLabel,
  greeting,
  isOngoingAppt,
  joinPt,
  leadsValue,
  localDay,
  localTime,
  longDate,
  money,
  plural,
  relativeTo,
  statRatio,
  summarizePayments,
  todayOf,
  usePipeline,
  useNow,
} from "./homeKit";
import type { HomeModelProps } from "./shared";

/**
 * 1 · Bom dia — a home começa por uma saudação.
 *
 * Um herói no degradê da marca diz a hora do dia, a data e, numa frase, o que
 * o dia pede (compromissos, leads, atrasos). Ao lado, o próximo compromisso;
 * logo abaixo, três cartões de foco e o resto em blocos tranquilos.
 */
export function BomDiaModel(props: HomeModelProps) {
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
  const today = todayOf(now);
  const appts = activeAppointments(upcomingAppointments);
  const todays = appts.filter((a) => localDay(a.startAt) === today);
  const next = appts[0];
  const pay = summarizePayments(upcomingPayments);
  const { columns, total, max } = usePipeline(pipeline, actions.moveCard);
  const critical = pendingDocuments.filter((d) => d.isCritical).length;

  const parts: string[] = [];
  if (todays.length) {
    parts.push(`${todays.length} ${plural(todays.length, "compromisso", "compromissos")} ainda hoje`);
  }
  if (pendingCount) {
    parts.push(`${pendingCount} ${plural(pendingCount, "lead esperando", "leads esperando")} contato`);
  }
  if (pay.overdue.count) {
    parts.push(
      `${pay.overdue.count} ${plural(pay.overdue.count, "recebimento atrasado", "recebimentos atrasados")}`,
    );
  }
  const freeToday = upcomingAppointments !== null && todays.length === 0;
  const summary =
    upcomingAppointments === null && pendingCount === null
      ? "Preparando o resumo do seu dia…"
      : parts.length
        ? `Você tem ${joinPt(parts)}.${freeToday ? " A agenda de hoje está livre." : ""}`
        : freeToday
          ? "Tudo em dia por aqui, e a agenda de hoje está livre."
          : "Tudo em dia por aqui — bom momento para adiantar a esteira.";

  return (
    <div className="flex flex-col gap-4">
      {/* ── Herói ── */}
      <section className="relative isolate overflow-hidden rounded-[2rem] bg-gradient-brand p-6 text-white sm:p-8 lg:p-10">
        <span className="pointer-events-none absolute -top-24 -right-20 -z-10 h-72 w-72 rounded-full bg-secondary/40 blur-3xl" />
        <span className="pointer-events-none absolute -bottom-32 left-1/4 -z-10 h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl" />

        <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-end">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm text-white/70">
              <SparkleIcon className="h-4 w-4 text-secondary" />
              <span className="inline-block first-letter:uppercase">{longDate(now)}</span>
            </p>
            <h1 className="mt-3 text-4xl font-light tracking-tight sm:text-6xl">
              {greeting(now)}
              <span className="text-secondary">.</span>
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">
              {summary}
            </p>
            <QuickActions
              actions={actions}
              pendingCount={pendingCount}
              tone="glass"
              className="mt-7"
            />
          </div>

          <div className="rounded-3xl bg-white/10 p-5 ring-1 ring-white/15 backdrop-blur-md">
            <Kicker className="flex items-center gap-1.5 text-white/60">
              <ClockIcon className="h-3.5 w-3.5" /> Próximo compromisso
            </Kicker>
            {upcomingAppointments === null ? (
              <LinesSkeleton dark rows={2} className="mt-4" rowClassName="h-8" />
            ) : next ? (
              <div className="mt-3">
                <div className="flex items-end justify-between gap-3">
                  <p className="text-5xl font-extralight tracking-tight tabular-nums">
                    {localTime(next.startAt)}
                  </p>
                  <span className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs">
                    {isOngoingAppt(next, now) && <LiveDot />}
                    {isOngoingAppt(next, now) ? "agora" : relativeTo(next.startAt, now)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-white/60">
                  {dayLabel(next.startAt, now)} · {durationLabel(next)} · {String(next.type)}
                </p>
                <p className="mt-3 truncate text-lg font-medium">{next.title}</p>
                {next.clientName && (
                  <p className="truncate text-sm text-white/70">{next.clientName}</p>
                )}
              </div>
            ) : (
              <p className="mt-4 text-sm text-white/70">
                Nenhum compromisso à frente. A agenda está livre.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── Foco de hoje ── */}
      <section className="grid gap-4 md:grid-cols-3">
        <article className="flex flex-col rounded-3xl bg-white p-6 ring-1 ring-black/5">
          <div className="flex items-center justify-between">
            <Kicker className="text-gray-100/70">Leads</Kicker>
            <UsersIcon className="h-5 w-5 text-secondary" />
          </div>
          <p className="mt-4 text-6xl font-light tracking-tight text-primary tabular-nums">
            {leadsValue(pendingCount)}
          </p>
          <p className="mt-1 text-sm text-gray-100">
            {pendingCount === null
              ? "contando formulários…"
              : pendingCount === 0
                ? "ninguém esperando contato"
                : plural(pendingCount, "pessoa aguarda o primeiro contato", "pessoas aguardam o primeiro contato")}
          </p>
          <button
            type="button"
            onClick={actions.openLeads}
            className="mt-auto self-start pt-5 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Entrar em contato →
          </button>
        </article>

        <article className="flex flex-col rounded-3xl bg-white p-6 ring-1 ring-black/5">
          <div className="flex items-center justify-between">
            <Kicker className="text-gray-100/70">Recebimentos dos clientes</Kicker>
            <WalletIcon className="h-5 w-5 text-secondary" />
          </div>
          {upcomingPayments.length === 0 ? (
            <Empty icon={ReceiptIcon} className="mt-4">
              Nenhum recebimento previsto.
            </Empty>
          ) : (
            <>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-danger/5 p-3">
                  <p className="flex items-center gap-1 text-[11px] text-danger">
                    <AlertIcon className="h-3.5 w-3.5" /> Atrasados
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-danger tabular-nums">
                    {pay.overdue.count}
                  </p>
                  <p className="text-[11px] text-gray-100 tabular-nums">{money(pay.overdue.amount)}</p>
                </div>
                <div className="rounded-2xl bg-previsto/5 p-3">
                  <p className="text-[11px] text-previsto">Previstos</p>
                  <p className="mt-1 text-2xl font-semibold text-previsto tabular-nums">
                    {pay.upcoming.count}
                  </p>
                  <p className="text-[11px] text-gray-100 tabular-nums">{money(pay.upcoming.amount)}</p>
                </div>
              </div>
              {pay.upcoming.items[0] && (
                <p className="mt-3 truncate text-xs text-gray-100">
                  Próximo: <span className="text-primary">{pay.upcoming.items[0].clientName}</span> ·{" "}
                  {dueLabel(pay.upcoming.items[0].dueDate, now)}
                </p>
              )}
            </>
          )}
          <LinkButton onClick={actions.seeAllPayments} className="mt-auto self-start pt-5">
            Ver pagamentos
          </LinkButton>
        </article>

        <article className="flex flex-col rounded-3xl bg-white p-6 ring-1 ring-black/5">
          <div className="flex items-center justify-between gap-2">
            <Kicker className="text-gray-100/70">Documentação</Kicker>
            <span className="flex items-center gap-2">
              <Illustrative />
              <DocumentIcon className="h-5 w-5 text-secondary" />
            </span>
          </div>
          {pendingDocuments.length === 0 ? (
            <Empty icon={DocumentIcon} className="mt-4">
              Nenhuma pendência de documentação.
            </Empty>
          ) : (
            <>
              <p className="mt-4 text-sm text-gray-100">
                <span className="text-2xl font-semibold text-primary tabular-nums">
                  {pendingDocuments.length}
                </span>{" "}
                {plural(pendingDocuments.length, "pendência", "pendências")}
                {critical > 0 && (
                  <span className="text-danger"> · {critical} {plural(critical, "crítica", "críticas")}</span>
                )}
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                {pendingDocuments.slice(0, 3).map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-primary">{d.name}</span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${
                        d.isCritical ? "bg-danger/10 text-danger" : "bg-page text-gray-100"
                      }`}
                    >
                      {d.issue}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <LinkButton onClick={actions.openClients} className="mt-auto self-start pt-5">
            Ver clientes
          </LinkButton>
        </article>
      </section>

      {/* ── O dia e a esteira ── */}
      <section className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <article className="rounded-3xl bg-white p-6 ring-1 ring-black/5">
          <header className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-medium text-primary">O seu dia</h2>
            <LinkButton onClick={actions.openAgenda}>Agenda completa</LinkButton>
          </header>
          {upcomingAppointments === null ? (
            <LinesSkeleton rows={3} className="mt-5" rowClassName="h-14" />
          ) : appts.length === 0 ? (
            <Empty icon={CalendarIcon} className="mt-5">
              Nenhum compromisso à frente.
            </Empty>
          ) : (
            <ol className="mt-5 flex flex-col">
              {appts.slice(0, 5).map((a, i) => {
                const live = isOngoingAppt(a, now);
                return (
                  <li key={a.id} className="relative flex gap-4 pb-4 last:pb-0">
                    {i < Math.min(appts.length, 5) - 1 && (
                      <span className="absolute top-11 bottom-1 left-5 w-px bg-black/5" />
                    )}
                    <ApptTile type={String(a.type)} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="truncate font-medium text-primary">{a.title}</p>
                        <p className="shrink-0 text-sm font-medium text-primary tabular-nums">
                          {localTime(a.startAt)}
                        </p>
                      </div>
                      <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-gray-100">
                        {live && <LiveDot />}
                        {dayLabel(a.startAt, now)} · {String(a.type)}
                        {a.clientName ? ` · ${a.clientName}` : ""}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </article>

        <article className="rounded-3xl bg-white p-6 ring-1 ring-black/5">
          <header className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-medium text-primary">Esteira</h2>
            <span className="text-xs text-gray-100 tabular-nums">
              {total} {plural(total, "cliente", "clientes")}
            </span>
          </header>
          {total === 0 ? (
            <Empty className="mt-5">Nenhum cliente na esteira.</Empty>
          ) : (
            <ul className="mt-5 flex flex-col gap-3">
              {STAGES.map((s) => (
                <li key={s.key}>
                  <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
                    <span className="flex items-center gap-2 text-gray-100">
                      <span className={`h-2 w-2 rounded-full ${TONE_BG[s.tone]}`} />
                      {s.label}
                    </span>
                    <span className="font-medium text-primary tabular-nums">
                      {columns[s.key].length}
                    </span>
                  </div>
                  <Meter value={columns[s.key].length} max={max} tone={s.tone} />
                </li>
              ))}
            </ul>
          )}
          <LinkButton onClick={actions.openClients} className="mt-5">
            Ver clientes
          </LinkButton>
        </article>
      </section>

      {/* ── Indicadores e saídas ── */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, i) => {
          const ratio = statRatio(stat);
          return (
            <article
              key={stat.title}
              className="flex items-center gap-4 rounded-3xl bg-white p-5 ring-1 ring-black/5"
            >
              <RadialProgress value={ratio ?? 0} size={64} thickness={7} tone={i === 0 ? "secondary" : "primary"}>
                <span className="text-xs font-semibold text-primary tabular-nums">
                  {ratio === null ? "—" : `${Math.round(ratio * 100)}%`}
                </span>
              </RadialProgress>
              <div className="min-w-0">
                <p className="truncate text-xs text-gray-100">{stat.title}</p>
                <p className="text-2xl font-semibold text-primary tabular-nums">
                  {stat.value}
                  {stat.total !== undefined && (
                    <span className="text-sm font-normal text-gray-100/60">/{stat.total}</span>
                  )}
                </p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <DeltaChip value={stat.delta ?? null} />
                  <Illustrative />
                </div>
              </div>
            </article>
          );
        })}

        <article className="rounded-3xl bg-white p-5 ring-1 ring-black/5">
          <p className="text-xs text-gray-100">Saídas de {periodLabel.toLowerCase()}</p>
          {outflow.slices.length === 0 ? (
            <p className="mt-3 text-sm text-gray-100/70">Sem despesas pagas neste mês.</p>
          ) : (
            <>
              <p className="text-2xl font-semibold text-primary tabular-nums">{money(outflow.total)}</p>
              <SegmentBar
                className="mt-3 h-2"
                segments={outflow.slices.map((s, i) => ({ label: s.label, value: s.percentage, tone: toneAt(i) }))}
              />
              <Legend
                className="mt-3"
                items={outflow.slices.slice(0, 3).map((s, i) => ({
                  label: s.label,
                  tone: toneAt(i),
                  value: `${s.percentage}%`,
                }))}
              />
            </>
          )}
        </article>
      </section>
    </div>
  );
}
