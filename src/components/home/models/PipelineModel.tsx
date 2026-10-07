"use client";

import { useState, type ReactNode } from "react";
import type { SituationKey } from "@/enums/situation/Situation";
import type { PipelineCard } from "@/components/home/ContributorPipeline";
import {
  DeltaChip,
  SegmentBar,
  TONE_BG,
  TONE_SOFT,
  TONE_TEXT,
} from "@/components/ui/models/viz";
import {
  CalendarIcon,
  DocumentIcon,
  KanbanIcon,
  ReceiptIcon,
  UsersIcon,
} from "@/components/ui/icons/glyphs";
import {
  ArrowRightIcon,
  Illustrative,
  Kicker,
  LinesSkeleton,
  PlusIcon,
  STAGES,
  StageSelect,
  activeAppointments,
  dayLabel,
  initials,
  leadsValue,
  localTime,
  money,
  nextStageOf,
  plural,
  summarizePayments,
  usePipeline,
  useNow,
  type IconComponent,
  type Stage,
} from "./homeKit";
import type { HomeModelProps } from "./shared";

/**
 * 5 · Esteira em destaque — a home começa pelo funil.
 *
 * As seis etapas viram um funil numerado com contagem e participação; logo
 * abaixo, o quadro inteiro com rolagem horizontal própria. Cada cliente
 * avança uma etapa num clique ou vai para qualquer outra pelo seletor. O
 * resto da home cabe numa faixa compacta no rodapé.
 */

const COLUMN_LIMIT = 6;

