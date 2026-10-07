"use client";

import { useCallback, useRef, useState } from "react";
import type { SituationKey } from "@/enums/situation/Situation";
import type { PipelineCard } from "@/components/home/ContributorPipeline";
import { CalendarIcon, UsersIcon, WalletIcon } from "@/components/ui/icons/glyphs";
import { TONE, TONE_BG, TONE_SOFT } from "@/components/ui/models/viz";
import {
  Empty,
  Kicker,
  LinkButton,
  PlusIcon,
  STAGES,
  activeAppointments,
  initials,
  leadsValue,
  money,
  nextStageOf,
  plural,
  relativeTo,
  stageOf,
  summarizePayments,
  usePipeline,
  useNow,
} from "./homeKit";
import { useDismiss } from "@/hooks/useDismiss";
import type { HomeModelProps } from "./shared";

/**
 * 16 · Órbitas — a esteira como um sistema solar.
 *
 * O escritório no centro; cada etapa é um anel e cada cliente, um ponto que
 * gira devagar (para sob o mouse e com "reduzir movimento"). Quanto mais
 * perto do centro, mais perto do benefício. Clique num anel, num ponto ou na
 * legenda para ver a etapa; o menu "Mover" leva o cliente para outra etapa.
 */

const SIZE = 600;
const C = SIZE / 2;
/** Raio de cada etapa: a primeira por fora, o benefício concluído junto ao centro. */
const RADII = [272, 236, 200, 164, 128, 92];
const SUN = 52;
const MAX_DOTS = 18;

const SPIN = [
  "motion-safe:animate-[spin_180s_linear_infinite]",
  "motion-safe:animate-[spin_150s_linear_infinite] [animation-direction:reverse]",
  "motion-safe:animate-[spin_125s_linear_infinite]",
  "motion-safe:animate-[spin_105s_linear_infinite] [animation-direction:reverse]",
  "motion-safe:animate-[spin_90s_linear_infinite]",
  "motion-safe:animate-[spin_75s_linear_infinite] [animation-direction:reverse]",
];

function MoveMenu({
  card,
  onMove,
  onClose,
}: {
  card: PipelineCard;
  onMove: (cardId: string, to: SituationKey) => void;
  onClose: () => void;
}) {
  const next = nextStageOf(card.situation);
  return (
    <div
      role="menu"
      aria-label={`Mover ${card.name}`}
      className="absolute top-full right-0 z-30 mt-1.5 w-60 rounded-2xl bg-white p-1.5 shadow-xl ring-1 ring-black/10"
    >
      {next && (
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onMove(card.id, next.key);
            onClose();
          }}
          className="flex w-full items-center gap-2 rounded-xl bg-primary px-3 py-2 text-left text-xs font-medium text-white transition hover:bg-primary/90"
        >
          Avançar para {next.short} <span aria-hidden="true" className="ml-auto">→</span>
        </button>
      )}
      <p className="px-3 pt-2 pb-1 text-[10px] tracking-widest text-gray-100/70 uppercase">Ou escolha a etapa</p>
      {STAGES.map((s) => {
        const current = s.key === card.situation;
        return (
          <button
            key={s.key}
            type="button"
            role="menuitem"
            disabled={current}
            onClick={() => {
              onMove(card.id, s.key);
              onClose();
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-left text-xs text-primary transition hover:bg-page disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <span className={`h-2 w-2 shrink-0 rounded-full ${TONE_BG[s.tone]}`} />
            <span className="min-w-0 flex-1 truncate">{s.label}</span>
            {current && <span className="text-[10px] text-gray-100">atual</span>}
          </button>
        );
      })}
    </div>
  );
}

