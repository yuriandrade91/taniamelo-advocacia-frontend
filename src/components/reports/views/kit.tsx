"use client";

import { useMemo, type ReactNode } from "react";
import { Skeleton } from "@heroui/react";
import { formatMonthAxis } from "@/components/wallet/walletOverview";
import { lastMonths, monthKey } from "@/components/reports/reportSeries";
import { formatBRLCompact } from "@/lib/format";
import { formatMonthLabel, monthName, shiftMonth } from "@/lib/period";
import { deltaPercent, type Tone } from "@/components/ui/models/viz";
import type { ReportViewProps } from "./types";

/**
 * Peças comuns às visões de Relatórios.
 *
 * As cinco visões discordam só no desenho. O que **não** muda fica aqui: as
 * séries normalizadas na janela (todo mês presente, mesmo zerado), os totais,
 * as comparações com o mês anterior, as frases de destaque e a cor de cada
 * série. Assim "Atrasado" é vermelho e "Pago" é verde em todos eles, e uma
 * frase como "Saídas superaram entradas em 2 dos 6 meses" sai da mesma conta.
 *
 * ## Mês sem ponto não é mês sem dado
 *
 * Uma série que **respondeu** e não trouxe um mês teve zero naquele mês — é
 * isso que a normalização preenche. Uma série que veio **vazia** (falhou ou
 * ainda carrega) não vira gráfico zerado: `hasData` fica falso e o modelo
 * mostra um aviso, nunca uma linha reta no zero dizendo "sem movimento".
 */

const WINDOW = 6;

// ── Cores por série (a mesma em todas as visões) ──

export const PAYMENT_TONES = { overdue: "danger", upcoming: "sky", paid: "success" } as const;
export const FLOW_TONES = { inflow: "success", outflow: "danger", balance: "secondary" } as const;
export const INTAKE_TONES = { verified: "primary", potential: "secondary", average: "gray" } as const;
export const AGENDA_TONES = { completed: "success", scheduled: "sky", cancelled: "danger" } as const;

export const PAYMENT_LABELS = { overdue: "Atrasado", upcoming: "A vencer", paid: "Pago" } as const;
export const AGENDA_LABELS = { completed: "Concluído", scheduled: "Agendado", cancelled: "Cancelado" } as const;

/**
 * Etapas da esteira na rampa de azul do funil — mora em
 * `@/components/ui/stageRamp`, que a Home e a Agenda também leem. Reexportada
 * aqui porque as visões importam tudo deste kit.
 */
export {
  STAGE_BG,
  STAGE_BG_DARK,
  STAGE_TILE,
  stageBg,
  stageOpacity,
  stageTile,
} from "@/components/ui/stageRamp";

/**
 * Categoria de despesa → cor fixa (a cor segue a categoria, não a posição no
 * ranking). As demais dobram em "Demais categorias", em cinza.
 */
const CATEGORY_TONE: Record<string, Tone> = {
  "Aluguel e condomínio": "primary",
  "Salários e encargos": "secondary",
  "Custas processuais": "sky",
  "Software e assinaturas": "violet",
  "Marketing e captação": "previsto",
};

// ── Formatação ──

/** "R$ 12.345", com sinal de menos tipográfico quando negativo. */
export const money = (value: number) =>
  value < 0 ? `− ${formatBRLCompact(-value)}` : formatBRLCompact(value);

/** "R$ 12,3 mil" — para números grandes em pouco espaço. */
export function moneyShort(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "− " : "";
  const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  if (abs >= 1_000_000) return `${sign}R$ ${fmt(abs / 1_000_000)} mi`;
  if (abs >= 1_000) return `${sign}R$ ${fmt(abs / 1_000)} mil`;
  return `${sign}R$ ${Math.round(abs)}`;
}

/** Só a palavra — o número é desenhado à parte (`plural` de `lib/format`
    devolve os dois juntos). */
export const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** "jan", "fev"… a partir de `2026-01`. */
export const monthShortOnly = (key: string) => formatMonthAxis(key).split("/")[0];

