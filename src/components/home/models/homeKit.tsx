"use client";

import {
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { Skeleton } from "@heroui/react";
import {
  SITUATION_ENTRIES,
  type SituationKey,
} from "@/enums/situation/Situation";
import { AppointmentStatusLabelByKey } from "@/enums/appointment/Appointment";
import {
  BUCKET_BADGE,
  bucketOf,
  type PaymentBucket,
} from "@/components/payments/paymentBuckets";
import type { PipelineCard } from "@/components/home/ContributorPipeline";
import type { StatCardProps } from "@/components/home/StatCard";
import type { AppointmentResponse } from "@/interfaces/appointment/Appointment.interface";
import type { OfficePaymentResponse } from "@/interfaces/payment/OfficePayment.interface";
import { formatBRLCompact, formatDateBR } from "@/lib/format";
import { TONE_BG, TONE_SOFT, type Tone } from "@/components/ui/models/viz";
import {
  AlertIcon,
  CalendarIcon,
  DocumentIcon,
  UserIcon,
  UsersIcon,
  WalletIcon,
} from "@/components/ui/icons/glyphs";
import type { HomeModelProps } from "./shared";

/**
 * Peças comuns aos modelos do Início.
 *
 * Os dez modelos discordam só no desenho. O que é regra — o que é "hoje",
 * a ordem e o nome das etapas da esteira, os baldes de pagamento, o que vem
 * primeiro numa lista de prioridades, como mover um cliente de etapa — fica
 * aqui, uma vez só.
 */

export type IconComponent = ComponentType<{ className?: string }>;

// ── Ícones que faltam no kit geral ──

function Glyph({
  className = "h-4 w-4",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

export const PlusIcon = ({ className }: { className?: string }) => (
  <Glyph className={className}>
    <path d="M12 5v14M5 12h14" />
  </Glyph>
);
export const ArrowRightIcon = ({ className }: { className?: string }) => (
  <Glyph className={className}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Glyph>
);
export const ArrowLeftIcon = ({ className }: { className?: string }) => (
  <Glyph className={className}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </Glyph>
);
export const GavelIcon = ({ className }: { className?: string }) => (
  <Glyph className={className}>
    <path d="m14 4 6 6M11 7l6 6M12.5 5.5l-6 6 4 4 6-6M8.5 13.5 3 19l2 2 5.5-5.5M14 21h7" />
  </Glyph>
);
export const StethoscopeIcon = ({ className }: { className?: string }) => (
  <Glyph className={className}>
    <path d="M6 3v6a4 4 0 0 0 8 0V3M10 13v2a5 5 0 0 0 10 0v-2" />
    <circle cx="20" cy="11" r="2" />
  </Glyph>
);
export const HourglassIcon = ({ className }: { className?: string }) => (
  <Glyph className={className}>
    <path d="M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9s10 4 10 9" />
  </Glyph>
);
export const ChatIcon = ({ className }: { className?: string }) => (
  <Glyph className={className}>
    <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />
  </Glyph>
);

// ── Tempo ──

/** O relógio da tela — a implementação mora em `@/hooks/useNow`. */
export { useNow } from "@/hooks/useNow";


const WEEKDAYS = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];
const WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];
const MONTHS_SHORT = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

const pad = (n: number) => String(n).padStart(2, "0");

/** "Bom dia" / "Boa tarde" / "Boa noite" pela hora local. */
export function greeting(now: number): string {
  const hour = new Date(now).getHours();
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}

/** "quinta-feira, 2 de outubro". */
export function longDate(now: number): string {
  const d = new Date(now);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}

/** "HH:mm" do relógio local. */
export function clock(now: number): string {
  const d = new Date(now);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const keyOfDate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Dia local (`yyyy-MM-dd`) de um instante ISO. */
export function localDay(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : keyOfDate(d);
}

/** "HH:mm" local de um instante ISO. */
export function localTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "--:--"
    : `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const todayOf = (now: number) => keyOfDate(new Date(now));

export function tomorrowOf(now: number): string {
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  return keyOfDate(d);
}

/** Partes de um instante para selos de data ("Qui", "09", "out"). */
export function instantParts(iso: string) {
  const d = new Date(iso);
  return {
    weekday: WEEKDAYS_SHORT[d.getDay()] ?? "",
    day: pad(d.getDate()),
    month: MONTHS_SHORT[d.getMonth()] ?? "",
  };
}

/**
 * Partes de uma data sem hora (`LocalDate`, `yyyy-MM-dd`) — vencimentos.
 * Recorte de texto e meio-dia UTC: o dia não escorrega por fuso.
 */
export function dateParts(ymd: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  if (!match) return { weekday: "", day: "—", month: "" };
  const [, y, m, d] = match.map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
  return {
    weekday: WEEKDAYS_SHORT[weekday],
    day: pad(d),
    month: MONTHS_SHORT[m - 1] ?? "",
  };
}

/** Dias corridos de hoje até `ymd` (negativo = já passou). */
export function daysUntil(ymd: string, now: number): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  const today = new Date(now);
  const a = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((Date.UTC(y, m - 1, d) - a) / 86_400_000);
}

/** "Hoje", "Amanhã" ou "Qui, 09 out". */
export function dayLabel(iso: string, now: number): string {
  const day = localDay(iso);
  if (day === todayOf(now)) return "Hoje";
  if (day === tomorrowOf(now)) return "Amanhã";
  const p = instantParts(iso);
  return `${p.weekday}, ${p.day} ${p.month}`;
}

/** "em 25 min", "em 2h 10min", "em 3 dias", "agora". */
export function relativeTo(iso: string, now: number): string {
  const diff = Math.round((new Date(iso).getTime() - now) / 60_000);
  if (Number.isNaN(diff)) return "";
  if (diff <= 0) return "agora";
  if (diff < 60) return `em ${diff} min`;
  if (diff < 60 * 24) {
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return m ? `em ${h}h ${m}min` : `em ${h}h`;
  }
  const d = Math.round(diff / (60 * 24));
  return `em ${d} ${d === 1 ? "dia" : "dias"}`;
}

/** "vence hoje", "vence amanhã", "em 5 dias", "há 3 dias". */
export function dueLabel(ymd: string, now: number): string {
  const days = daysUntil(ymd, now);
  if (days === null) return formatDateBR(ymd);
  if (days === 0) return "vence hoje";
  if (days === 1) return "vence amanhã";
  if (days > 1) return `em ${days} dias`;
  return `há ${-days} ${days === -1 ? "dia" : "dias"}`;
}

// ── Compromissos ──

const ms = (iso: string) => new Date(iso).getTime();

export const isCancelledAppt = (a: AppointmentResponse) =>
  a.status === AppointmentStatusLabelByKey.CANCELADO;

export const isOngoingAppt = (a: AppointmentResponse, now: number) =>
  !isCancelledAppt(a) && ms(a.startAt) <= now && now < ms(a.endAt);

/** Compromissos válidos (sem os cancelados), em ordem de início. */
export function activeAppointments(
  list: AppointmentResponse[] | null,
): AppointmentResponse[] {
  return (list ?? [])
    .filter((a) => !isCancelledAppt(a))
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
}

export function durationLabel(a: AppointmentResponse): string {
  const minutes = Math.max(0, Math.round((ms(a.endAt) - ms(a.startAt)) / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h${pad(m)}` : `${h}h`;
}

/** Agrupa por dia local, em ordem. */
export function groupAppointmentsByDay(list: AppointmentResponse[]) {
  const map = new Map<string, AppointmentResponse[]>();
  for (const a of list) {
    const day = localDay(a.startAt);
    if (!day) continue;
    map.set(day, [...(map.get(day) ?? []), a]);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, items]) => ({ day, items }));
}

