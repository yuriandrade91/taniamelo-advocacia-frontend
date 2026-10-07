"use client";

import { useState, type ReactNode } from "react";
import type { SituationKey } from "@/enums/situation/Situation";
import { CalendarIcon, WalletIcon } from "@/components/ui/icons/glyphs";
import { TONE_BG } from "@/components/ui/models/viz";
import {
  ApptTile,
  BucketPill,
  Empty,
  Illustrative,
  Kicker,
  LinesSkeleton,
  LinkButton,
  QuickActions,
  STAGES,
  StageSelect,
  activeAppointments,
  dayLabel,
  dueLabel,
  firstName,
  instantParts,
  leadsValue,
  localTime,
  money,
  plural,
  stageOf,
  summarizePayments,
  usePipeline,
  useNow,
  clock,
} from "./homeKit";
import { financeEmptyText, openPayments, todayOnly } from "./homeKit2";
import type { HomeModelProps } from "./shared";

/**
 * 18 · Colmeia — os números do dia em favos hexagonais.
 *
 * Duas colmeias (recortadas com `clip-path`): à esquerda os números do dia
 * em volta do favo de hoje; à direita as seis etapas da esteira em volta do
 * total. Clicar num favo de etapa abre os clientes dela, com a troca de
 * etapa ali mesmo. Embaixo, agenda e recebimentos com marcadores de favo.
 */

const CLIP = "[clip-path:polygon(50%_0,100%_25%,100%_75%,50%_100%,0_75%,0_25%)]";
const SIZE = "h-[106px] w-[92px] sm:h-32 sm:w-[111px] lg:h-[150px] lg:w-[130px]";
const OVERLAP = "-mt-[21px] sm:-mt-[27px] lg:-mt-[32px]";

type Fill = { edge: string; face: string };

const FILLS = {
  white: { edge: "bg-primary/10", face: "bg-white text-primary" },
  gold: { edge: "bg-secondary", face: "bg-linear-to-br from-[#f3d79c] via-secondary to-[#7a5418] text-white" },
  navy: { edge: "bg-primary", face: "bg-primary text-white" },
  violet: { edge: "bg-violet-500/30", face: "bg-violet-50 text-violet-800" },
  danger: { edge: "bg-danger/40", face: "bg-rose-50 text-danger" },
  previsto: { edge: "bg-previsto/30", face: "bg-orange-50 text-previsto" },
  sky: { edge: "bg-sky-500/30", face: "bg-sky-50 text-sky-800" },
  amber: { edge: "bg-secondary/40", face: "bg-amber-50 text-[#7a5418]" },
  gray: { edge: "bg-black/10", face: "bg-page text-gray-100" },
} satisfies Record<string, Fill>;

function Hex({
  fill,
  onClick,
  label,
  pressed,
  children,
}: {
  fill: Fill;
  onClick?: () => void;
  label: string;
  pressed?: boolean;
  children: ReactNode;
}) {
  const inner = (
    <>
      <span className={`absolute inset-0 ${CLIP} ${fill.edge}`} />
      <span className={`absolute inset-[2px] grid place-items-center ${CLIP} ${fill.face}`}>
        <span className="flex max-w-[78%] flex-col items-center text-center">{children}</span>
      </span>
    </>
  );
  const base = `relative shrink-0 ${SIZE}`;
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      className={`${base} transition duration-200 hover:z-10 motion-safe:hover:scale-[1.06] focus-visible:z-10 focus-visible:outline-none focus-visible:[&>span:first-child]:bg-secondary`}
    >
      {inner}
    </button>
  ) : (
    <div className={base} role="img" aria-label={label}>
      {inner}
    </div>
  );
}

function Comb({ rows }: { rows: ReactNode[][] }) {
  return (
    <div className="flex flex-col items-center [filter:drop-shadow(0_10px_14px_rgba(9,13,76,0.12))]">
      {rows.map((row, r) => (
        <div key={r} className={`flex gap-1.5 ${r ? OVERLAP : ""}`}>
          {row}
        </div>
      ))}
    </div>
  );
}

function Cell({ kicker, value, label }: { kicker?: string; value: string; label: string }) {
  return (
    <>
      {kicker && <span className="text-[8px] tracking-[0.2em] uppercase opacity-70 sm:text-[9px]">{kicker}</span>}
      <span className="text-2xl leading-none font-light tabular-nums sm:text-3xl lg:text-4xl">{value}</span>
      <span className="mt-1 text-[9px] leading-tight sm:text-[11px]">{label}</span>
    </>
  );
}

function HexBullet({ className }: { className: string }) {
  return <span className={`h-3.5 w-3 shrink-0 ${CLIP} ${className}`} />;
}

