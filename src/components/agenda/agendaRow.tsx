"use client";

import type { ComponentType, ReactNode } from "react";
import {
  RowActions,
  deleteAction,
  editAction,
  viewAction,
  type RowAction,
} from "@/components/ui/table/RowActions";
import { stageBg, stageTile } from "@/components/ui/feedback/stageRamp";
import { AppointmentStatusLabelByKey } from "@/enums/appointment/Appointment";
import { MONTH_SHORT } from "@/constants/date/months";
import { initials, plural } from "@/lib/format";
import type { AppointmentResponse } from "@/interfaces/appointment/Appointment.interface";
import {
  busyMinutes,
  formatDayHeader,
  formatDuration,
  formatWhen,
  isCancelled,
  isDone,
  isOngoing,
  isScheduled,
  localTimeOf,
  type AgendaDay,
} from "./agendaGrouping";
import {
  CalendarDotIcon,
  ChatIcon,
  GavelIcon,
  HourglassIcon,
  PinIcon,
  RescheduleIcon,
  StethoscopeIcon,
  UsersIcon,
  VideoIcon,
} from "./agendaIcons";
import { openInNewTab } from "@/lib/openInNewTab";
import { Pill } from "@/components/ui/feedback/Badges";
import { BanIcon, CalendarIcon, CheckIcon, UserIcon } from "@/components/ui/icons/glyphs";

/**
 * O desenho de um compromisso — a linha, o cabeçalho do dia e a cor do tipo.
 *
 * Mora fora da sanfona porque a Agenda não é a única tela que mostra
 * compromisso. A página usa a linha inteira (`AppointmentRow`: hora, tipo,
 * modalidade, cliente, status); o cartão da Home, a linha curta
 * (`AppointmentLine`: iniciais, título, quando e tipo). As ações são as
 * mesmas nas duas (`appointmentActions`).
 */

/**
 * O que a tela oferece para cada compromisso. `onDelete` só vem de quem pode
 * excluir (`canDestroy`); sem ela, sem o ícone.
 */
export type AgendaActions = {
  /** A descrição, numa modal — só aparece quando há descrição. */
  onViewDetails?: (appointment: AppointmentResponse) => void;
  onEdit: (appointment: AppointmentResponse) => void;
  onComplete: (appointment: AppointmentResponse) => void;
  onCancel: (appointment: AppointmentResponse) => void;
  onDelete?: (appointment: AppointmentResponse) => void;
  /** Um compromisso novo com os dados de um cancelado, sem data. */
  onReschedule?: (appointment: AppointmentResponse) => void;
  /** "Novo compromisso" — oferecido no estado vazio. */
  onCreate: () => void;
};

// ── Tipo: ícone e cor ──

type TypeStyle = {
  icon: ComponentType<{ className?: string }>;
  /** Posição na rampa de azul do funil (`stageRamp`). */
  index: number;
};

/**
 * Os tipos na ordem da rampa: Audiência (o azul cheio) até Outro (o mais
 * claro). A ordem não é alfabética nem arbitrária — é a do peso do
 * compromisso, e é a mesma usada para enfileirar os ícones no cabeçalho.
 */
export const TYPE_ORDER = [
  "Audiência",
  "Perícia",
  "Prazo",
  "Reunião",
  "Entrevista",
  "Outro",
] as const;

const TYPE_ICON: Record<string, ComponentType<{ className?: string }>> = {
  Audiência: GavelIcon,
  Perícia: StethoscopeIcon,
  Prazo: HourglassIcon,
  Reunião: UsersIcon,
  Entrevista: ChatIcon,
  Outro: CalendarDotIcon,
};

export function typeStyle(type: string): TypeStyle {
  const index = TYPE_ORDER.indexOf(type as (typeof TYPE_ORDER)[number]);
  const known = index >= 0;
  return {
    icon: TYPE_ICON[type] ?? CalendarDotIcon,
    index: known ? index : TYPE_ORDER.length - 1,
  };
}

/** Só o fundo — régua do expediente, ponto ao lado do nome. */
export const typeSolid = (type: string) => stageBg(typeStyle(type).index);
/** Fundo com traço legível — ladrilho de ícone. */
export const typeTile = (type: string) => stageTile(typeStyle(type).index);

/** Ponto do selo: agendado em azul claro (o "previsto" da Carteira). */
const STATUS_DOT: Record<string, string> = {
  [AppointmentStatusLabelByKey.AGENDADO]: "bg-sky-400",
  [AppointmentStatusLabelByKey.CONCLUIDO]: "bg-success",
  [AppointmentStatusLabelByKey.CANCELADO]: "bg-danger",
};