const TYPE_TONE: Record<string, Tone> = {
  Audiência: "primary",
  Perícia: "secondary",
  Prazo: "danger",
  Reunião: "violet",
  Entrevista: "sky",
  Outro: "gray",
};

const TYPE_ICON: Record<string, IconComponent> = {
  Audiência: GavelIcon,
  Perícia: StethoscopeIcon,
  Prazo: HourglassIcon,
  Reunião: UsersIcon,
  Entrevista: ChatIcon,
  Outro: CalendarIcon,
};

export const apptTone = (type: string): Tone => TYPE_TONE[type] ?? "gray";
export const apptIcon = (type: string): IconComponent =>
  TYPE_ICON[type] ?? CalendarIcon;

const TILE_BOX = {
  sm: "h-8 w-8 rounded-lg",
  md: "h-10 w-10 rounded-xl",
  lg: "h-14 w-14 rounded-2xl",
} as const;
const TILE_GLYPH = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-7 w-7" } as const;

/** Ladrilho com o ícone do tipo do compromisso, na cor do tipo. */
export function ApptTile({
  type,
  size = "md",
  dark = false,
}: {
  type: string;
  size?: keyof typeof TILE_BOX;
  dark?: boolean;
}) {
  const Icon = TYPE_ICON[type] ?? CalendarIcon;
  return (
    <span
      className={`grid shrink-0 place-items-center ${TILE_BOX[size]} ${
        dark ? "bg-white/10 text-secondary" : TONE_SOFT[apptTone(type)]
      }`}
    >
      <Icon className={TILE_GLYPH[size]} />
    </span>
  );
}