const share = (part: number, whole: number) =>
  whole > 0 ? Math.round((part / whole) * 100) : null;

const sum = (values: readonly number[]) => values.reduce((s, v) => s + v, 0);

// ── Séries normalizadas ──

export type PaymentRow = {
  month: string;
  label: string;
  overdue: number;
  upcoming: number;
  paid: number;
  total: number;
};
export type FlowRow = {
  month: string;
  label: string;
  inflow: number;
  outflow: number;
  net: number;
  cumulative: number;
};
export type IntakeRow = {
  month: string;
  label: string;
  verified: number;
  potential: number;
  total: number;
  average: number;
};
export type AgendaRow = {
  month: string;
  label: string;
  completed: number;
  scheduled: number;
  cancelled: number;
  total: number;
};
export type FunnelStage = {
  key: string;
  label: string;
  /** Clientes nesta etapa hoje. */
  count: number;
  /** Chegaram à etapa: estão nela ou adiante. */
  reached: number;
  /** % do total de clientes que está nesta etapa. */
  share: number;
  /** % dos que chegaram à etapa anterior e chegaram a esta. */
  stepRate: number | null;
  index: number;
};
export type ExpenseSlice = { label: string; value: number; tone: Tone };

export type Report = {
  key: string;
  monthShort: string;
  prevShort: string;
  /** "Outubro de 2026". */
  monthTitle: string;
  /** "Outubro". */
  monthOnly: string;
  prevOnly: string;
  year: number;
  windowLabel: string;
  windowKeys: string[];
  payments: {
    rows: PaymentRow[];
    hasData: boolean;
    current: PaymentRow;
    previous: PaymentRow;
    sum: { overdue: number; upcoming: number; paid: number; total: number };
    paidRate: number | null;
    overdueRate: number | null;
  };
  flow: {
    rows: FlowRow[];
    hasData: boolean;
    current: FlowRow;
    previous: FlowRow;
    sum: { inflow: number; outflow: number; net: number };
    balance: number;
    negativeMonths: number;
  };
  expenses: {
    total: number;
    slices: ExpenseSlice[];
    hasData: boolean;
    top: ExpenseSlice | null;
  };
  intake: {
    rows: IntakeRow[];
    hasData: boolean;
    current: IntakeRow;
    previous: IntakeRow | null;
    sum: { verified: number; potential: number; total: number };
    /** Média simples dos meses visíveis. */
    mean: number;
    verifiedShare: number | null;
    /** Mês escolhido contra a média móvel de 3 meses dele. */
    vsAverage: number | null;
  };
  agenda: {
    rows: AgendaRow[];
    hasData: boolean;
    current: AgendaRow;
    /** `null` em janeiro: dezembro é de outro ano, fora da janela da agenda. */
    previous: AgendaRow | null;
    sum: { completed: number; scheduled: number; cancelled: number; total: number };
    doneRate: number | null;
    cancelRate: number | null;
    busiest: AgendaRow | null;
  };
  funnel: {
    stages: FunnelStage[];
    total: number;
    hasData: boolean;
    peak: FunnelStage | null;
    bottleneck: { from: FunnelStage; to: FunnelStage; rate: number } | null;
  };
  empty: {
    payments: string;
    flow: string;
    expenses: string;
    intake: string;
    agenda: string;
    funnel: string;
  };
  insights: { finance: string[]; clients: string[] };
};

type Inputs = Pick<
  ReportViewProps,
  | "month"
  | "windowLabel"
  | "payments"
  | "flow"
  | "cumulative"
  | "expenses"
  | "expenseSlices"
  | "situations"
  | "intake"
  | "agenda"
>;