export function PipelineModel(props: HomeModelProps) {
  const {
    pendingCount,
    stats,
    upcomingPayments,
    outflow,
    pendingDocuments,
    pipeline,
    upcomingAppointments,
    actions,
  } = props;
  const now = useNow();
  const { columns, total, move } = usePipeline(pipeline, actions.moveCard);
  const [focus, setFocus] = useState<SituationKey | null>(null);
  const [expanded, setExpanded] = useState<Partial<Record<SituationKey, boolean>>>({});
  const appts = activeAppointments(upcomingAppointments);
  const pay = summarizePayments(upcomingPayments);

  const choose = (key: SituationKey) => {
    setFocus((prev) => (prev === key ? null : key));
    document
      .getElementById(`esteira-col-${key}`)
      ?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* ── Funil ── */}
      <section className="rounded-[2rem] bg-white p-5 ring-1 ring-black/5 sm:p-7">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Kicker className="flex items-center gap-2 text-secondary">
              <KanbanIcon className="h-4 w-4" /> Esteira do contribuinte
            </Kicker>
            <h1 className="mt-2 text-3xl font-light tracking-tight text-primary">
              <span className="font-semibold tabular-nums">{total}</span>{" "}
              {plural(total, "cliente em andamento", "clientes em andamento")}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={actions.openLeads}
              className="inline-flex items-center gap-2 rounded-full bg-page px-4 py-2 text-xs font-medium text-primary transition hover:bg-light-gray/60"
            >
              <UsersIcon className="h-4 w-4" /> Leads
              <span className="rounded-full bg-secondary px-1.5 text-[10px] leading-4 text-white tabular-nums">
                {leadsValue(pendingCount)}
              </span>
            </button>
            <button
              type="button"
              onClick={actions.newClient}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-medium text-white shadow-lg shadow-primary/20 transition hover:bg-primary/90 active:scale-95"
            >
              <PlusIcon className="h-4 w-4" /> Novo cliente
            </button>
          </div>
        </header>

        <ol className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {STAGES.map((s, i) => {
            const n = columns[s.key].length;
            const share = total ? Math.round((n / total) * 100) : 0;
            const active = focus === s.key;
            return (
              <li key={s.key}>
                <button
                  type="button"
                  onClick={() => choose(s.key)}
                  aria-pressed={active}
                  className={`group relative flex h-full w-full flex-col rounded-2xl p-4 text-left transition ${
                    active
                      ? "bg-primary text-white shadow-xl shadow-primary/20"
                      : "bg-page hover:bg-light-gray/50"
                  }`}
                >
                  <span className={`text-[11px] font-medium tabular-nums ${active ? "text-secondary" : TONE_TEXT[s.tone]}`}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className={`mt-1 text-xs leading-snug ${active ? "text-white/80" : "text-gray-100"}`}>
                    {s.label}
                  </span>
                  <span className="mt-auto flex items-end justify-between gap-2 pt-4">
                    <span className={`text-3xl font-semibold tabular-nums ${active ? "text-white" : "text-primary"}`}>{n}</span>
                    <span className={`text-[11px] tabular-nums ${active ? "text-white/60" : "text-gray-100/70"}`}>{share}%</span>
                  </span>
                  <span className={`mt-3 h-1 w-full overflow-hidden rounded-full ${active ? "bg-white/15" : "bg-white"}`}>
                    <span className={`block h-full rounded-full ${TONE_BG[s.tone]}`} style={{ width: `${share}%` }} />
                  </span>
                  {i < STAGES.length - 1 && (
                    <ArrowRightIcon className="absolute top-1/2 -right-2.5 z-10 hidden h-4 w-4 -translate-y-1/2 text-gray-100/30 xl:block" />
                  )}
                </button>
              </li>
            );
          })}
        </ol>

        <SegmentBar
          className="mt-4 h-2"
          segments={STAGES.map((s) => ({ label: s.label, value: columns[s.key].length, tone: s.tone }))}
        />

        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-100">
          {stats.map((s) => (
            <span key={s.title} className="inline-flex items-center gap-2">
              {s.title}
              <span className="font-semibold text-primary tabular-nums">
                {s.value}
                {s.total !== undefined ? `/${s.total}` : ""}
              </span>
              <DeltaChip value={s.delta ?? null} />
            </span>
          ))}
          <Illustrative />
        </div>
      </section>

      {/* ── Quadro ── */}
      <section className="rounded-[2rem] bg-white p-3 ring-1 ring-black/5 sm:p-4">
        {total === 0 && (
          <div className="m-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-light-secondary px-4 py-3 text-sm text-primary">
            Nenhum cliente na esteira ainda.
            <button type="button" onClick={actions.newClient} className="text-xs font-medium text-secondary hover:text-primary">
              Cadastrar o primeiro →
            </button>
          </div>
        )}
        <div className="flex snap-x gap-3 overflow-x-auto p-1 pb-3 [scrollbar-width:thin]">
          {STAGES.map((s) => {
            const cards = columns[s.key];
            const open = expanded[s.key] ?? false;
            const shown = open ? cards : cards.slice(0, COLUMN_LIMIT);
            return (
              <div
                key={s.key}
                id={`esteira-col-${s.key}`}
                className={`flex w-64 shrink-0 snap-start flex-col rounded-3xl p-3 transition ${
                  focus === s.key ? "bg-light-secondary ring-2 ring-secondary/40" : "bg-page"
                } ${focus && focus !== s.key ? "opacity-60" : ""}`}
              >
                <header className="mb-3 flex items-center justify-between gap-2 px-1">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${TONE_BG[s.tone]}`} />
                    <span className="truncate text-xs font-medium text-primary">{s.label}</span>
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${TONE_SOFT[s.tone]}`}>
                    {cards.length}
                  </span>
                </header>
                <ul className="flex flex-col gap-2">
                  {shown.length === 0 && (
                    <li className="rounded-2xl border border-dashed border-black/10 px-3 py-6 text-center text-[11px] text-gray-100/60">
                      Sem clientes nesta etapa
                    </li>
                  )}
                  {shown.map((card) => (
                    <BoardCard key={card.id} card={card} stage={s} onMove={move} />
                  ))}
                </ul>
                {cards.length > COLUMN_LIMIT && (
                  <button
                    type="button"
                    onClick={() => setExpanded((prev) => ({ ...prev, [s.key]: !open }))}
                    className="mt-2 rounded-xl py-1.5 text-[11px] font-medium text-gray-100 hover:bg-white hover:text-primary"
                  >
                    {open ? "Mostrar menos" : `+ ${cards.length - COLUMN_LIMIT} ${plural(cards.length - COLUMN_LIMIT, "cliente", "clientes")}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Faixa do resto ── */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MiniCard icon={UsersIcon} title="Leads" onClick={actions.openLeads} link="Entrar em contato">
          <p className="text-3xl font-semibold text-primary tabular-nums">{leadsValue(pendingCount)}</p>
          <p className="text-xs text-gray-100">formulários que ainda não viraram clientes</p>
        </MiniCard>

        <MiniCard icon={CalendarIcon} title="Agenda" onClick={actions.openAgenda} link="Abrir agenda">
          {upcomingAppointments === null ? (
            <LinesSkeleton rows={2} rowClassName="h-6" />
          ) : appts.length === 0 ? (
            <p className="text-sm text-gray-100/70">Nenhum compromisso à frente.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {appts.slice(0, 3).map((a) => (
                <li key={a.id} className="flex items-baseline gap-2 text-xs">
                  <span className="w-20 shrink-0 text-gray-100 tabular-nums">
                    {dayLabel(a.startAt, now).replace(/,.*/, "")} {localTime(a.startAt)}
                  </span>
                  <span className="truncate text-primary">{a.title}</span>
                </li>
              ))}
            </ul>
          )}
        </MiniCard>

        <MiniCard icon={ReceiptIcon} title="Financeiro" onClick={actions.seeAllPayments} link="Ver pagamentos">
          {upcomingPayments.length === 0 ? (
            <p className="text-sm text-gray-100/70">Nenhum recebimento previsto.</p>
          ) : (
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-100">
              <span>
                <span className="text-lg font-semibold text-danger tabular-nums">{pay.overdue.count}</span> atrasados
              </span>
              <span>
                <span className="text-lg font-semibold text-previsto tabular-nums">{pay.upcoming.count}</span> previstos
              </span>
            </p>
          )}
          <p className="mt-1 text-[11px] text-gray-100">
            Saídas do mês:{" "}
            <span className="font-medium text-primary tabular-nums">
              {outflow.slices.length ? money(outflow.total) : "—"}
            </span>
          </p>
        </MiniCard>

        <MiniCard icon={DocumentIcon} title="Documentos" onClick={actions.openClients} link="Ver clientes" illustrative>
          {pendingDocuments.length === 0 ? (
            <p className="text-sm text-gray-100/70">Nenhuma pendência.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {pendingDocuments.slice(0, 3).map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate text-primary">{d.name}</span>
                  <span className={`shrink-0 ${d.isCritical ? "text-danger" : "text-gray-100"}`}>{d.issue}</span>
                </li>
              ))}
            </ul>
          )}
        </MiniCard>
      </section>
    </div>
  );
}

function BoardCard({
  card,
  stage,
  onMove,
}: {
  card: PipelineCard;
  stage: Stage;
  onMove: (cardId: string, situation: SituationKey) => void;
}) {
  const next = nextStageOf(card.situation);
  return (
    <li className="group rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5 transition hover:shadow-lg hover:shadow-primary/5">
      <div className="flex items-center gap-2.5">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${TONE_SOFT[stage.tone]}`}>
          {initials(card.name)}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-xs font-medium text-primary">{card.name}</span>
          <span className="text-[10px] text-gray-100 tabular-nums">desde {card.date}</span>
        </span>
      </div>
      <div className="mt-2.5 flex items-center gap-1.5">
        <StageSelect card={card} onMove={onMove} className="flex-1" />
        {next && (
          <button
            type="button"
            onClick={() => onMove(card.id, next.key)}
            title={`Avançar para ${next.label}`}
            aria-label={`Avançar ${card.name} para ${next.label}`}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary text-white transition hover:bg-primary/90 active:scale-95"
          >
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </li>
  );
}

function MiniCard({
  icon: Icon,
  title,
  link,
  onClick,
  illustrative = false,
  children,
}: {
  icon: IconComponent;
  title: string;
  link: string;
  onClick: () => void;
  illustrative?: boolean;
  children: ReactNode;
}) {
  return (
    <article className="flex flex-col rounded-3xl bg-white p-5 ring-1 ring-black/5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-medium text-primary">
          <Icon className="h-4 w-4 text-secondary" /> {title}
        </span>
        {illustrative && <Illustrative />}
      </div>
      <div className="flex-1">{children}</div>
      <button
        type="button"
        onClick={onClick}
        className="mt-4 self-start text-xs font-medium text-secondary hover:text-primary"
      >
        {link} →
      </button>
    </article>
  );
}