// ── Peças ──

/** Selo de status: texto em `gray-100`, como o resto da linha; a cor fica no ponto. */
function StatusChip({ status }: { status: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-2.5 py-0.5 text-[11px] font-medium text-gray-100 ring-1 ring-black/10">
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status] ?? "bg-sky-400"}`} />
      {status}
    </span>
  );
}

/** Ponto parado + halo pulsando — só no que está acontecendo agora. */
function LiveDot() {
  return (
    <span className="relative inline-flex h-2 w-2">
      <span className="absolute inset-0 rounded-full bg-success motion-safe:animate-halo" />
      <span className="relative h-2 w-2 rounded-full bg-success" />
    </span>
  );
}

/** Tipo escrito, com o ponto na cor da rampa. */
function TypeTag({
  type,
  className = "",
}: {
  type: string;
  className?: string;
}) {
  return (
    <span className={`inline-flex min-w-0 items-center gap-2 ${className}`}>
      <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${typeSolid(type)}`} />
      <span className="truncate">{type}</span>
    </span>
  );
}

/** Modalidade (com o local, se presencial) e cliente. */
function MetaLine({
  appointment,
  leading,
  className = "",
}: {
  appointment: AppointmentResponse;
  /** Entra antes da modalidade. */
  leading?: ReactNode;
  className?: string;
}) {
  const who = appointment.clientName?.trim();
  const online = appointment.modality === "Online";
  if (!leading && !appointment.modality && !who) return null;
  return (
    <div
      className={`flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-100 ${className}`}
    >
      {leading}
      {appointment.modality && (
        <span className="inline-flex items-center gap-1">
          {online ? <VideoIcon className="h-3.5 w-3.5" /> : <PinIcon className="h-3.5 w-3.5" />}
          {appointment.modality}
          {!online && appointment.location ? ` · ${appointment.location}` : ""}
        </span>
      )}
      {who && (
        <span className="inline-flex min-w-0 items-center gap-1">
          <UserIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{who}</span>
        </span>
      )}
    </div>
  );
}

/**
 * Um compromisso: hora, tipo, título com modalidade e cliente, status e
 * ações. As ações chegam prontas de quem desenha — a regra de qual aparece é
 * do backend, não da linha (ver `appointmentActions`).
 */
export function AppointmentRow({
  appointment: a,
  actions,
  now,
}: {
  appointment: AppointmentResponse;
  actions: RowAction<AppointmentResponse>[];
  now: number;
}) {
  const cancelled = isCancelled(a);
  const dim = cancelled ? "opacity-60" : "";
  return (
    <li className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-black/5 px-6 py-4 text-sm text-gray-100 transition-colors last:border-b-0 hover:bg-secondary/5">
      <span className={`w-20 shrink-0 font-semibold text-primary tabular-nums ${dim}`}>
        {localTimeOf(a.startAt)}
        <span className="block text-[11px] font-normal text-gray-100">
          até {localTimeOf(a.endAt)}
        </span>
      </span>

      <TypeTag type={String(a.type)} className={`w-28 text-xs font-medium ${dim}`} />

      <span className="min-w-0 flex-1">
        <span
          className={`flex items-center gap-2 font-medium ${cancelled ? "line-through opacity-60" : ""}`}
        >
          <span className="truncate" title={a.title}>
            {a.title}
          </span>
          {isOngoing(a, now) && <LiveDot />}
        </span>
        <MetaLine appointment={a} className={`mt-0.5 ${dim}`} />
        {cancelled && a.cancellationReason && (
          <p className="mt-1 truncate text-xs text-danger/80" title={a.cancellationReason}>
            Cancelado: {a.cancellationReason}
          </p>
        )}
      </span>

      <StatusChip status={String(a.status)} />
      <RowActions row={a} actions={actions} className="flex-wrap" />
    </li>
  );
}

/**
 * A linha curta do cartão da Home: as iniciais do cliente (ou do título) num
 * quadrado, o título e, embaixo, quando e o tipo; as ações à direita. O
 * cartão só mostra agendados, então não há status nem cancelamento a contar.
 */