export function buildReport(input: Inputs): Report {
  const { month } = input;
  const key = monthKey(month);
  const prev = shiftMonth(month, -1);
  const windowKeys = lastMonths(month, WINDOW).map(monthKey);

  // Pagamentos aos clientes, por vencimento.
  const payByMonth = new Map(input.payments.map((p) => [p.month, p]));
  const paymentRows: PaymentRow[] = windowKeys.map((m) => {
    const p = payByMonth.get(m);
    const overdue = p?.overdueAmount ?? 0;
    const upcoming = p?.upcomingAmount ?? 0;
    const paid = p?.paidAmount ?? 0;
    return { month: m, label: formatMonthAxis(m), overdue, upcoming, paid, total: overdue + upcoming + paid };
  });
  const paySum = {
    overdue: sum(paymentRows.map((r) => r.overdue)),
    upcoming: sum(paymentRows.map((r) => r.upcoming)),
    paid: sum(paymentRows.map((r) => r.paid)),
    total: sum(paymentRows.map((r) => r.total)),
  };

  // Carteira, por pagamento — o acumulado carrega o último valor conhecido.
  const flowByMonth = new Map(input.flow.map((f) => [f.month, f]));
  const cumByMonth = new Map(input.cumulative.map((c) => [c.month, c.cumulative]));
  let carried = 0;
  const flowRows: FlowRow[] = windowKeys.map((m) => {
    const f = flowByMonth.get(m);
    const inflow = f?.inflowAmount ?? 0;
    const outflow = f?.outflowAmount ?? 0;
    carried = cumByMonth.get(m) ?? carried + inflow - outflow;
    return { month: m, label: formatMonthAxis(m), inflow, outflow, net: inflow - outflow, cumulative: carried };
  });
  const flowSum = {
    inflow: sum(flowRows.map((r) => r.inflow)),
    outflow: sum(flowRows.map((r) => r.outflow)),
    net: sum(flowRows.map((r) => r.net)),
  };

  // Despesas: categorias com cor fixa; o resto dobra em "Demais".
  const known: ExpenseSlice[] = [];
  let others = 0;
  for (const s of input.expenseSlices) {
    const tone = CATEGORY_TONE[s.label];
    if (tone) known.push({ label: s.label, value: s.percentage, tone });
    else others += s.percentage;
  }
  const slices = others > 0 ? [...known, { label: "Demais categorias", value: others, tone: "gray" as Tone }] : known;
  const top = input.expenseSlices[0]
    ? { label: input.expenseSlices[0].label, value: input.expenseSlices[0].percentage, tone: CATEGORY_TONE[input.expenseSlices[0].label] ?? ("gray" as Tone) }
    : null;

  // Cadastros (já vêm com os 6 meses e a média móvel).
  const intakeRows: IntakeRow[] = input.intake.map((p) => ({
    month: p.month,
    label: formatMonthAxis(p.month),
    verified: p.verified,
    potential: p.potential,
    total: p.verified + p.potential,
    average: p.average,
  }));
  const intakeEmptyRow: IntakeRow = { month: key, label: formatMonthAxis(key), verified: 0, potential: 0, total: 0, average: 0 };
  const intakeCurrent = intakeRows.find((r) => r.month === key) ?? intakeRows[intakeRows.length - 1] ?? intakeEmptyRow;
  const intakePrev = intakeRows.find((r) => r.month === monthKey(prev)) ?? null;
  const intakeSum = {
    verified: sum(intakeRows.map((r) => r.verified)),
    potential: sum(intakeRows.map((r) => r.potential)),
    total: sum(intakeRows.map((r) => r.total)),
  };

  // Agenda: de janeiro até o mês escolhido.
  const agendaKeys = Array.from({ length: month.month }, (_, i) => monthKey({ year: month.year, month: i + 1 }));
  const agByMonth = new Map(input.agenda.map((a) => [a.month, a]));
  const agendaRows: AgendaRow[] = agendaKeys.map((m) => {
    const a = agByMonth.get(m);
    const completed = a?.completedCount ?? 0;
    const scheduled = a?.scheduledCount ?? 0;
    const cancelled = a?.cancelledCount ?? 0;
    return {
      month: m,
      label: monthShortOnly(m),
      completed,
      scheduled,
      cancelled,
      total: a?.totalCount ?? completed + scheduled + cancelled,
    };
  });
  const agSum = {
    completed: sum(agendaRows.map((r) => r.completed)),
    scheduled: sum(agendaRows.map((r) => r.scheduled)),
    cancelled: sum(agendaRows.map((r) => r.cancelled)),
    total: sum(agendaRows.map((r) => r.total)),
  };
  const busiest = agendaRows.reduce<AgendaRow | null>((best, r) => (r.total > (best?.total ?? 0) ? r : best), null);

  // Funil: na ordem da esteira, nunca por tamanho.
  const total = sum(input.situations.map((s) => s.count));
  let remaining = total;
  let prevReached = 0;
  const stages: FunnelStage[] = input.situations.map((s, index) => {
    const reached = remaining;
    remaining -= s.count;
    const stage: FunnelStage = {
      key: s.key,
      label: s.label,
      count: s.count,
      reached,
      share: share(s.count, total) ?? 0,
      stepRate: index === 0 ? null : share(reached, prevReached),
      index,
    };
    prevReached = reached;
    return stage;
  });
  const peak = stages.reduce<FunnelStage | null>((best, s) => (s.count > (best?.count ?? 0) ? s : best), null);
  let bottleneck: Report["funnel"]["bottleneck"] = null;
  for (let i = 1; i < stages.length; i++) {
    const rate = stages[i].stepRate;
    if (rate === null || stages[i - 1].reached === 0) continue;
    if (!bottleneck || rate < bottleneck.rate) bottleneck = { from: stages[i - 1], to: stages[i], rate };
  }

  const r: Report = {
    key,
    monthShort: formatMonthAxis(key),
    prevShort: formatMonthAxis(monthKey(prev)),
    monthTitle: formatMonthLabel(month),
    monthOnly: monthName(month),
    prevOnly: monthName(prev),
    year: month.year,
    windowLabel: input.windowLabel,
    windowKeys,
    payments: {
      rows: paymentRows,
      hasData: input.payments.length > 0 && paySum.total > 0,
      current: paymentRows[paymentRows.length - 1],
      previous: paymentRows[paymentRows.length - 2],
      sum: paySum,
      paidRate: share(paySum.paid, paySum.total),
      overdueRate: share(paySum.overdue, paySum.total),
    },
    flow: {
      rows: flowRows,
      hasData: input.flow.length > 0 && flowSum.inflow + flowSum.outflow > 0,
      current: flowRows[flowRows.length - 1],
      previous: flowRows[flowRows.length - 2],
      sum: flowSum,
      balance: flowRows[flowRows.length - 1].cumulative,
      negativeMonths: flowRows.filter((f) => f.outflow > f.inflow).length,
    },
    expenses: {
      total: input.expenses?.paidAmount ?? 0,
      slices,
      hasData: slices.length > 0,
      top,
    },
    intake: {
      rows: intakeRows,
      hasData: intakeSum.total > 0,
      current: intakeCurrent,
      previous: intakePrev,
      sum: intakeSum,
      mean: intakeRows.length ? Math.round((intakeSum.total / intakeRows.length) * 10) / 10 : 0,
      verifiedShare: share(intakeSum.verified, intakeSum.total),
      vsAverage: deltaPercent(intakeCurrent.total, intakeCurrent.average),
    },
    agenda: {
      rows: agendaRows,
      hasData: agSum.total > 0,
      current: agendaRows[agendaRows.length - 1],
      previous: agendaRows.length > 1 ? agendaRows[agendaRows.length - 2] : null,
      sum: agSum,
      doneRate: share(agSum.completed, agSum.total),
      cancelRate: share(agSum.cancelled, agSum.total),
      busiest,
    },
    funnel: { stages, total, hasData: total > 0, peak, bottleneck },
    empty: {
      payments: `Sem parcelas de clientes para mostrar em ${input.windowLabel}.`,
      flow: `Sem entradas ou saídas para mostrar em ${input.windowLabel}.`,
      expenses: `Sem despesas pagas para compor em ${input.windowLabel}.`,
      intake: `Sem cadastros para mostrar em ${input.windowLabel}.`,
      agenda: `Sem compromissos para mostrar de jan a ${monthShortOnly(key)} de ${month.year}.`,
      funnel: "Sem clientes nas etapas da esteira para mostrar.",
    },
    insights: { finance: [], clients: [] },
  };
  r.insights = buildInsights(r);
  return r;
}