/** Ladrilho genérico de ícone num tom. */
export function IconTile({
  icon: Icon,
  tone,
  size = "md",
}: {
  icon: IconComponent;
  tone: Tone;
  size?: keyof typeof TILE_BOX;
}) {
  return (
    <span
      className={`grid shrink-0 place-items-center ${TILE_BOX[size]} ${TONE_SOFT[tone]}`}
    >
      <Icon className={TILE_GLYPH[size]} />
    </span>
  );
}

// ── Esteira ──

export type Stage = {
  key: SituationKey;
  label: string;
  short: string;
  tone: Tone;
};

const STAGE_SHORT: Record<SituationKey, string> = {
  FORMULARIO_PREENCHIDO: "Formulário",
  ANALISE_DOCUMENTAL: "Análise",
  PLANEJAMENTO_EM_EXECUCAO: "Planejando",
  PLANEJAMENTO_CONCLUIDO: "Planejado",
  BENEFICIO_FUTURO: "Futuro",
  BENEFICIO_CONCLUIDO: "Concluído",
};

const STAGE_TONE: Record<SituationKey, Tone> = {
  FORMULARIO_PREENCHIDO: "sky",
  ANALISE_DOCUMENTAL: "violet",
  PLANEJAMENTO_EM_EXECUCAO: "secondary",
  PLANEJAMENTO_CONCLUIDO: "primary",
  BENEFICIO_FUTURO: "previsto",
  BENEFICIO_CONCLUIDO: "success",
};

/** As etapas na ordem fixa do enum do backend. */
export const STAGES: readonly Stage[] = SITUATION_ENTRIES.map(([key, label]) => ({
  key,
  label,
  short: STAGE_SHORT[key],
  tone: STAGE_TONE[key],
}));

export const stageOf = (key: SituationKey): Stage =>
  STAGES.find((s) => s.key === key) ?? STAGES[0];

export function nextStageOf(key: SituationKey): Stage | null {
  const index = STAGES.findIndex((s) => s.key === key);
  return index >= 0 && index < STAGES.length - 1 ? STAGES[index + 1] : null;
}

export type PipelineColumns = Record<SituationKey, PipelineCard[]>;

/**
 * A esteira agrupada, com a movimentação aplicada na hora.
 *
 * A página só persiste (`moveCard` → `patchClient`); quem mostra o cliente
 * na etapa nova é o modelo. O desvio local vale até a próxima carga.
 */
export function usePipeline(
  cards: PipelineCard[],
  moveCard: (cardId: string, situation: SituationKey) => void,
) {
  const [moved, setMoved] = useState<Record<string, SituationKey>>({});

  const columns = useMemo(() => {
    const cols = Object.fromEntries(
      STAGES.map((s) => [s.key, [] as PipelineCard[]]),
    ) as PipelineColumns;
    for (const card of cards) {
      const situation = moved[card.id] ?? card.situation;
      cols[situation]?.push({ ...card, situation });
    }
    return cols;
  }, [cards, moved]);

  const move = (cardId: string, to: SituationKey) => {
    const card = cards.find((c) => c.id === cardId);
    const current = moved[cardId] ?? card?.situation;
    if (!card || current === to) return;
    setMoved((prev) => ({ ...prev, [cardId]: to }));
    moveCard(cardId, to);
  };

  const max = Math.max(1, ...STAGES.map((s) => columns[s.key].length));
  return { columns, total: cards.length, max, move };
}

const SELECT_TONE = {
  light:
    "bg-page text-primary ring-1 ring-black/5 hover:bg-light-gray/60 focus-visible:ring-2 focus-visible:ring-primary/30",
  dark: "bg-white/10 text-white ring-1 ring-white/10 hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-secondary/60",
} as const;