export function HoneycombModel(props: HomeModelProps) {
  const {
    pendingCount,
    stats,
    canSeeFinance,
    upcomingPayments,
    pendingDocuments,
    pipeline,
    upcomingAppointments,
    periodLabel,
    actions,
  } = props;
  const now = useNow();
  const [selected, setSelected] = useState<SituationKey | null>(null);
  const loadingAppts = upcomingAppointments === null;
  const appts = activeAppointments(upcomingAppointments);
  const today = todayOnly(appts, now);
  const pay = summarizePayments(upcomingPayments);
  const open = openPayments(upcomingPayments);
  const { columns, total, move } = usePipeline(pipeline, actions.moveCard);
  const todayParts = instantParts(new Date(now).toISOString());
  const critical = pendingDocuments.filter((d) => d.isCritical).length;

  const stageHex = (index: number) => {
    const s = STAGES[index];
    const count = columns[s.key].length;
    const on = selected === s.key;
    return (
      <Hex
        key={s.key}
        fill={on ? FILLS.navy : FILLS.white}
        onClick={() => setSelected(on ? null : s.key)}
        pressed={on}
        label={`${s.label}: ${count} ${plural(count, "cliente", "clientes")}`}
      >
        <span className={`mb-1 h-1.5 w-6 rounded-full ${TONE_BG[s.tone]}`} />
        <Cell kicker={String(index + 1).padStart(2, "0")} value={String(count)} label={s.short} />
      </Hex>
    );
  };

  const numbers: ReactNode[][] = [
    [
      <Hex key="leads" fill={FILLS.amber} onClick={actions.openLeads} label={`Leads aguardando: ${leadsValue(pendingCount)}`}>
        <Cell kicker="leads" value={leadsValue(pendingCount)} label="aguardando" />
      </Hex>,
      <Hex key="agenda" fill={FILLS.violet} onClick={actions.openAgenda} label="Compromissos hoje">
        <Cell kicker="agenda" value={loadingAppts ? "—" : String(today.length)} label="hoje" />
      </Hex>,
    ],
    [
      <Hex key="late" fill={FILLS.danger} onClick={actions.seeAllPayments} label="Recebimentos atrasados">
        <Cell kicker="atraso" value={canSeeFinance ? String(pay.overdue.count) : "—"} label={canSeeFinance ? money(pay.overdue.amount) : "restrito"} />
      </Hex>,
      <Hex key="today" fill={FILLS.gold} label={`Hoje, ${todayParts.day} de ${todayParts.month}`}>
        <span className="text-[9px] tracking-[0.2em] uppercase opacity-90 sm:text-[10px]">{todayParts.weekday}</span>
        <span className="text-3xl leading-none font-semibold tabular-nums sm:text-4xl lg:text-5xl">{todayParts.day}</span>
        <span className="mt-1 text-[10px] tabular-nums opacity-90 sm:text-xs">{clock(now)}</span>
      </Hex>,
      <Hex key="soon" fill={FILLS.previsto} onClick={actions.seeAllPayments} label="Recebimentos previstos">
        <Cell kicker="previsto" value={canSeeFinance ? String(pay.upcoming.count) : "—"} label={canSeeFinance ? money(pay.upcoming.amount) : "restrito"} />
      </Hex>,
    ],
    [
      <Hex key="docs" fill={FILLS.gray} onClick={actions.openClients} label="Documentos pendentes (ilustrativo)">
        <Cell kicker="docs*" value={String(pendingDocuments.length)} label={critical ? `${critical} ${plural(critical, "crítico", "críticos")}` : "pendentes"} />
      </Hex>,
      <Hex key="clients" fill={FILLS.sky} onClick={actions.openClients} label="Clientes na esteira">
        <Cell kicker="esteira" value={String(total)} label={plural(total, "cliente", "clientes")} />
      </Hex>,
    ],
  ];

  const stagesComb: ReactNode[][] = [
    [stageHex(0), stageHex(1)],
    [
      stageHex(2),
      <Hex key="total" fill={FILLS.gold} onClick={actions.openClients} label={`Esteira: ${total} clientes. Abrir clientes`}>
        <Cell kicker="esteira" value={String(total)} label="no total" />
      </Hex>,
      stageHex(3),
    ],
    [stageHex(4), stageHex(5)],
  ];

  const sel = selected ? stageOf(selected) : null;
  const selCards = selected ? columns[selected] : [];

  return (
    <section className="relative isolate overflow-hidden rounded-[2rem] bg-white p-4 ring-1 ring-black/5 sm:p-8">
      <span className="pointer-events-none absolute -top-32 left-1/4 -z-10 h-80 w-80 rounded-full bg-secondary/15 blur-[100px]" />
      <span className="pointer-events-none absolute -right-24 bottom-0 -z-10 h-80 w-80 rounded-full bg-sky-400/10 blur-[100px]" />

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Kicker className="text-secondary">Colmeia · {periodLabel}</Kicker>
          <h1 className="mt-2 text-3xl font-light tracking-tight text-primary sm:text-4xl">O escritório, favo a favo</h1>
        </div>
        <QuickActions actions={actions} pendingCount={pendingCount} />
      </header>

      <div className="mt-8 grid grid-cols-1 gap-10 xl:grid-cols-2">
        <div>
          <p className="mb-4 text-center text-xs font-medium tracking-[0.18em] text-gray-100 uppercase">Números do dia</p>
          <Comb rows={numbers} />
          <p className="mt-3 text-center text-[10px] text-gray-100/70">* documentos ilustrativos</p>
        </div>
        <div>
          <p className="mb-4 text-center text-xs font-medium tracking-[0.18em] text-gray-100 uppercase">Etapas da esteira</p>
          <Comb rows={stagesComb} />
          <p className="mt-3 text-center text-[10px] text-gray-100/70">Toque numa etapa para ver os clientes</p>
        </div>
      </div>

      {/* Etapa escolhida */}
      {sel && (
        <article className="mt-8 rounded-3xl bg-page p-5 ring-1 ring-black/5">
          <div className="flex flex-wrap items-center gap-3">
            <HexBullet className={TONE_BG[sel.tone]} />
            <h2 className="min-w-0 flex-1 text-sm font-medium text-primary">{sel.label}</h2>
            <span className="text-xs text-gray-100 tabular-nums">
              {selCards.length} {plural(selCards.length, "cliente", "clientes")}
            </span>
            <button type="button" onClick={() => setSelected(null)} className="text-xs text-gray-100 hover:text-primary">
              Fechar
            </button>
          </div>
          {selCards.length === 0 ? (
            <Empty className="mt-4">Nenhum cliente nesta etapa.</Empty>
          ) : (
            <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {selCards.slice(0, 12).map((card) => (
                <li key={card.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-black/5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-primary">{card.name}</span>
                    <span className="block text-[11px] text-gray-100">desde {card.date}</span>
                  </span>
                  <StageSelect card={card} onMove={move} className="w-36 shrink-0" />
                </li>
              ))}
            </ul>
          )}
          {selCards.length > 12 && (
            <LinkButton onClick={actions.openClients} className="mt-3">
              Mais {selCards.length - 12} em clientes
            </LinkButton>
          )}
        </article>
      )}

      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Agenda */}
        <article className="rounded-3xl bg-white p-5 ring-1 ring-black/5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-primary">Próximos compromissos</h2>
            <LinkButton onClick={actions.openAgenda}>Agenda</LinkButton>
          </div>
          {loadingAppts ? (
            <LinesSkeleton className="mt-4" rows={3} />
          ) : appts.length === 0 ? (
            <Empty icon={CalendarIcon} className="mt-4">Agenda livre.</Empty>
          ) : (
            <ul className="mt-4 flex flex-col gap-2.5">
              {appts.slice(0, 4).map((a) => (
                <li key={a.id} className="flex items-center gap-3">
                  <ApptTile type={String(a.type)} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-primary">{a.title}</span>
                    <span className="block text-[11px] text-gray-100">
                      {dayLabel(a.startAt, now)} · {localTime(a.startAt)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>

        {/* Recebimentos */}
        <article className="rounded-3xl bg-white p-5 ring-1 ring-black/5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-primary">Recebimentos em aberto</h2>
            <LinkButton onClick={actions.seeAllPayments}>Pagamentos</LinkButton>
          </div>
          {!canSeeFinance || open.length === 0 ? (
            <Empty icon={WalletIcon} className="mt-4">{financeEmptyText(canSeeFinance)}</Empty>
          ) : (
            <ul className="mt-4 flex flex-col gap-2.5">
              {open.slice(0, 4).map((p) => (
                <li key={p.id} className="flex items-center gap-3">
                  <HexBullet className="bg-secondary" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-primary">{firstName(p.clientName)}</span>
                    <span className="block text-[11px] text-gray-100">{dueLabel(p.dueDate, now)}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-sm font-medium text-primary tabular-nums">{p.amount ? money(p.amount) : "—"}</span>
                    <BucketPill payment={p} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>

        {/* Documentos + indicadores */}
        <article className="rounded-3xl bg-white p-5 ring-1 ring-black/5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-primary">Documentos e indicadores</h2>
            <Illustrative />
          </div>
          {pendingDocuments.length === 0 ? (
            <Empty className="mt-4">Nenhum documento pendente.</Empty>
          ) : (
            <ul className="mt-4 flex flex-col gap-2">
              {pendingDocuments.slice(0, 3).map((d) => (
                <li key={d.id} className="flex items-start gap-2.5 text-xs">
                  <HexBullet className={`mt-0.5 ${d.isCritical ? "bg-danger" : "bg-gray-100/30"}`} />
                  <span className="min-w-0">
                    <span className="block truncate text-primary">{d.name}</span>
                    <span className={d.isCritical ? "text-danger" : "text-gray-100"}>{d.issue}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {stats.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-black/5 pt-3">
              {stats.map((s) => (
                <li key={s.title} className="min-w-0">
                  <span className="block text-lg font-light text-primary tabular-nums">
                    {s.value}
                    {s.total ? <span className="text-xs text-gray-100">/{s.total}</span> : null}
                  </span>
                  <span className="block max-w-[9rem] truncate text-[10px] text-gray-100">{s.title}</span>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>
    </section>
  );
}