/** Frases curtas tiradas dos números — o "e daí" de cada série. */
function buildInsights(r: Report): Report["insights"] {
  const finance: string[] = [];
  const clients: string[] = [];

  if (r.flow.hasData) {
    const n = r.flow.negativeMonths;
    finance.push(
      n === 0
        ? `Entradas cobriram as saídas em todos os ${r.flow.rows.length} meses.`
        : `Saídas superaram entradas em ${n} dos ${r.flow.rows.length} meses.`,
    );
    finance.push(
      `Saldo acumulado da janela: ${money(r.flow.balance)}${r.flow.balance < 0 ? " — no vermelho" : ""}.`,
    );
    const d = deltaPercent(r.flow.current.inflow, r.flow.previous.inflow);
    if (d !== null && d !== 0)
      finance.push(`Entradas de ${r.monthOnly.toLowerCase()} ${d > 0 ? "subiram" : "caíram"} ${Math.abs(d)}% sobre ${r.prevOnly.toLowerCase()}.`);
  }
  if (r.payments.hasData) {
    finance.push(
      r.payments.sum.overdue > 0
        ? `${money(r.payments.sum.overdue)} das parcelas dos clientes estão em atraso — ${r.payments.overdueRate ?? 0}% da janela.`
        : "Nenhuma parcela dos clientes em atraso na janela.",
    );
  }
  if (r.expenses.top) {
    finance.push(`${r.expenses.top.label} é a maior despesa: ${r.expenses.top.value}% do que foi pago.`);
  }

  if (r.intake.hasData) {
    const c = r.intake.current;
    const v = r.intake.vsAverage;
    clients.push(
      `${r.monthOnly} teve ${c.total} ${plural(c.total, "cadastro", "cadastros")}` +
        (v === null ? "." : v === 0 ? ", na média de 3 meses." : `, ${Math.abs(v)}% ${v > 0 ? "acima" : "abaixo"} da média de 3 meses.`),
    );
    if (r.intake.verifiedShare !== null)
      clients.push(`${r.intake.verifiedShare}% dos cadastros da janela já são clientes verificados.`);
  }
  if (r.funnel.peak) {
    clients.push(
      `Maior concentração da esteira: ${r.funnel.peak.label}, com ${r.funnel.peak.count} ${plural(r.funnel.peak.count, "cliente", "clientes")}.`,
    );
  }
  if (r.funnel.bottleneck) {
    const b = r.funnel.bottleneck;
    clients.push(`A maior queda é de ${b.from.label} para ${b.to.label}: ${b.rate}% seguem adiante.`);
  }
  if (r.agenda.hasData) {
    clients.push(
      `No ano, ${r.agenda.doneRate ?? 0}% dos compromissos foram concluídos e ${r.agenda.cancelRate ?? 0}% cancelados.`,
    );
  }
  return { finance, clients };
}