export function AppointmentLine({
  appointment: a,
  actions,
  now,
}: {
  appointment: AppointmentResponse;
  actions: RowAction<AppointmentResponse>[];
  now: number;
}) {
  const source = a.clientName?.trim() || a.title?.trim();
  return (
    <li className="flex items-center gap-3 rounded-xl px-1 py-2 hover:bg-light-gray/40">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-light-gray/70 text-[11px] font-medium text-gray-100">
        {source ? initials(source) : <CalendarIcon className="h-4 w-4 text-gray-100/70" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-xs text-primary">
          <span className="truncate" title={a.title}>
            {a.title}
          </span>
          {isOngoing(a, now) && <LiveDot />}
        </span>
        <span className="block truncate text-[11px] text-gray-100/60">
          {formatWhen(a.startAt, new Date(now))} · {String(a.type)}
        </span>
      </span>
      <RowActions row={a} actions={actions} className="shrink-0 text-gray-100" />
    </li>
  );
}

/**
 * O resumo de um dia: o ladrilho (mês e dia) e o dia da semana com o que ele
 * tem. Sem repetir: a data só no ladrilho, o dia da semana só no título.
 *
 * Devolve dois irmãos (fragmento) para que a página possa pô-los dentro do
 * botão que abre a sanfona e o cartão, numa faixa própria.
 */
export function DayHeading({
  day,
  isToday,
  compact = false,
}: {
  day: AgendaDay;
  isToday: boolean;
  compact?: boolean;
}) {
  const [, month, date] = day.date.split("-").map(Number);
  const weekday = formatDayHeader(day.date).split(",")[0];
  const first = day.items[0];
  const last = day.items[day.items.length - 1];
  const done = day.items.filter(isDone).length;

  return (
    <>
      <span
        className={`flex shrink-0 flex-col items-center justify-center rounded-2xl ${
          compact ? "h-11 w-11" : "h-14 w-14"
        } ${isToday ? "bg-primary text-white" : "bg-page text-primary"}`}
      >
        <span className="text-[9px] tracking-wider uppercase opacity-70">
          {MONTH_SHORT[month - 1]}
        </span>
        <span
          className={`leading-none font-semibold tabular-nums ${compact ? "text-base" : "text-xl"}`}
        >
          {String(date).padStart(2, "0")}
        </span>
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={`flex items-center gap-2 font-medium text-primary ${compact ? "text-sm" : ""}`}
        >
          {weekday}
          {isToday && (
            <Pill tone="info">hoje</Pill>
          )}
        </span>
        <span className="mt-0.5 block text-xs text-gray-100">
          {plural(day.items.length, "compromisso", "compromissos")} ·{" "}
          {localTimeOf(first.startAt)}–{localTimeOf(last.endAt)} ·{" "}
          {formatDuration(busyMinutes(day.items))}
          {done > 0 && ` · ${plural(done, "concluído", "concluídos")}`}
        </span>
      </span>
    </>
  );
}

/**
 * As ações, na regra que o backend impõe: ver a descrição quando há; entrar
 * sempre que houver link; concluir, editar e cancelar só em agendado (um
 * cancelado não se conclui e um concluído não se cancela); reagendar só o
 * cancelado; excluir só com `onDelete`, que a página só passa para quem pode
 * (`canDestroy`). Cancelar é de todos: é o que o atendente usa quando o
 * cliente desmarca.
 */
export function appointmentActions(
  actions: AgendaActions,
): RowAction<AppointmentResponse>[] {
  return [
    ...(actions.onViewDetails
      ? [{ ...viewAction("Ver detalhes", actions.onViewDetails), visible: (a: AppointmentResponse) => Boolean(a.description?.trim()) }]
      : []),
    {
      id: "join",
      label: "Entrar na reunião",
      icon: <VideoIcon className="h-5 w-5" />,
      tone: "primary",
      visible: (a) => Boolean(a.meetingUrl),
      onPress: (a) => openInNewTab(a.meetingUrl),
    },
    {
      id: "complete",
      label: "Concluir",
      icon: <CheckIcon className="h-5 w-5" />,
      tone: "success",
      visible: isScheduled,
      onPress: actions.onComplete,
    },
    { ...editAction("Editar", actions.onEdit), visible: isScheduled },
    {
      id: "cancel",
      label: "Cancelar",
      icon: <BanIcon className="h-5 w-5" />,
      tone: "warning",
      visible: isScheduled,
      onPress: actions.onCancel,
    },
    ...(actions.onReschedule
      ? [
          {
            id: "reschedule",
            label: "Reagendar",
            icon: <RescheduleIcon className="h-5 w-5" />,
            tone: "secondary" as const,
            visible: isCancelled,
            onPress: actions.onReschedule,
          },
        ]
      : []),
    ...(actions.onDelete ? [deleteAction("Excluir", actions.onDelete)] : []),
  ];
}
