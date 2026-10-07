"use client";

import { useId, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { bucketOf } from "@/components/payments/paymentBuckets";
import {
  AlertIcon,
  CalendarIcon,
  UserIcon,
  UsersIcon,
  WalletIcon,
} from "@/components/ui/icons/glyphs";
import { TONE_BG, TONE_TEXT, type Tone } from "@/components/ui/models/viz";
import {
  Illustrative,
  PlusIcon,
  STAGES,
  activeAppointments,
  dayLabel,
  dueLabel,
  firstName,
  isOngoingAppt,
  leadsValue,
  localTime,
  longDate,
  money,
  plural,
  relativeTo,
  statRatio,
  summarizePayments,
  usePipeline,
  useNow,
  type IconComponent,
} from "./homeKit";
import { financeEmptyText, openPayments, todayOnly } from "./homeKit2";
import type { HomeModelProps } from "./shared";

/**
 * 20 · Neumórfico — interface macia, em alto e baixo-relevo.
 *
 * Tudo sai da mesma base cinza-clara: o que se aperta está em relevo (luz em
 * cima à esquerda, sombra embaixo à direita) e afunda ao ser pressionado;
 * trilhos e poços são cavados. Um mostrador central com os leads, controles
 * redondos para os atalhos e um seletor segmentado que troca o painel.
 */

const RAISED = "bg-[#e7eaf0] shadow-[9px_9px_18px_#c3c7d0,-9px_-9px_18px_#ffffff]";
const RAISED_SM = "bg-[#e7eaf0] shadow-[5px_5px_10px_#c3c7d0,-5px_-5px_10px_#ffffff]";
const PRESSED = "bg-[#e7eaf0] shadow-[inset_6px_6px_12px_#c3c7d0,inset_-6px_-6px_12px_#ffffff]";
const PRESSED_SM = "bg-[#e7eaf0] shadow-[inset_3px_3px_6px_#c3c7d0,inset_-3px_-3px_6px_#ffffff]";
const PUSH =
  "transition-shadow duration-200 active:shadow-[inset_4px_4px_8px_#c3c7d0,inset_-4px_-4px_8px_#ffffff] motion-reduce:transition-none";

type Tab = "agenda" | "recebimentos" | "esteira" | "documentos";
const TABS: { key: Tab; label: string }[] = [
  { key: "agenda", label: "Agenda" },
  { key: "recebimentos", label: "Recebimentos" },
  { key: "esteira", label: "Esteira" },
  { key: "documentos", label: "Documentos" },
];

function Well({ icon: Icon, tone }: { icon: IconComponent; tone: Tone }) {
  return (
    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${PRESSED_SM}`}>
      <Icon className={`h-5 w-5 ${TONE_TEXT[tone]}`} />
    </span>
  );
}

function SoftEmpty({ children }: { children: ReactNode }) {
  return <p className={`rounded-2xl px-4 py-6 text-center text-sm text-gray-100 ${PRESSED_SM}`}>{children}</p>;
}

function Track({ ratio, tone = "secondary" }: { ratio: number; tone?: Tone }) {
  return (
    <span className={`block h-3 rounded-full p-[3px] ${PRESSED_SM}`}>
      <span
        className={`block h-full rounded-full ${TONE_BG[tone]} shadow-[2px_2px_4px_#c3c7d0] transition-all duration-700 motion-reduce:transition-none`}
        style={{ width: `${Math.max(ratio > 0 ? 6 : 0, ratio * 100)}%` }}
      />
    </span>
  );
}

export function NeumorphicModel(props: HomeModelProps) {
  const {
    pendingCount,
    stats,
    canSeeFinance,
    upcomingPayments,
    outflow,
    pendingDocuments,
    pipeline,
    upcomingAppointments,
    periodLabel,
    actions,
  } = props;
  const now = useNow();
  const baseId = useId();
  const [tab, setTab] = useState<Tab>("agenda");
  const loadingAppts = upcomingAppointments === null;
  const appts = activeAppointments(upcomingAppointments);
  const today = todayOnly(appts, now);
  const pay = summarizePayments(upcomingPayments);
  const open = openPayments(upcomingPayments);
  const { columns, total, max } = usePipeline(pipeline, actions.moveCard);
  const openAmount = pay.overdue.amount + pay.upcoming.amount;

  const controls: { label: string; icon: IconComponent; run: () => void; main?: boolean }[] = [
    { label: "Novo cliente", icon: PlusIcon, run: actions.newClient, main: true },
    { label: "Clientes", icon: UserIcon, run: actions.openClients },
    { label: "Agenda", icon: CalendarIcon, run: actions.openAgenda },
    { label: "Pagamentos", icon: WalletIcon, run: actions.seeAllPayments },
  ];

  const tiles: { label: string; value: string; hint: string; icon: IconComponent; tone: Tone; run: () => void }[] = [
    {
      label: "Compromissos hoje",
      value: loadingAppts ? "—" : String(today.length),
      hint: appts[0] ? `próximo ${relativeTo(appts[0].startAt, now)}` : loadingAppts ? "carregando…" : "agenda livre",
      icon: CalendarIcon,
      tone: "violet",
      run: actions.openAgenda,
    },
    {
      label: "Atrasados",
      value: canSeeFinance ? String(pay.overdue.count) : "—",
      hint: canSeeFinance ? (pay.overdue.count ? money(pay.overdue.amount) : "nenhum atraso") : "só administradores",
      icon: AlertIcon,
      tone: "danger",
      run: actions.seeAllPayments,
    },
    {
      label: "Previstos",
      value: canSeeFinance ? String(pay.upcoming.count) : "—",
      hint: canSeeFinance ? money(pay.upcoming.amount) : "só administradores",
      icon: WalletIcon,
      tone: "previsto",
      run: actions.seeAllPayments,
    },
    {
      label: "Na esteira",
      value: String(total),
      hint: `${columns.BENEFICIO_CONCLUIDO.length} concluídos`,
      icon: UsersIcon,
      tone: "sky",
      run: actions.openClients,
    },
  ];

  const onTabKey = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const index = TABS.findIndex((t) => t.key === tab);
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = TABS[(index + delta + TABS.length) % TABS.length];
    setTab(next.key);
    document.getElementById(`${baseId}-tab-${next.key}`)?.focus();
  };

  const panel = (): ReactNode => {
    if (tab === "agenda") {
      if (loadingAppts)
        return (
          <div className="flex flex-col gap-3" aria-busy="true" aria-label="Carregando">
            {[0, 1, 2].map((i) => (
              <span key={i} className={`h-14 animate-pulse rounded-2xl motion-reduce:animate-none ${PRESSED_SM}`} />
            ))}
          </div>
        );
      if (appts.length === 0) return <SoftEmpty>Agenda livre — nenhum compromisso à frente.</SoftEmpty>;
      return (
        <ul className="flex flex-col gap-3">
          {appts.slice(0, 5).map((a) => {
            const live = isOngoingAppt(a, now);
            return (
              <li key={a.id} className={`flex items-center gap-3 rounded-2xl p-3 ${PRESSED_SM}`}>
                <span className={`shrink-0 rounded-xl px-3 py-1.5 text-sm font-semibold tabular-nums ${RAISED_SM} ${live ? "text-emerald-700" : "text-primary"}`}>
                  {localTime(a.startAt)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-primary">{a.title}</span>
                  <span className="block truncate text-xs text-gray-100">
                    {[dayLabel(a.startAt, now), String(a.type), a.clientName?.trim()].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="hidden shrink-0 text-[11px] text-gray-100 sm:inline">{live ? "agora" : relativeTo(a.startAt, now)}</span>
              </li>
            );
          })}
        </ul>
      );
    }
    if (tab === "recebimentos") {
      if (!canSeeFinance || open.length === 0) return <SoftEmpty>{financeEmptyText(canSeeFinance)}</SoftEmpty>;
      const lateShare = openAmount > 0 ? pay.overdue.amount / openAmount : 0;
      return (
        <>
          <div className="mb-5">
            <div className="flex items-baseline justify-between gap-2 text-xs text-gray-100">
              <span>Atrasado {money(pay.overdue.amount)}</span>
              <span>Em aberto {money(openAmount)}</span>
            </div>
            <span className={`relative mt-2 block h-4 rounded-full ${PRESSED_SM}`}>
              <span
                className={`absolute top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full ${RAISED_SM}`}
                style={{ left: `${Math.min(96, Math.max(4, lateShare * 100))}%` }}
              >
                <span className="absolute inset-2.5 rounded-full bg-danger" />
              </span>
            </span>
            <p className="mt-2 text-[11px] text-gray-100">{Math.round(lateShare * 100)}% do valor em aberto está atrasado</p>
          </div>
          <ul className="flex flex-col gap-3">
            {open.slice(0, 5).map((p) => {
              const late = bucketOf(p) === "overdue";
              return (
                <li key={p.id} className={`flex items-center gap-3 rounded-2xl p-3 ${PRESSED_SM}`}>
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${late ? "bg-danger shadow-[0_0_8px_rgba(243,70,73,0.7)]" : "bg-previsto"}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-primary">{firstName(p.clientName)}</span>
                    <span className="block text-xs text-gray-100">{dueLabel(p.dueDate, now)}</span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-primary tabular-nums">{p.amount ? money(p.amount) : "—"}</span>
                </li>
              );
            })}
          </ul>
        </>
      );
    }
    if (tab === "esteira") {
      if (total === 0) return <SoftEmpty>Nenhum cliente na esteira ainda.</SoftEmpty>;
      return (
        <ul className="flex flex-col gap-4">
          {STAGES.map((s) => {
            const count = columns[s.key].length;
            return (
              <li key={s.key}>
                <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs">
                  <span className="truncate text-primary">{s.label}</span>
                  <span className="font-semibold text-primary tabular-nums">{count}</span>
                </div>
                <Track ratio={count / max} tone={s.tone} />
              </li>
            );
          })}
        </ul>
      );
    }
    if (pendingDocuments.length === 0) return <SoftEmpty>Nenhum documento pendente.</SoftEmpty>;
    return (
      <>
        <ul className="flex flex-col gap-3">
          {pendingDocuments.slice(0, 6).map((d) => (
            <li key={d.id} className="flex items-center gap-3">
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${PRESSED_SM}`}>
                <span className={`h-2.5 w-2.5 rounded-full ${d.isCritical ? "bg-danger shadow-[0_0_8px_rgba(243,70,73,0.7)]" : "bg-gray-100/30"}`} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-primary">{d.name}</span>
                <span className={`block text-xs ${d.isCritical ? "text-danger" : "text-gray-100"}`}>{d.issue}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 flex justify-end">
          <Illustrative />
        </p>
      </>
    );
  };

  const tabAction: Record<Tab, { label: string; run: () => void }> = {
    agenda: { label: "Abrir agenda", run: actions.openAgenda },
    recebimentos: { label: "Ver pagamentos", run: actions.seeAllPayments },
    esteira: { label: "Abrir clientes", run: actions.openClients },
    documentos: { label: "Ver clientes", run: actions.openClients },
  };

  return (
    <section className="overflow-hidden rounded-[2rem] bg-[#e7eaf0] p-5 text-primary sm:p-10">
      {/* Cabeçalho + controles */}
      <header className="flex flex-wrap items-center justify-between gap-6">
        <div>
          <p className="text-xs tracking-[0.2em] text-gray-100 uppercase">{longDate(now)}</p>
          <h1 className="mt-1 text-3xl font-light tracking-tight">Início · {periodLabel}</h1>
        </div>
        <nav className="flex flex-wrap gap-4" aria-label="Atalhos">
          {controls.map((c) => {
            const Icon = c.icon;
            return (
              <button key={c.label} type="button" onClick={c.run} className="group flex flex-col items-center gap-2" aria-label={c.label}>
                <span className={`grid h-12 w-12 place-items-center rounded-full ${RAISED_SM} ${PUSH} ${c.main ? "text-secondary" : "text-primary"}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="hidden text-[11px] text-gray-100 sm:block">{c.label}</span>
              </button>
            );
          })}
        </nav>
      </header>

      {/* Mostrador + números */}
      <div className="mt-10 grid grid-cols-1 items-center gap-8 lg:grid-cols-[auto_minmax(0,1fr)]">
        <button
          type="button"
          onClick={actions.openLeads}
          aria-label={`Leads aguardando: ${leadsValue(pendingCount)}. Abrir leads`}
          className={`mx-auto grid h-56 w-56 place-items-center rounded-full ${RAISED} ${PUSH}`}
        >
          <span className={`grid h-44 w-44 place-items-center rounded-full ${PRESSED}`}>
            <span className={`relative grid h-32 w-32 place-items-center rounded-full ${RAISED_SM}`}>
              <span className="absolute top-3 h-1.5 w-1.5 rounded-full bg-secondary shadow-[0_0_8px_rgba(181,132,60,0.9)]" />
              <span className="flex flex-col items-center">
                <span className="text-4xl font-light tabular-nums">{leadsValue(pendingCount)}</span>
                <span className="text-[10px] tracking-[0.2em] text-gray-100 uppercase">
                  {pendingCount === null ? "contando" : plural(pendingCount, "lead", "leads")}
                </span>
              </span>
            </span>
          </span>
        </button>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {tiles.map((t) => (
            <button key={t.label} type="button" onClick={t.run} className={`flex items-center gap-4 rounded-3xl p-5 text-left ${RAISED} ${PUSH}`}>
              <Well icon={t.icon} tone={t.tone} />
              <span className="min-w-0">
                <span className="block text-2xl font-light tabular-nums">{t.value}</span>
                <span className="block truncate text-xs font-medium">{t.label}</span>
                <span className="block truncate text-[11px] text-gray-100">{t.hint}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Seletor segmentado + painel */}
      <div className="mt-10">
        <div role="tablist" aria-label="Painel" onKeyDown={onTabKey} className={`grid grid-cols-2 gap-1.5 rounded-3xl p-1.5 sm:grid-cols-4 ${PRESSED}`}>
          {TABS.map((t) => {
            const on = t.key === tab;
            return (
              <button
                key={t.key}
                id={`${baseId}-tab-${t.key}`}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls={`${baseId}-panel`}
                tabIndex={on ? 0 : -1}
                onClick={() => setTab(t.key)}
                className={`rounded-2xl px-3 py-2.5 text-sm transition duration-200 motion-reduce:transition-none ${
                  on ? `${RAISED_SM} font-medium text-primary` : "text-gray-100 hover:text-primary"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <div
          id={`${baseId}-panel`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${tab}`}
          className={`mt-6 rounded-[1.75rem] p-5 sm:p-6 ${RAISED}`}
        >
          {panel()}
          <div className="mt-5 flex justify-end">
            <button type="button" onClick={tabAction[tab].run} className={`rounded-full px-5 py-2.5 text-xs font-medium text-primary ${RAISED_SM} ${PUSH}`}>
              {tabAction[tab].label} →
            </button>
          </div>
        </div>
      </div>

      {/* Indicadores + saídas */}
      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <article className={`rounded-[1.75rem] p-5 sm:p-6 ${RAISED}`}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium">Indicadores</h2>
            <Illustrative />
          </div>
          {stats.length === 0 ? (
            <div className="mt-4">
              <SoftEmpty>Sem indicadores por enquanto.</SoftEmpty>
            </div>
          ) : (
            <ul className="mt-5 flex flex-col gap-4">
              {stats.map((s) => {
                const ratio = statRatio(s);
                return (
                  <li key={s.title}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs">
                      <span className="truncate">{s.title}</span>
                      <span className="font-semibold tabular-nums">
                        {s.value}
                        {s.total ? <span className="text-gray-100">/{s.total}</span> : null}
                      </span>
                    </div>
                    {ratio !== null && <Track ratio={ratio} />}
                  </li>
                );
              })}
            </ul>
          )}
        </article>
        <article className={`rounded-[1.75rem] p-5 sm:p-6 ${RAISED}`}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium">Saídas de {periodLabel.toLowerCase()}</h2>
            {outflow.slices.length > 0 && <span className="text-sm font-semibold tabular-nums">{money(outflow.total)}</span>}
          </div>
          {!canSeeFinance || outflow.slices.length === 0 ? (
            <div className="mt-4">
              <SoftEmpty>{canSeeFinance ? "Sem despesas pagas neste mês." : "Despesas visíveis só para administradores."}</SoftEmpty>
            </div>
          ) : (
            <ul className="mt-5 flex flex-col gap-4">
              {outflow.slices.map((s) => (
                <li key={s.label}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs">
                    <span className="truncate">{s.label}</span>
                    <span className="font-semibold tabular-nums">{s.percentage}%</span>
                  </div>
                  <Track ratio={s.percentage / 100} tone="primary" />
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>
    </section>
  );
}