/** O relatório derivado das props — uma conta só, memorizada. */
export function useReport({
  month,
  windowLabel,
  payments,
  flow,
  cumulative,
  expenses,
  expenseSlices,
  situations,
  intake,
  agenda,
}: ReportViewProps): Report {
  return useMemo(
    () =>
      buildReport({
        month,
        windowLabel,
        payments,
        flow,
        cumulative,
        expenses,
        expenseSlices,
        situations,
        intake,
        agenda,
      }),
    [month, windowLabel, payments, flow, cumulative, expenses, expenseSlices, situations, intake, agenda],
  );
}

// ── Estados: carregando e vazio ──

/** Bloco de carregamento — Skeleton no claro, pulso translúcido no escuro. */
export function LoadingBlock({
  className = "h-40",
  dark = false,
}: {
  className?: string;
  dark?: boolean;
}) {
  if (dark)
    return (
      <div
        role="status"
        aria-label="Carregando…"
        className={`w-full animate-pulse rounded-2xl bg-white/10 motion-reduce:animate-none ${className}`}
      />
    );
  return (
    <div role="status" aria-label="Carregando…" className="w-full">
      <Skeleton className={`w-full rounded-2xl ${className}`} />
    </div>
  );
}

/** Aviso de série vazia: diz que não há o que mostrar, sem desenhar zero. */
export function EmptyNote({
  children,
  dark = false,
  className = "",
}: {
  children: ReactNode;
  dark?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-6 py-8 text-center text-sm ${
        dark ? "border-white/15 text-white/60" : "border-light-gray text-gray-100"
      } ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        className="h-6 w-6 opacity-60"
        aria-hidden="true"
      >
        <path d="M3 21h18" />
        <path d="M6 17v-3M11 17V9M16 17v-5" strokeDasharray="2 2.5" />
      </svg>
      <p className="max-w-xs">{children}</p>
    </div>
  );
}