export function OrbitsModel(props: HomeModelProps) {
  const { pendingCount, canSeeFinance, upcomingPayments, pipeline, upcomingAppointments, periodLabel, actions } = props;
  const now = useNow();
  const { columns, total, max, move } = usePipeline(pipeline, actions.moveCard);
  const [selected, setSelected] = useState<SituationKey | null>(null);
  const [focusClient, setFocusClient] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeMenu = useCallback(() => setMenuFor(null), []);
  useDismiss(menuFor !== null, closeMenu, menuRef);

  const appts = activeAppointments(upcomingAppointments);
  const pay = summarizePayments(upcomingPayments);
  const stageKey = selected ?? STAGES.find((s) => columns[s.key].length > 0)?.key ?? STAGES[0].key;
  const stage = stageOf(stageKey);
  const stageCards = columns[stageKey];

  const pick = (key: SituationKey, clientId: string | null = null) => {
    setSelected(key);
    setFocusClient(clientId);
    setMenuFor(null);
  };

  return (
    <section className="relative isolate overflow-hidden rounded-[2rem] bg-white p-4 ring-1 ring-black/5 sm:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <Kicker className="text-secondary">Órbitas · {periodLabel}</Kicker>
          <h1 className="mt-2 text-3xl font-light tracking-tight text-primary sm:text-4xl">
            {total} {plural(total, "cliente", "clientes")} em órbita
          </h1>
          <p className="mt-1 max-w-xl text-sm text-gray-100">
            Cada anel é uma etapa da esteira — quanto mais perto do centro, mais perto do benefício.
          </p>
        </div>
        <button
          type="button"
          onClick={actions.newClient}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-medium text-white shadow-lg shadow-primary/20 transition hover:bg-primary/90"
        >
          <PlusIcon className="h-4 w-4" /> Novo cliente
        </button>
      </header>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {/* Sistema */}
        <div className="group relative mx-auto aspect-square w-full max-w-[36rem]">
          <span className="pointer-events-none absolute inset-[18%] -z-10 rounded-full bg-secondary/15 blur-3xl" />

          {/* Anéis (fixos, clicáveis) */}
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 h-full w-full" aria-hidden="true">
            <defs>
              <radialGradient id="orbits-sun" cx="40%" cy="35%" r="70%">
                <stop offset="0%" stopColor="#f3d79c" />
                <stop offset="55%" stopColor="#b5843c" />
                <stop offset="100%" stopColor="#6b4a17" />
              </radialGradient>
            </defs>
            {STAGES.map((s, i) => {
              const on = s.key === stageKey;
              return (
                <g key={s.key} className="cursor-pointer" onClick={() => pick(s.key)}>
                  <circle cx={C} cy={C} r={RADII[i]} fill="none" stroke="transparent" strokeWidth={30} pointerEvents="stroke" />
                  <circle
                    cx={C}
                    cy={C}
                    r={RADII[i]}
                    fill="none"
                    stroke={on ? TONE[s.tone] : "rgba(9,13,76,0.12)"}
                    strokeWidth={on ? 2.5 : 1}
                    strokeDasharray={on ? undefined : "3 6"}
                    className="transition-all duration-300"
                  />
                  {columns[s.key].length > MAX_DOTS && (
                    <text x={C} y={C - RADII[i] - 9} textAnchor="middle" fontSize={13} fontWeight={600} fill={TONE[s.tone]}>
                      +{columns[s.key].length - MAX_DOTS}
                    </text>
                  )}
                </g>
              );
            })}
            <circle cx={C} cy={C} r={SUN + 16} fill="rgba(181,132,60,0.14)" />
            <circle cx={C} cy={C} r={SUN} fill="url(#orbits-sun)" />
          </svg>

          {/* Clientes (giram) */}
          {STAGES.map((s, i) => {
            const cards = columns[s.key];
            const shown = cards.slice(0, MAX_DOTS);
            const offset = i * 0.9;
            return (
              <svg
                key={s.key}
                viewBox={`0 0 ${SIZE} ${SIZE}`}
                aria-hidden="true"
                className={`pointer-events-none absolute inset-0 h-full w-full group-hover:[animation-play-state:paused] ${SPIN[i]}`}
              >
                {shown.map((card, k) => {
                  const angle = (2 * Math.PI * k) / Math.max(shown.length, 1) + offset;
                  const x = C + RADII[i] * Math.cos(angle);
                  const y = C + RADII[i] * Math.sin(angle);
                  const focused = card.id === focusClient;
                  return (
                    <g key={card.id} className="pointer-events-auto cursor-pointer" onClick={() => pick(s.key, card.id)}>
                      <title>{`${card.name} · ${s.label}`}</title>
                      <circle cx={x} cy={y} r={14} fill="transparent" />
                      {focused && <circle cx={x} cy={y} r={13} fill="none" stroke={TONE[s.tone]} strokeWidth={2} />}
                      <circle
                        cx={x}
                        cy={y}
                        r={focused ? 9 : 7}
                        fill={TONE[s.tone]}
                        stroke="white"
                        strokeWidth={2.5}
                        opacity={s.key === stageKey || !selected ? 1 : 0.45}
                      />
                    </g>
                  );
                })}
              </svg>
            );
          })}

          {/* Centro */}
          <button
            type="button"
            onClick={actions.openClients}
            className="absolute top-1/2 left-1/2 grid h-[17%] w-[17%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-white"
            aria-label={`Escritório: ${total} clientes. Abrir clientes`}
          >
            <span className="flex flex-col items-center leading-none">
              <span className="text-xl font-semibold tabular-nums sm:text-3xl">{total}</span>
              <span className="mt-0.5 text-[8px] tracking-widest uppercase opacity-80 sm:text-[10px]">escritório</span>
            </span>
          </button>

          {total === 0 && (
            <p className="absolute inset-x-0 bottom-2 text-center text-xs text-gray-100">
              Nenhum cliente na esteira ainda — as órbitas estão vazias.
            </p>
          )}
        </div>

        {/* Legenda + etapa escolhida */}
        <div className="flex min-w-0 flex-col gap-4">
          <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-1" aria-label="Etapas">
            {STAGES.map((s, i) => {
              const count = columns[s.key].length;
              const on = s.key === stageKey;
              return (
                <li key={s.key}>
                  <button
                    type="button"
                    onClick={() => pick(s.key)}
                    aria-pressed={on}
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition ${
                      on ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-primary hover:bg-page"
                    }`}
                  >
                    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-semibold ${on ? "bg-white/15" : TONE_SOFT[s.tone]}`}>
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium">{s.label}</span>
                      <span className={`mt-1 block h-1 overflow-hidden rounded-full ${on ? "bg-white/15" : "bg-page"}`}>
                        <span className={`block h-full rounded-full ${TONE_BG[s.tone]}`} style={{ width: `${(count / max) * 100}%` }} />
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">{count}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          <article className="rounded-3xl bg-page p-4 ring-1 ring-black/5">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${TONE_BG[stage.tone]}`} />
              <h2 className="min-w-0 flex-1 truncate text-sm font-medium text-primary">{stage.label}</h2>
              <span className="text-xs text-gray-100 tabular-nums">
                {stageCards.length} {plural(stageCards.length, "cliente", "clientes")}
              </span>
            </div>
            {stageCards.length === 0 ? (
              <Empty className="mt-3">Ninguém nesta órbita agora.</Empty>
            ) : (
              <ul className="mt-3 flex flex-col gap-1.5">
                {stageCards.slice(0, 10).map((card) => (
                  <li
                    key={card.id}
                    className={`relative flex items-center gap-3 rounded-2xl bg-white px-3 py-2 ring-1 transition ${
                      card.id === focusClient ? "ring-secondary" : "ring-black/5"
                    }`}
                  >
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${TONE_SOFT[stage.tone]}`}>
                      {initials(card.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-primary">{card.name}</span>
                      <span className="block text-[11px] text-gray-100">desde {card.date}</span>
                    </span>
                    <div className="relative shrink-0" ref={menuFor === card.id ? menuRef : undefined}>
                      <button
                        type="button"
                        aria-haspopup="menu"
                        aria-expanded={menuFor === card.id}
                        onClick={() => setMenuFor((cur) => (cur === card.id ? null : card.id))}
                        className="rounded-full bg-page px-3 py-1 text-[11px] font-medium text-primary ring-1 ring-black/5 transition hover:bg-light-gray/60"
                      >
                        Mover ▾
                      </button>
                      {menuFor === card.id && <MoveMenu card={card} onMove={move} onClose={closeMenu} />}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {stageCards.length > 10 && (
              <LinkButton onClick={actions.openClients} className="mt-3">
                Mais {stageCards.length - 10} em clientes
              </LinkButton>
            )}
          </article>
        </div>
      </div>

      {/* Satélites */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button type="button" onClick={actions.openLeads} className="flex items-center gap-3 rounded-2xl bg-page p-4 text-left transition hover:bg-light-gray/50">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-secondary/15 text-secondary"><UsersIcon className="h-5 w-5" /></span>
          <span className="min-w-0">
            <span className="block text-xl font-semibold text-primary tabular-nums">{leadsValue(pendingCount)}</span>
            <span className="block truncate text-xs text-gray-100">leads aguardando entrar em órbita</span>
          </span>
        </button>
        <button type="button" onClick={actions.openAgenda} className="flex items-center gap-3 rounded-2xl bg-page p-4 text-left transition hover:bg-light-gray/50">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-violet-500/10 text-violet-700"><CalendarIcon className="h-5 w-5" /></span>
          <span className="min-w-0">
            <span className="block text-xl font-semibold text-primary tabular-nums">
              {upcomingAppointments === null ? "—" : appts.length}
            </span>
            <span className="block truncate text-xs text-gray-100">
              {upcomingAppointments === null
                ? "carregando a agenda…"
                : appts[0]
                  ? `próximo compromisso ${relativeTo(appts[0].startAt, now)}`
                  : "agenda livre"}
            </span>
          </span>
        </button>
        <button type="button" onClick={actions.seeAllPayments} className="flex items-center gap-3 rounded-2xl bg-page p-4 text-left transition hover:bg-light-gray/50">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-danger/10 text-danger"><WalletIcon className="h-5 w-5" /></span>
          <span className="min-w-0">
            <span className="block text-xl font-semibold text-primary tabular-nums">
              {canSeeFinance ? pay.overdue.count : "—"}
            </span>
            <span className="block truncate text-xs text-gray-100">
              {!canSeeFinance
                ? "recebimentos só para administradores"
                : pay.overdue.count
                  ? `atrasados · ${money(pay.overdue.amount)}`
                  : "nenhum recebimento atrasado"}
            </span>
          </span>
        </button>
      </div>
    </section>
  );
}