/** Mover um cliente para qualquer etapa — `<select>` nativo, acessível. */
export function StageSelect({
  card,
  onMove,
  tone = "light",
  className = "",
}: {
  card: PipelineCard;
  onMove: (cardId: string, situation: SituationKey) => void;
  tone?: keyof typeof SELECT_TONE;
  className?: string;
}) {
  return (
    <label className={`relative inline-flex min-w-0 ${className}`}>
      <span className="sr-only">Mover {card.name} para</span>
      <select
        value={card.situation}
        onChange={(event) => {
          const target = STAGES.find((s) => s.key === event.target.value);
          if (target) onMove(card.id, target.key);
        }}
        className={`w-full min-w-0 cursor-pointer appearance-none truncate rounded-lg py-1 pr-6 pl-2 text-[11px] font-medium outline-none ${SELECT_TONE[tone]}`}
      >
        {STAGES.map((s) => (
          <option key={s.key} value={s.key} className="text-primary">
            {s.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[9px] opacity-60">
        ▼
      </span>
    </label>
  );
}

// ── Recebimentos (o que o INSS paga aos clientes) ──

export type PaymentGroup = {
  count: number;
  amount: number;
  items: OfficePaymentResponse[];
};

export const amountOf = (p: OfficePaymentResponse) => p.amount ?? 0;

export function summarizePayments(
  list: OfficePaymentResponse[],
): Record<PaymentBucket, PaymentGroup> {
  const empty = (): PaymentGroup => ({ count: 0, amount: 0, items: [] });
  const out: Record<PaymentBucket, PaymentGroup> = {
    overdue: empty(),
    upcoming: empty(),
    paid: empty(),
    cancelled: empty(),
  };
  for (const p of list) {
    const group = out[bucketOf(p)];
    group.count += 1;
    group.amount += amountOf(p);
    group.items.push(p);
  }
  return out;
}

export const BUCKET_TONE: Record<PaymentBucket, Tone> = {
  overdue: "danger",
  upcoming: "previsto",
  paid: "success",
  cancelled: "gray",
};

export const bucketLabel = (bucket: PaymentBucket) => BUCKET_BADGE[bucket].label;

/** Selo do balde: ponto + nome. */
export function BucketPill({
  payment,
  dark = false,
}: {
  payment: OfficePaymentResponse;
  dark?: boolean;
}) {
  const bucket = bucketOf(payment);
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${
        dark ? "bg-white/10 text-white/80" : TONE_SOFT[BUCKET_TONE[bucket]]
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${TONE_BG[BUCKET_TONE[bucket]]}`} />
      {bucketLabel(bucket)}
    </span>
  );
}

export const money = (value: number) => formatBRLCompact(value);

// ── Números e textos ──

/** Contagem de leads: "—" enquanto carrega, nunca 0. */
export const leadsValue = (count: number | null) =>
  count === null ? "—" : String(count);

/** Só a palavra — o número é desenhado à parte (`plural` de `lib/format`
    devolve os dois juntos). */
export const plural = (n: number, one: string, many: string) =>
  n === 1 ? one : many;

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return `${first}${last}`.toUpperCase() || "?";
}

/** Razão valor/total de um indicador (0 a 1); `null` sem denominador. */
export function statRatio(stat: StatCardProps): number | null {
  const value = typeof stat.value === "number" ? stat.value : Number(stat.value);
  if (!stat.total || !Number.isFinite(value)) return null;
  return Math.min(1, Math.max(0, value / stat.total));
}

// ── Prioridades: o que pede ação primeiro ──

export type PriorityKind =
  | "appointment"
  | "overdue"
  | "lead"
  | "document"
  | "upcoming";

export type Priority = {
  id: string;
  kind: PriorityKind;
  tone: Tone;
  icon: IconComponent;
  /** Categoria curta ("Lead", "Atrasado"). */
  kicker: string;
  title: string;
  detail: string;
  /** Quando ("em 25 min", "há 3 dias"). */
  when?: string;
  actionLabel: string;
  onAction: () => void;
  urgent: boolean;
  /** Menor = mais importante. */
  rank: number;
  /** Desempate (instante ou data). */
  sort: string;
};

/**
 * Uma lista só, em ordem de urgência: compromisso que começa logo, recebimento
 * atrasado, leads esperando, documento crítico, o resto da agenda e o que
 * vence na semana.
 */
export function buildPriorities(props: HomeModelProps, now: number): Priority[] {
  const { pendingCount, upcomingAppointments, upcomingPayments, pendingDocuments, actions } =
    props;
  const out: Priority[] = [];
  const today = todayOf(now);

  for (const a of activeAppointments(upcomingAppointments)) {
    const startsIn = (ms(a.startAt) - now) / 60_000;
    const live = isOngoingAppt(a, now);
    const soon = live || startsIn <= 120;
    const isToday = localDay(a.startAt) === today;
    out.push({
      id: `appt-${a.id}`,
      kind: "appointment",
      tone: apptTone(String(a.type)),
      icon: apptIcon(String(a.type)),
      kicker: String(a.type),
      title: a.title,
      detail: [
        `${dayLabel(a.startAt, now)} · ${localTime(a.startAt)}`,
        a.clientName?.trim(),
        a.modality ? String(a.modality) : undefined,
      ]
        .filter(Boolean)
        .join(" · "),
      when: live ? "acontecendo agora" : relativeTo(a.startAt, now),
      actionLabel: "Abrir agenda",
      onAction: actions.openAgenda,
      urgent: soon,
      rank: soon ? 0 : isToday ? 3 : 5,
      sort: a.startAt,
    });
  }

  for (const p of upcomingPayments) {
    const bucket = bucketOf(p);
    if (bucket === "overdue") {
      out.push({
        id: `pay-${p.id}`,
        kind: "overdue",
        tone: "danger",
        icon: AlertIcon,
        kicker: "Recebimento atrasado",
        title: p.clientName,
        detail: `${p.description || "Parcela"}${p.amount ? ` · ${money(p.amount)}` : ""}`,
        when: dueLabel(p.dueDate, now),
        actionLabel: "Ver pagamentos",
        onAction: actions.seeAllPayments,
        urgent: true,
        rank: 1,
        sort: p.dueDate,
      });
    } else if (bucket === "upcoming") {
      const days = daysUntil(p.dueDate, now);
      if (days !== null && days <= 7) {
        out.push({
          id: `pay-${p.id}`,
          kind: "upcoming",
          tone: "previsto",
          icon: WalletIcon,
          kicker: "Recebimento previsto",
          title: p.clientName,
          detail: `${p.description || "Parcela"}${p.amount ? ` · ${money(p.amount)}` : ""}`,
          when: dueLabel(p.dueDate, now),
          actionLabel: "Ver pagamentos",
          onAction: actions.seeAllPayments,
          urgent: false,
          rank: 6,
          sort: p.dueDate,
        });
      }
    }
  }

  if (pendingCount && pendingCount > 0) {
    out.push({
      id: "leads",
      kind: "lead",
      tone: "secondary",
      icon: UsersIcon,
      kicker: "Leads",
      title: `${pendingCount} ${plural(pendingCount, "pessoa aguarda", "pessoas aguardam")} contato`,
      detail: "Preencheram o formulário e ainda não viraram clientes.",
      actionLabel: "Entrar em contato",
      onAction: actions.openLeads,
      urgent: pendingCount >= 5,
      rank: 2,
      sort: "",
    });
  }

  for (const d of pendingDocuments) {
    out.push({
      id: `doc-${d.id}`,
      kind: "document",
      tone: d.isCritical ? "danger" : "gray",
      icon: DocumentIcon,
      kicker: d.isCritical ? "Documento crítico" : "Documento pendente",
      title: d.name,
      detail: d.issue,
      actionLabel: "Ver clientes",
      onAction: actions.openClients,
      urgent: Boolean(d.isCritical),
      rank: d.isCritical ? 2 : 4,
      sort: d.name,
    });
  }

  return out.sort((a, b) => a.rank - b.rank || a.sort.localeCompare(b.sort));
}

/** Ainda carregando algo que muda a lista de prioridades. */
export const isPriorityLoading = (props: HomeModelProps) =>
  props.pendingCount === null || props.upcomingAppointments === null;

// ── Peças visuais ──

/** Rótulo pequeno, espaçado, em caixa alta. */
export function Kicker({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`text-[11px] font-medium tracking-[0.18em] uppercase ${className}`}
    >
      {children}
    </p>
  );
}

/** Selo "ilustrativo" — dado de exemplo, ainda sem integração. */
export function Illustrative({ dark = false }: { dark?: boolean }) {
  return (
    <span
      title="Dado de exemplo — ainda sem integração com o servidor"
      className={`inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[9px] font-medium tracking-wider uppercase ${
        dark ? "bg-white/10 text-white/50" : "bg-page text-gray-100/70"
      }`}
    >
      ilustrativo
    </span>
  );
}

/** Vazio de um bloco: ícone discreto + frase. */
export function Empty({
  icon: Icon,
  children,
  dark = false,
  className = "",
}: {
  icon?: IconComponent;
  children: ReactNode;
  dark?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border border-dashed px-4 py-5 text-sm ${
        dark ? "border-white/15 text-white/50" : "border-black/10 text-gray-100/70"
      } ${className}`}
    >
      {Icon && <Icon className="h-5 w-5 shrink-0 opacity-60" />}
      <span>{children}</span>
    </div>
  );
}

/** Linhas de carregamento (Skeleton do HeroUI; no escuro, pulso translúcido). */
export function LinesSkeleton({
  rows = 3,
  dark = false,
  className = "",
  rowClassName = "h-11",
}: {
  rows?: number;
  dark?: boolean;
  className?: string;
  rowClassName?: string;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className}`} aria-busy="true" aria-label="Carregando">
      {Array.from({ length: rows }, (_, i) =>
        dark ? (
          <div
            key={i}
            className={`w-full animate-pulse rounded-xl bg-white/10 ${rowClassName}`}
          />
        ) : (
          <Skeleton key={i} className={`w-full rounded-xl ${rowClassName}`} />
        ),
      )}
    </div>
  );
}

/** Ponto parado + halo pulsando — o que está acontecendo agora. */
export function LiveDot({ className = "bg-success" }: { className?: string }) {
  return (
    <span className="relative inline-flex h-2 w-2 shrink-0">
      <span
        className={`absolute inset-0 rounded-full motion-safe:animate-halo ${className}`}
      />
      <span className={`relative h-2 w-2 rounded-full ${className}`} />
    </span>
  );
}

const QA_TONE = {
  light: {
    base: "bg-white text-primary ring-1 ring-black/5 hover:bg-page hover:-translate-y-0.5",
    main: "bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90 hover:-translate-y-0.5",
    badge: "bg-secondary text-white",
  },
  dark: {
    base: "bg-white/5 text-white/80 ring-1 ring-white/10 hover:bg-white/10 hover:text-white",
    main: "bg-secondary text-primary hover:bg-secondary/90",
    badge: "bg-secondary text-primary",
  },
  glass: {
    base: "bg-white/10 text-white ring-1 ring-white/20 backdrop-blur hover:bg-white/20",
    main: "bg-white text-primary shadow-lg shadow-black/10 hover:bg-white/90",
    badge: "bg-secondary text-white",
  },
  quiet: {
    base: "text-gray-100 hover:text-primary hover:bg-white",
    main: "text-primary hover:bg-white",
    badge: "bg-secondary/15 text-secondary",
  },
} as const;

export type QuickTone = keyof typeof QA_TONE;

/** Atalhos da home: novo cliente, leads, clientes, agenda e pagamentos. */
export function QuickActions({
  actions,
  pendingCount,
  tone = "light",
  className = "",
}: {
  actions: HomeModelProps["actions"];
  pendingCount: number | null;
  tone?: QuickTone;
  className?: string;
}) {
  const t = QA_TONE[tone];
  const btn =
    "inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium whitespace-nowrap transition active:scale-95 motion-reduce:transform-none";
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <button type="button" onClick={actions.newClient} className={`${btn} ${t.main}`}>
        <PlusIcon className="h-4 w-4" /> Novo cliente
      </button>
      <button type="button" onClick={actions.openLeads} className={`${btn} ${t.base}`}>
        <UsersIcon className="h-4 w-4" /> Ver leads
        <span
          className={`rounded-full px-1.5 text-[10px] leading-4 font-semibold tabular-nums ${t.badge}`}
        >
          {leadsValue(pendingCount)}
        </span>
      </button>
      <button type="button" onClick={actions.openClients} className={`${btn} ${t.base}`}>
        <UserIcon className="h-4 w-4" /> Clientes
      </button>
      <button type="button" onClick={actions.openAgenda} className={`${btn} ${t.base}`}>
        <CalendarIcon className="h-4 w-4" /> Agenda
      </button>
      <button type="button" onClick={actions.seeAllPayments} className={`${btn} ${t.base}`}>
        <WalletIcon className="h-4 w-4" /> Pagamentos
      </button>
    </div>
  );
}

/** Link discreto de rodapé/cabeçalho de bloco. */
export function LinkButton({
  onClick,
  children,
  dark = false,
  className = "",
}: {
  onClick: () => void;
  children: ReactNode;
  dark?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group inline-flex items-center gap-1 text-xs font-medium transition ${
        dark ? "text-secondary hover:text-white" : "text-secondary hover:text-primary"
      } ${className}`}
    >
      {children}
      <ArrowRightIcon className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
    </button>
  );
}

/** "a", "a e b", "a, b e c". */
export function joinPt(parts: readonly string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} e ${parts[parts.length - 1]}`;
}