/**
 * Carregando → aviso de vazio → conteúdo. `children` é função para que nada
 * do gráfico seja montado enquanto não há dado.
 */
export function SeriesGate({
  loading,
  hasData,
  empty,
  dark = false,
  loadingClassName,
  children,
}: {
  loading: boolean;
  hasData: boolean;
  empty: string;
  dark?: boolean;
  loadingClassName?: string;
  children: () => ReactNode;
}) {
  if (loading) return <LoadingBlock dark={dark} className={loadingClassName} />;
  if (!hasData) return <EmptyNote dark={dark}>{empty}</EmptyNote>;
  return <>{children()}</>;
}

// ── Financeiro em resumo ──

/**
 * Faixa curta com os quatro números do dinheiro do escritório — abre as
 * visões que, no resto, contam outra história (a esteira, os meses). O
 * financeiro vem primeiro em todas elas: é a pergunta que traz o
 * administrador a Relatórios.
 */
export function FinanceSummary({ r, loading }: { r: Report; loading: boolean }) {
  const items = [
    { label: `Entradas ${r.monthShort}`, value: money(r.flow.current.inflow), ok: r.flow.hasData, tone: "text-primary" },
    { label: `Saídas ${r.monthShort}`, value: money(r.flow.current.outflow), ok: r.flow.hasData, tone: "text-primary" },
    {
      label: "Saldo acumulado",
      value: money(r.flow.balance),
      ok: r.flow.hasData,
      tone: r.flow.balance < 0 ? "text-danger" : "text-primary",
    },
    {
      label: "Clientes em atraso (valor)",
      value: moneyShort(r.payments.sum.overdue),
      ok: r.payments.hasData,
      tone: r.payments.sum.overdue > 0 ? "text-danger" : "text-primary",
    },
  ];
  return (
    <section className="rounded-3xl bg-white p-5 ring-1 ring-black/5 sm:p-6">
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium text-primary">Financeiro em resumo</h3>
        <span className="text-[11px] text-gray-100">carteira por pagamento · parcelas dos clientes por vencimento</span>
      </header>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {items.map((it) => (
          <div key={it.label} className="min-w-0 border-l-2 border-secondary/40 pl-3">
            <p className="truncate text-[11px] text-gray-100">{it.label}</p>
            {loading ? (
              <Skeleton className="mt-1.5 h-6 w-28 rounded-lg" />
            ) : it.ok ? (
              <p className={`mt-1 truncate text-xl font-semibold tracking-tight tabular-nums ${it.tone}`}>{it.value}</p>
            ) : (
              <p className="mt-1 text-xs text-gray-100/70">Sem dados para mostrar.</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
