"use client";

import {
  Accordion,
  Button,
  Drawer,
  Input,
  Label,
  Modal,
  Pagination,
  Skeleton,
  Table,
  Tabs,
  TextArea,
  Tooltip,
  WarningIcon,
} from "@heroui/react";
import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Card, SectionTitle } from "../ui";
import { Field, SelectField } from "@/components/ui/form/Field";
import { MONTH_LABELS } from "@/constants/date/months";
import ActionButton from "@/components/ui/table/ActionButton";
import {
  ELLIPSIS,
  buildPageList,
  buildSkeletonRows,
  clampPage,
} from "@/lib/pagination";
import { usePendingAction } from "@/hooks/usePendingAction";
import { useAppointmentConflicts } from "@/hooks/useAppointmentConflicts";
import { applyPendingOverlay, applyPendingTotal } from "@/lib/pendingActions";
import AppointmentFormFields from "./AppointmentFormFields";
import { ConflictDecisionModal } from "./ConflictDecisionModal";
import {
  EMPTY_APPOINTMENT_FORM,
  fromResponse,
  isStartInPast,
  shiftAfter,
  toIsoInstant,
  toRequest,
  validateAppointmentForm,
  type AppointmentFormValues,
} from "./appointmentForm";
import {
  cancelAppointment,
  completeAppointment,
  createAppointment,
  deleteAppointment,
  getAppointmentSummary,
  listAppointments,
  updateAppointment,
} from "@/services/appointmentService";
import type {
  AppointmentResponse,
  AppointmentSummary,
} from "@/interfaces/appointment/Appointment.interface";
import {
  AppointmentStatusLabelByKey,
  AppointmentStatusOptions,
  type AppointmentStatusKey,
} from "@/enums/appointment/Appointment";
import { usePermissoes } from "@/hooks/usePermissoes";

/**
 * Card "Agenda" — compromissos reais (AppointmentController), agrupados por
 * mês. Substitui o antigo `Schedule.tsx`, que era só um mock com 3 campos de
 * formulário: aqui o cadastro/edição usa `AppointmentFormFields` (espelha os
 * campos obrigatórios do backend) e todas as ações batem nos endpoints reais.
 *
 * As abas vêm de `GET /appointments/summary?year=` (contagem por mês, exclui
 * cancelados); a lista do mês selecionado vem de `GET /appointments`,
 * filtrada por `status=AGENDADO` — cancelados/concluídos saem da agenda "do
 * que vem por aí" assim que mudam de status.
 */

/** Colunas da tabela do modal "Ver todos". */
const APPOINTMENT_TABLE_COLUMNS = [
  { id: "title", name: "Compromisso" },
  { id: "when", name: "Quando" },
  { id: "type", name: "Tipo" },
  { id: "description", name: "Descrição" },
  { id: "actions", name: "Ações" },
] as const;

/** Tamanho mínimo exigido na justificativa de cancelamento. */
const MIN_CANCEL_JUSTIFICATION_LENGTH = 10;

/** A tabela de cancelados ganha a coluna "Motivo" (`cancellationReason`), inexistente nos outros status. */
const CANCELLED_TABLE_COLUMNS = [
  { id: "title", name: "Compromisso" },
  { id: "when", name: "Quando" },
  { id: "type", name: "Tipo" },
  { id: "description", name: "Descrição" },
  { id: "reason", name: "Motivo" },
  { id: "actions", name: "Ações" },
] as const;

/**
 * Linhas fantasma do carregamento — mesmo padrão de `clientes/page.tsx`:
 * `Table.Body` é uma coleção e precisa de `items` com `id`; o conteúdo de
 * cada célula sai do `Table.Collection` sobre as colunas.
 */
const SKELETON_ROWS = buildSkeletonRows(3);

/** Itens visíveis na lista compacta do card — o resto só aparece no modal. */
/**
 * Como a linha aparece enquanto a janela de desfazer corre. A API trabalha
 * com o label PT-BR (`@JsonValue`), não com a chave do enum — por isso o
 * overlay compara e escreve label.
 */
const PENDING_STATUS_LABELS = {
  complete: AppointmentStatusLabelByKey.CONCLUIDO,
  cancel: AppointmentStatusLabelByKey.CANCELADO,
} as const;

const COMPACT_LIMIT = 3;
/** Itens por página em cada tabela do modal "Ver todos". */
const MODAL_PAGE_SIZE = 10;

/**
 * Uma página de compromissos — `items` já vem do tamanho certo (`pageSize`)
 * direto do backend via `listAppointments`; `total` é `pagination.totalRecords`
 * do envelope, para saber quanto tem no total sem precisar carregar tudo.
 */
type PagedAppointments = { items: AppointmentResponse[]; total: number };

/** "Hoje, às 14h30" / "Amanhã, às 09h00" / "23/09, às 15h00". */
function formatWhen(startAt: string): string {
  const start = new Date(startAt);
  if (Number.isNaN(start.getTime())) return "-";

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const time = start
    .toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    .replace(":", "h");

  if (isSameDay(start, now)) return `Hoje, às ${time}`;
  if (isSameDay(start, tomorrow)) return `Amanhã, às ${time}`;
  const date = start.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
  return `${date}, às ${time}`;
}

/** Iniciais para o avatar — a partir do cliente vinculado, senão do título. */
function initialsFrom(appointment: AppointmentResponse): string | undefined {
  const source = appointment.clientName?.trim() || appointment.title?.trim();
  if (!source) return undefined;
  const initials = source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return initials || undefined;
}

function CalendarOutlineIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 11h18" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <rect x="2" y="6" width="13" height="12" rx="2" />
      <path d="m15 11 6-3.5v9L15 13" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/** Detalhes — documento com linhas de texto, sugerindo "há algo escrito aqui". */
function DetailsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path d="M14 3v5h5" />
      <path d="M19 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h9l6 6v11a1 1 0 0 1-1 1Z" />
      <path d="M8 13h8M8 17h5" />
    </svg>
  );
}

function CancelIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m9.5 9.5 5 5m0-5-5 5" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
    </svg>
  );
}

/** Seta circular — reagendar um compromisso cancelado. */
function RescheduleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path d="M3 12a9 9 0 1 1 3 6.7" />
      <path d="M3 16v-4h4" />
    </svg>
  );
}


/** Ação de linha pendente de confirmação — cancelamento ou exclusão. */
type RowAction = {
  /**
   * `complete-early` é confirmação, não destruição: concluir algo que ainda
   * não começou. O backend recusa com 422 sem a ciência, e é melhor perguntar
   * aqui do que mandar, tomar o 422 e explicar depois.
   */
  kind: "cancel" | "delete" | "complete-early";
  appointment: AppointmentResponse;
};

export type AppointmentsCardProps = { className?: string };

/**
 * Componente interno de verdade — separado do export default só porque usa
 * `useSearchParams` (pro item "Agenda" da navbar abrir o modal via
 * `?openAgenda=true`), que o Next exige rodar dentro de um `<Suspense>` pra
 * não tirar a página inteira da renderização estática. Ver o wrapper
 * `AppointmentsCard` no fim do arquivo.
 */
function AppointmentsCardInner({ className = "" }: AppointmentsCardProps) {
  const { podeDestruir } = usePermissoes();
  // ── Ano fixo no atual — sem seletor de ano por enquanto (fora do escopo). ──
  const year = useMemo(() => new Date().getFullYear(), []);
  const currentMonth = useMemo(() => new Date().getMonth() + 1, []);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  /**
   * Se o modal "Ver todos" está aberto — subida aqui (não fica só perto do
   * resto do estado do modal) porque a busca da lista compacta do card
   * também precisa saber disso: com o modal aberto, navegar entre abas ali
   * dentro não pode disparar a busca do card por trás (ele nem está visível).
   */
  const [isAllOpen, setIsAllOpen] = useState(false);

  /**
   * O item "Agenda" da navbar (global, fora deste componente) linka pra
   * `/home?openAgenda=true` — é a única forma de abrir o modal a partir de
   * outra página, já que `isAllOpen` é estado local daqui.
   *
   * Usa `useSearchParams` (não hash + `hashchange`): o `<Link>` do Next
   * navega via `history.pushState`/`replaceState`, e esses NÃO disparam
   * `hashchange` — esse evento só existe pra navegação nativa de hash (link
   * `<a href="#x">` puro, ou back/forward). Search params, ao contrário, o
   * App Router mantém reativo de verdade: `useSearchParams()` re-renderiza
   * em qualquer navegação via `<Link>`, inclusive clicando de novo já
   * estando em `/home`.
   */
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("openAgenda") !== "true") return;
    setIsAllOpen(true);
    // Limpa o param sem entrada nova no histórico.
    const params = new URLSearchParams(searchParams);
    params.delete("openAgenda");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }, [searchParams, pathname, router]);

  /**
   * Resumo (contagem por mês) por ano — cacheado por ano pra poder sondar
   * anos vizinhos ao atual (usado pelo filtro "Ano" do modal "Ver todos": só
   * lista anos que realmente têm compromisso no mês da aba aberta, sem
   * depender de um endpoint dedicado pra isso).
   */
  const [yearSummaryCache, setYearSummaryCache] = useState<
    Record<number, AppointmentSummary[]>
  >({});
  const fetchedYearsRef = useRef<Set<number>>(new Set());
  const summary = yearSummaryCache[year] ?? [];
  /**
   * Antes do resumo chegar, `months` só tem o mês corrente — a barra de
   * abas real só monta depois do primeiro carregamento, pra não nascer com
   * 1 aba e "esticar" pra 3+ quando o resumo chega (o `Tabs.Indicator` mede
   * a posição da aba selecionada; se o layout muda debaixo dele logo depois
   * de montar, ele fica visualmente deslocado até a próxima interação).
   */
  const [summaryLoading, setSummaryLoading] = useState(true);
  /** Nenhum compromisso em nenhum mês do ano — esconde as abas por completo em vez de mostrá-las todas vazias. */
  const hasAnyAppointmentsThisYear = summary.some((s) => s.count > 0);

  /**
   * Cache da lista (AGENDADO) por mês — busca só `COMPACT_LIMIT` itens
   * (`pageSize` na query, não um `pageSize: 100` cortado no client depois).
   * `fetchedMonthsRef` é síncrono e marcado ANTES da chamada sair, então
   * reselecionar uma aba já visitada nunca dispara uma nova requisição: só lê
   * o que já está em `appointmentsCache`. Só volta a buscar depois de
   * `refresh()` (chamado após criar/editar/cancelar/concluir/excluir), que
   * limpa o cache porque aí sim há dado novo.
   */
  const [appointmentsCache, setAppointmentsCache] = useState<
    Record<number, PagedAppointments>
  >({});
  const [loadingMonths, setLoadingMonths] = useState<Set<number>>(new Set());
  const fetchedMonthsRef = useRef<Set<number>>(new Set());

  /**
   * Ações com janela de desfazer (concluir/cancelar/excluir). A tela já
   * reflete a ação; a requisição só sai quando a janela expira.
   */
  const { pending, schedule } = usePendingAction();

  const rawAppointments = appointmentsCache[selectedMonth]?.items ?? [];
  const appointments = applyPendingOverlay(
    rawAppointments,
    pending,
    PENDING_STATUS_LABELS,
  );
  /** Total real de agendados no mês (vem do backend) — não `appointments.length`, que é só a página de 3. */
  const appointmentsTotal = applyPendingTotal(
    appointmentsCache[selectedMonth]?.total ?? 0,
    rawAppointments,
    pending,
  );
  const listLoading = loadingMonths.has(selectedMonth);
  /**
   * `true` só quando `appointmentsTotal` é dado de verdade pro mês
   * selecionado — não `!listLoading`: entre trocar de aba (`selectedMonth`
   * muda) e o efeito que dispara `fetchList` marcar `loadingMonths`, existe
   * um render onde `listLoading` ainda está `false` mas o cache pro mês novo
   * ainda não chegou — nesse instante `appointmentsTotal` é só o `?? 0` do
   * cache vazio. Usar isso pro badge fazia o número piscar pra 0 antes de
   * assentar no valor certo.
   */
  const hasConfirmedAppointmentsTotal =
    appointmentsCache[selectedMonth] !== undefined;

  /**
   * Busca (e cacheia) o resumo de um ano — usada tanto pro ano fixo do card
   * quanto pra sondar o filtro "Ano" do modal. `summaryLoading` só desarma
   * quando o ano ATUAL termina de carregar (é o único que a barra de abas
   * do card espera).
   */
  const fetchYearSummary = useCallback(
    (targetYear: number) => {
      if (fetchedYearsRef.current.has(targetYear)) return;
      fetchedYearsRef.current.add(targetYear);
      getAppointmentSummary(targetYear)
        .then((envelope) => {
          setYearSummaryCache((prev) => ({
            ...prev,
            [targetYear]: envelope?.data ?? [],
          }));
        })
        .catch(() => {
          fetchedYearsRef.current.delete(targetYear);
          setYearSummaryCache((prev) => ({ ...prev, [targetYear]: [] }));
        })
        .finally(() => {
          if (targetYear === year) setSummaryLoading(false);
        });
    },
    [year],
  );

  const fetchSummary = useCallback(() => {
    fetchYearSummary(year);
  }, [year, fetchYearSummary]);

  const fetchList = useCallback(
    (month: number) => {
      if (fetchedMonthsRef.current.has(month)) return;
      fetchedMonthsRef.current.add(month);
      setLoadingMonths((prev) => new Set(prev).add(month));
      listAppointments({
        year,
        month,
        status: "AGENDADO",
        pageNumber: 1,
        pageSize: COMPACT_LIMIT,
      })
        .then((envelope) => {
          setAppointmentsCache((prev) => ({
            ...prev,
            [month]: {
              items: envelope?.data ?? [],
              total:
                envelope?.pagination?.totalRecords ??
                envelope?.data?.length ??
                0,
            },
          }));
        })
        .catch(() => {
          // Falhou — libera pra tentar de novo numa próxima seleção, em vez
          // de "cachear" um erro como se fosse mês vazio pra sempre.
          fetchedMonthsRef.current.delete(month);
          setAppointmentsCache((prev) => ({
            ...prev,
            [month]: { items: [], total: 0 },
          }));
        })
        .finally(() => {
          setLoadingMonths((prev) => {
            const next = new Set(prev);
            next.delete(month);
            return next;
          });
        });
    },
    [year],
  );

  useEffect(fetchSummary, [fetchSummary]);
  useEffect(() => {
    // Com o modal "Ver todos" aberto, o card fica atrás e não está visível —
    // navegar entre abas ali dentro não pode disparar a busca da lista
    // compacta também (era o que gerava 2 requisições por clique de aba:
    // uma do card, com pageSize=3, e outra do modal). Ao fechar o modal, o
    // efeito roda de novo (isAllOpen entra nas deps) e busca se ainda faltar.
    if (isAllOpen) return;
    fetchList(selectedMonth);
  }, [selectedMonth, isAllOpen, fetchList]);

  /**
   * Abas: só meses com compromissos de fato (evita 12 abas vazias) — mas o
   * mês corrente e o mês selecionado sempre entram, mesmo com contagem zero.
   * Sem isso, "o mês atual sem agendamentos" não teria aba para exibir a
   * mensagem de vazio, e um mês que acabou de zerar (última ação cancelada)
   * sumiria da baixo do usuário com ele ainda selecionado.
   */
  const months = useMemo(() => {
    const monthNumbers = new Set<number>(
      summary.filter((s) => s.count > 0).map((s) => s.month),
    );
    monthNumbers.add(currentMonth);
    monthNumbers.add(selectedMonth);

    return Array.from(monthNumbers)
      .sort((a, b) => a - b)
      .map((month, index) => {
        /**
         * O badge é a contagem de AGENDADOS, não o total do resumo do
         * backend (que só exclui cancelados — inclui concluídos). Para o mês
         * selecionado já temos essa contagem exata (`appointmentsTotal`, vem
         * de `pagination.totalRecords` — não `appointments.length`, que é só
         * a página de `COMPACT_LIMIT` itens); pros demais meses, sem um fetch
         * por status para cada um, caímos no resumo como aproximação até o
         * usuário navegar até eles.
         */
        const count =
          month === selectedMonth && hasConfirmedAppointmentsTotal
            ? appointmentsTotal
            : (summary.find((s) => s.month === month)?.count ?? 0);
        return {
          id: String(month),
          month,
          label: MONTH_LABELS[month - 1],
          count,
          isFirst: index === 0,
        };
      });
  }, [
    summary,
    currentMonth,
    selectedMonth,
    appointmentsTotal,
    hasConfirmedAppointmentsTotal,
  ]);

  const selectedMonthLabel = MONTH_LABELS[selectedMonth - 1];

  const renderMonthTab = (item: (typeof months)[number]) => (
    <Tabs.Tab id={item.id} className="text-xs">
      {!item.isFirst && <Tabs.Separator />}
      <span className="flex items-center gap-1">
        {item.label}
        {item.count > 0 && (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-medium text-white">
            {item.count}
          </span>
        )}
      </span>
      <Tabs.Indicator />
    </Tabs.Tab>
  );

  /** Placeholder da barra de abas, enquanto `summaryLoading` — ver comentário acima de `summaryLoading`. */
  const tabsSkeleton = (
    <div className="flex items-center gap-3 px-1 py-2">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="rounded-full">
          <div className="h-6 w-16 rounded-full bg-default-300" />
        </Skeleton>
      ))}
    </div>
  );

  /** Placeholder da lista compacta — usado tanto em `listLoading` quanto (fora do `Tabs.Panel`) em `summaryLoading`. */
  const listSkeleton = (
    <ul className="flex flex-1 flex-col gap-2">
      {[1, 2, 3].map((i) => (
        <li key={i} className="flex items-center gap-3 px-1 py-2">
          <Skeleton className="shrink-0 rounded-lg">
            <div className="h-9 w-9 rounded-lg bg-default-300" />
          </Skeleton>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton className="rounded">
              <div className="h-3 w-2/3 rounded bg-default-300" />
            </Skeleton>
            <Skeleton className="rounded">
              <div className="h-2.5 w-1/3 rounded bg-default-300" />
            </Skeleton>
          </div>
        </li>
      ))}
    </ul>
  );

  /**
   * Placeholder do modal "Ver todos" enquanto nenhum status ainda confirmou
   * ter dado (primeira busca de uma combinação mês/ano/busca) — 3 barras
   * imitando os cabeçalhos do accordion, no lugar do texto genérico.
   */
  const accordionSkeleton = (
    <div className="mt-4 flex flex-col gap-2">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="rounded-xl">
          <div className="h-12 w-full rounded-xl bg-default-300" />
        </Skeleton>
      ))}
    </div>
  );

  // ── Drawer "Novo compromisso" / "Editar compromisso" ──
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] =
    useState<AppointmentResponse | null>(null);
  const [formValues, setFormValues] = useState<AppointmentFormValues>(
    EMPTY_APPOINTMENT_FORM,
  );
  const [formBaseline, setFormBaseline] = useState<AppointmentFormValues>(
    EMPTY_APPOINTMENT_FORM,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = editingAppointment !== null;

  const liveErrors = useMemo(
    () => validateAppointmentForm(formValues, { isEditing }),
    [formValues, isEditing],
  );
  const isPastBlocked = useMemo(
    () => isStartInPast(formValues) && !formValues.pastDateAcknowledged,
    [formValues],
  );
  // Botão "Agendar"/"Salvar" só libera quando as regras passam — não basta
  // validar no submit, o usuário precisa ver o botão travado até corrigir.
  const isFormValid = Object.keys(liveErrors).length === 0 && !isPastBlocked;

  const isFormDirty = useMemo(
    () => JSON.stringify(formValues) !== JSON.stringify(formBaseline),
    [formValues, formBaseline],
  );

  const openCreateDrawer = () => {
    setEditingAppointment(null);
    setFormValues(EMPTY_APPOINTMENT_FORM);
    setFormBaseline(EMPTY_APPOINTMENT_FORM);
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (appointment: AppointmentResponse) => {
    const values = fromResponse(appointment);
    setEditingAppointment(appointment);
    setFormValues(values);
    setFormBaseline(values);
    setIsDrawerOpen(true);
  };

  /**
   * "Reagendar" um cancelado abre o drawer de **criação** (não edição) pré-
   * preenchido com os dados do compromisso original, mas sem data/hora — o
   * usuário escolhe a nova. Não há endpoint para reabrir um cancelamento; o
   * original permanece cancelado (histórico) e isto cria um novo AGENDADO.
   */
  const openRescheduleDrawer = (appointment: AppointmentResponse) => {
    const values: AppointmentFormValues = {
      ...fromResponse(appointment),
      startAt: null,
      endAt: null,
      justification: "",
      pastDateAcknowledged: false,
    };
    setEditingAppointment(null);
    setFormValues(values);
    setFormBaseline(values);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setEditingAppointment(null);
    setFormValues(EMPTY_APPOINTMENT_FORM);
    setFormBaseline(EMPTY_APPOINTMENT_FORM);
  };

  const handleFieldChange = useCallback(
    <K extends keyof AppointmentFormValues>(
      field: K,
      value: AppointmentFormValues[K],
    ) => {
      setFormValues((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  /**
   * Modal de confirmação disparado quando o usuário tenta fechar o drawer com
   * o formulário sujo (mesmo padrão do antigo `Schedule.tsx`).
   */
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);

  const handleDrawerOpenChange = (open: boolean) => {
    if (open) {
      setIsDrawerOpen(true);
      return;
    }
    if (isFormDirty) {
      setIsDiscardConfirmOpen(true);
      return;
    }
    closeDrawer();
  };

  const handleDiscard = () => {
    setIsDiscardConfirmOpen(false);
    closeDrawer();
  };

  /** Aberto quando o salvar esbarra em conflito e a escolha ainda não foi feita. */
  const [isConflictDecisionOpen, setIsConflictDecisionOpen] = useState(false);

  /**
   * Conflitos do horário em edição. Fica aqui, e não dentro de
   * `AppointmentFormFields`, porque quem salva é este card — interceptar o
   * clique exige ter a lista no mesmo lugar da decisão.
   */
  const { conflicts } = useAppointmentConflicts({
    startAt: toIsoInstant(formValues.startAt),
    endAt: toIsoInstant(formValues.endAt),
    excludeId: editingAppointment?.id,
    enabled: isDrawerOpen && !isSubmitting,
  });

  const handleSubmit = (event?: React.FormEvent) => {
    event?.preventDefault();
    // O botão já fica desabilitado enquanto `isFormValid` é falso; este guard
    // é só defesa extra (ex.: Enter dentro de um campo de texto).
    if (!isFormValid) return;

    // Com conflito, a escolha vem antes da gravação. O aviso no formulário
    // informa; ele não obriga a olhar.
    if (conflicts.length > 0) {
      setIsConflictDecisionOpen(true);
      return;
    }
    void persist([]);
  };

  /**
   * Grava de fato. `idsToCancel` vazio = manter os dois.
   *
   * Os cancelamentos vêm **antes** da gravação: se um falhar, nada foi criado e
   * a agenda continua coerente. Na ordem inversa, um erro deixaria o novo
   * marcado e o antigo vivo — a sobreposição que a pessoa acabou de recusar.
   */
  const persist = async (idsToCancel: string[]) => {
    setIsSubmitting(true);
    try {
      for (const id of idsToCancel) {
        await cancelAppointment(id, {
          justification: `Substituído por: ${formValues.title.trim()}`,
        });
      }

      const body = toRequest(formValues, { isEditing });
      if (isEditing) await updateAppointment(editingAppointment!.id, body);
      else await createAppointment(body);

      setIsConflictDecisionOpen(false);
      closeDrawer();
      refresh();
    } catch (err) {
      // Erro já sinalizado pelo toast global do axiosService; mantém o drawer
      // aberto para o usuário corrigir sem perder o que preencheu.
      console.error("Erro ao salvar compromisso:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Cancelar / excluir (confirmação + justificativa no cancelamento) ──
  const [rowAction, setRowAction] = useState<RowAction | null>(null);

  /**
   * Compromisso exibido na modal de detalhes. Estado próprio, separado de
   * `RowAction`: aquele é para ações destrutivas que pedem confirmação e têm um
   * `handleConfirm`; esta modal só lê e fecha.
   */
  const [detailsAppointment, setDetailsAppointment] =
    useState<AppointmentResponse | null>(null);
  const [cancelJustification, setCancelJustification] = useState("");
  const [cancelJustificationError, setCancelJustificationError] = useState<
    string | undefined
  >();

  const closeRowAction = () => {
    setRowAction(null);
    setCancelJustification("");
    setCancelJustificationError(undefined);
  };

  const handleConfirmRowAction = () => {
    if (!rowAction) return;

    if (rowAction.kind === "cancel") {
      const justification = cancelJustification.trim();
      if (!justification) {
        setCancelJustificationError("Informe a justificativa.");
        return;
      }
      if (justification.length < MIN_CANCEL_JUSTIFICATION_LENGTH) {
        setCancelJustificationError(
          `A justificativa precisa ter pelo menos ${MIN_CANCEL_JUSTIFICATION_LENGTH} caracteres.`,
        );
        return;
      }
      // Fecha o diálogo na hora: a confirmação já aconteceu, o que resta é a
      // janela de desfazer no toast.
      const { id } = rowAction.appointment;
      closeRowAction();
      schedule({
        key: id,
        kind: "cancel",
        message: "Compromisso cancelado.",
        commit: () =>
          cancelAppointment(id, { justification }, { silent: true }),
        onSettled: () => refresh(),
      });
      return;
    }

    if (rowAction.kind === "complete-early") {
      const { appointment } = rowAction;
      closeRowAction();
      concluir(appointment, true);
      return;
    }

    const { id } = rowAction.appointment;
    closeRowAction();
    schedule({
      key: id,
      kind: "delete",
      message: "Compromisso excluído.",
      commit: () => deleteAppointment(id, { silent: true }),
      onSettled: () => refresh(),
    });
  };

  // ── Concluir — ação direta, com janela de desfazer no toast. ──
  const concluir = (
    appointment: AppointmentResponse,
    earlyCompletionAcknowledged = false,
  ) => {
    schedule({
      key: appointment.id,
      kind: "complete",
      message: "Compromisso concluído.",
      commit: () =>
        completeAppointment(appointment.id, {
          silent: true,
          earlyCompletionAcknowledged,
        }),
      onSettled: () => refresh(),
    });
  };

  /**
   * Compromisso que ainda não começou passa pela confirmação; o resto conclui
   * direto.
   *
   * A checagem local existe para não gastar uma ida ao servidor e um toast de
   * erro numa recusa previsível — mas quem manda é o backend, que recusa de
   * novo se o relógio daqui estiver adiantado.
   */
  const handleComplete = (appointment: AppointmentResponse) => {
    const naoComecou =
      !!appointment.startAt &&
      new Date(appointment.startAt).getTime() > Date.now();
    if (naoComecou) {
      setRowAction({ kind: "complete-early", appointment });
      return;
    }
    concluir(appointment);
  };

  /**
   * Cluster de ações de uma linha — compartilhado entre a lista compacta e o
   * modal "Ver todos". Concluir/editar/cancelar só fazem sentido em quem
   * ainda está agendado; reagendar só em quem está cancelado; excluir e o
   * link de reunião valem para qualquer status.
   */
  const renderActions = (item: AppointmentResponse) => {
    const isScheduled = item.status === AppointmentStatusLabelByKey.AGENDADO;
    const isCancelled = item.status === AppointmentStatusLabelByKey.CANCELADO;
    return (
      <span className="flex shrink-0 items-center gap-0.5 text-gray-100">
        {/* Só aparece quando há o que mostrar — abrir uma modal vazia seria
            pior que não ter o botão. */}
        {item.description?.trim() && (
          <ActionButton
            label="Ver detalhes"
            tone="neutral"
            onClick={() => setDetailsAppointment(item)}
          >
            <DetailsIcon />
          </ActionButton>
        )}
        {item.meetingUrl && (
          <ActionButton
            label={`Entrar na reunião`}
            tone="primary"
            isDisabled={isCancelled}
            onClick={() =>
              window.open(item.meetingUrl!, "_blank", "noopener,noreferrer")
            }
          >
            <VideoIcon />
          </ActionButton>
        )}
        {isScheduled && (
          <ActionButton
            label={`Concluir Compromisso`}
            tone="success"
            onClick={() => handleComplete(item)}
          >
            <CheckIcon />
          </ActionButton>
        )}
        {isScheduled && (
          <ActionButton
            label={`Editar Compromisso`}
            tone="secondary"
            onClick={() => openEditDrawer(item)}
          >
            <PencilIcon />
          </ActionButton>
        )}
        {isScheduled && (
          <ActionButton
            label={`Cancelar Compromisso`}
            tone="warning"
            onClick={() => setRowAction({ kind: "cancel", appointment: item })}
          >
            <CancelIcon />
          </ActionButton>
        )}
        {isCancelled && (
          <ActionButton
            label={`Reagendar Compromisso`}
            tone="secondary"
            onClick={() => openRescheduleDrawer(item)}
          >
            <RescheduleIcon />
          </ActionButton>
        )}
        {/*
          Cancelar e reagendar ficam para todo mundo — é o dia a dia de quem
          atende. Excluir é de advogado/admin: o backend recusa o atendente com
          403, e esconder aqui é para ele não esbarrar num botão que existe só
          para dizer não.
        */}
        {podeDestruir && (
          <ActionButton
            label={`Excluir Compromisso`}
            tone="danger"
            onClick={() => setRowAction({ kind: "delete", appointment: item })}
          >
            <TrashIcon />
          </ActionButton>
        )}
      </span>
    );
  };

  // ── Card compacto: `appointments` já vem limitado a COMPACT_LIMIT do backend. ──
  const visibleAppointments = appointments;
  const hasMoreAppointments = appointmentsTotal > COMPACT_LIMIT;

  /**
   * Modal "Ver todos" — paginação EXCLUSIVA de cada accordion, conforme seu
   * próprio status: cada seção busca e pagina só o que é dela
   * (`status: <um único>`, `pageSize=10`), independente das outras duas.
   * Trocar de página numa seção não mexe nas demais. Cacheado por
   * `mês:status:busca:página`, com o mesmo gate síncrono de sempre.
   */
  const [modalPagesCache, setModalPagesCache] = useState<
    Record<string, PagedAppointments>
  >({});
  const [modalLoadingKeys, setModalLoadingKeys] = useState<Set<string>>(
    new Set(),
  );
  const fetchedModalPagesRef = useRef<Set<string>>(new Set());
  const [statusPages, setStatusPages] = useState<Record<string, number>>({});
  /**
   * Combinações mês:status:busca já confirmadas com pelo menos 1 item —
   * `total` não muda entre páginas de uma mesma combinação, então "teve dado
   * uma vez" continua valendo pras outras páginas dela. Existe só pra evitar
   * o flash de "aparece com skeleton, confirma vazio, some": uma seção que
   * nunca foi confirmada com dado não chega a montar enquanto carrega — só
   * aparece se/quando a resposta trouxer algo.
   */
  const [confirmedStatuses, setConfirmedStatuses] = useState<Set<string>>(
    new Set(),
  );

  /** Filtros do modal — "Ano" e busca por texto (debounce, mesmo padrão de `clientes/page.tsx`). */
  const [filterYear, setFilterYear] = useState(year);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchTerm(searchInput), 500);
    return () => clearTimeout(t);
  }, [searchInput]);

  /**
   * Só os anos que já têm resumo carregado (`yearSummaryCache`, o mesmo
   * usado pelas abas do card) E que de fato têm compromisso em algum mês —
   * sem sondar o backend com anos novos só pra popular esse filtro.
   */
  const filterYearOptions = Object.keys(yearSummaryCache)
    .map(Number)
    .filter((y) => yearSummaryCache[y]?.some((s) => s.count > 0))
    .sort((a, b) => b - a);

  const hasActiveFilters = filterYear !== year || searchInput.trim() !== "";

  const clearFilters = () => {
    setFilterYear(year);
    setSearchInput("");
    setDebouncedSearchTerm("");
  };

  // Trocar de mês/ano/busca (na lista compacta ou dentro do modal) volta cada seção à página 1.
  useEffect(
    () => setStatusPages({}),
    [selectedMonth, filterYear, debouncedSearchTerm],
  );

  const getStatusPage = (statusKey: string) => statusPages[statusKey] ?? 1;
  const setStatusPage = (statusKey: string, page: number) =>
    setStatusPages((prev) => ({ ...prev, [statusKey]: page }));

  const modalPageKey = (
    modalYear: number,
    month: number,
    statusKey: string,
    page: number,
    searchTerm: string,
  ) => `${modalYear}:${month}:${statusKey}:${searchTerm}:${page}`;

  /** Chave de `confirmedStatuses` — sem página, já que `total` não varia entre páginas de uma combinação. */
  const statusComboKey = (
    modalYear: number,
    month: number,
    statusKey: string,
    searchTerm: string,
  ) => `${modalYear}:${month}:${statusKey}:${searchTerm}`;

  const fetchModalPage = useCallback(
    (
      modalYear: number,
      month: number,
      statusKey: AppointmentStatusKey,
      page: number,
      searchTerm: string,
    ) => {
      const key = modalPageKey(modalYear, month, statusKey, page, searchTerm);
      if (fetchedModalPagesRef.current.has(key)) return;
      fetchedModalPagesRef.current.add(key);
      setModalLoadingKeys((prev) => new Set(prev).add(key));
      listAppointments({
        year: modalYear,
        month,
        status: statusKey,
        searchTerm: searchTerm.trim() || undefined,
        pageNumber: page,
        pageSize: MODAL_PAGE_SIZE,
      })
        .then((envelope) => {
          const total =
            envelope?.pagination?.totalRecords ?? envelope?.data?.length ?? 0;
          setModalPagesCache((prev) => ({
            ...prev,
            [key]: { items: envelope?.data ?? [], total },
          }));
          if (total > 0) {
            const comboKey = statusComboKey(
              modalYear,
              month,
              statusKey,
              searchTerm,
            );
            setConfirmedStatuses((prev) =>
              prev.has(comboKey) ? prev : new Set(prev).add(comboKey),
            );
          }
        })
        .catch(() => {
          fetchedModalPagesRef.current.delete(key);
          setModalPagesCache((prev) => ({
            ...prev,
            [key]: { items: [], total: 0 },
          }));
        })
        .finally(() => {
          setModalLoadingKeys((prev) => {
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
        });
    },
    [],
  );

  /** Estado (dados + loading) da página atual de um status, pro mês/ano/busca selecionados. */
  const getModalPageState = useCallback(
    (statusKey: string) => {
      const page = getStatusPage(statusKey);
      const key = modalPageKey(
        filterYear,
        selectedMonth,
        statusKey,
        page,
        debouncedSearchTerm,
      );
      const cached = modalPagesCache[key];
      const rawItems = cached?.items ?? [];
      /**
       * Cada seção do modal mostra um único status. Depois da sobreposição, um
       * compromisso com conclusão/cancelamento agendado deixa de pertencer à
       * seção onde estava — sai dela em vez de aparecer com o rótulo trocado.
       */
      const sectionLabel = AppointmentStatusLabelByKey[
        statusKey as keyof typeof AppointmentStatusLabelByKey
      ] as string | undefined;
      const items = applyPendingOverlay(
        rawItems,
        pending,
        PENDING_STATUS_LABELS,
      ).filter((item) => !sectionLabel || item.status === sectionLabel);

      return {
        page,
        items,
        total: applyPendingTotal(cached?.total ?? 0, rawItems, pending),
        // Sem entrada no cache ainda = nem começou a carregar (efeito não
        // rodou) ou está em voo — os dois casos são "carregando" pra UI.
        isLoading: cached === undefined || modalLoadingKeys.has(key),
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      filterYear,
      selectedMonth,
      statusPages,
      debouncedSearchTerm,
      modalPagesCache,
      modalLoadingKeys,
      // Sem isto o modal não reflete a janela de desfazer: o overlay ficaria
      // preso no `pending` do render em que o callback foi memoizado.
      pending,
    ],
  );

  /** Os 3 status sempre aparecem — sem filtro por status, só por ano e busca. */
  const visibleStatusKeys = AppointmentStatusOptions.map((s) => s.value);

  const visibleModalStates = visibleStatusKeys.map(getModalPageState);
  const isAnyVisibleStatusLoading = visibleModalStates.some((s) => s.isLoading);
  const areAllVisibleStatusesEmpty = visibleModalStates.every(
    (s) => !s.isLoading && s.total === 0,
  );
  const isAnyVisibleStatusConfirmedNonEmpty = visibleStatusKeys.some((k) =>
    confirmedStatuses.has(
      statusComboKey(filterYear, selectedMonth, k, debouncedSearchTerm),
    ),
  );

  // Busca (e cacheia por ano:mês:status:busca:página) a página atual de cada
  // status, só enquanto o modal está aberto.
  useEffect(() => {
    if (!isAllOpen) return;
    visibleStatusKeys.forEach((statusKey) => {
      fetchModalPage(
        filterYear,
        selectedMonth,
        statusKey,
        getStatusPage(statusKey),
        debouncedSearchTerm,
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isAllOpen,
    filterYear,
    selectedMonth,
    debouncedSearchTerm,
    statusPages,
    fetchModalPage,
  ]);

  /**
   * Recarrega abas, lista compacta e — se o modal "Ver todos" estiver
   * aberto — a página atual de cada status, após qualquer ação que altere um
   * compromisso. É o único gatilho que invalida os caches: uma edição pode
   * mudar a data de um compromisso pra outro mês, então não dá pra saber só
   * o mês atual ficou desatualizado — limpa tudo e deixa recarregar sob
   * demanda conforme o usuário navega.
   */
  const refresh = useCallback(() => {
    // `fetchedYearsRef` também precisa limpar — sem isso, `fetchYearSummary`
    // via `fetchSummary()` abaixo é um no-op (já tinha marcado o ano como
    // buscado no primeiro load) e os badges das abas nunca refletem a ação
    // que acabou de mudar a contagem (concluir/cancelar/excluir/criar).
    fetchedYearsRef.current.clear();
    fetchedMonthsRef.current.clear();
    setAppointmentsCache({});
    fetchedModalPagesRef.current.clear();
    setModalPagesCache({});

    fetchSummary();
    fetchList(selectedMonth);
    if (isAllOpen) {
      visibleStatusKeys.forEach((statusKey) => {
        fetchModalPage(
          filterYear,
          selectedMonth,
          statusKey,
          getStatusPage(statusKey),
          debouncedSearchTerm,
        );
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    fetchSummary,
    fetchList,
    fetchModalPage,
    selectedMonth,
    isAllOpen,
    filterYear,
    debouncedSearchTerm,
    statusPages,
  ]);

  /**
   * Uma tabela paginada por status (Agendado/Concluído/Cancelado), dentro do
   * modal "Ver todos" — paginação exclusiva dessa seção, independente das
   * outras duas (ver `getModalPageState`/`fetchModalPage`).
   */
  const renderStatusSection = (
    status: (typeof AppointmentStatusOptions)[number],
  ) => {
    const { page, items, total, isLoading } = getModalPageState(status.value);
    const isConfirmedNonEmpty = confirmedStatuses.has(
      statusComboKey(
        filterYear,
        selectedMonth,
        status.value,
        debouncedSearchTerm,
      ),
    );
    // Nunca confirmado com dado e ainda carregando: não monta nem o
    // skeleton — evita "aparece, confirma vazio, some". Só passa a
    // renderizar quando a resposta chegar (com ou sem itens).
    if (isLoading && !isConfirmedNonEmpty) return null;
    // Carregou e confirmou vazio — nunca aparece.
    if (!isLoading && total === 0) return null;

    const totalPages = Math.max(1, Math.ceil(total / MODAL_PAGE_SIZE));
    const isCancelledStatus = status.value === "CANCELADO";
    const columns = isCancelledStatus
      ? CANCELLED_TABLE_COLUMNS
      : APPOINTMENT_TABLE_COLUMNS;

    return (
      <Accordion.Item key={status.value} id={status.value}>
        <Accordion.Heading>
          <Accordion.Trigger className="cursor-pointer text-sm font-medium text-primary">
            {status.label} {!isLoading && `(${total})`}
            <Accordion.Indicator />
          </Accordion.Trigger>
        </Accordion.Heading>
        <Accordion.Panel>
          <Accordion.Body>
            <Table variant="secondary" className="rounded-t-none">
              <Table.ScrollContainer>
                <Table.Content
                  aria-label={`Compromissos ${status.label.toLowerCase()} de ${selectedMonthLabel}`}
                  className="min-w-[720px]"
                >
                  <Table.Header columns={columns}>
                    {(column) => (
                      <Table.Column
                        className="h-12 text-center text-sm text-secondary after:content-none"
                        isRowHeader={column.id === "title"}
                      >
                        {column.name}
                      </Table.Column>
                    )}
                  </Table.Header>
                  {isLoading ? (
                    /* Skeleton — uma barra por linha, não uma por célula. */
                    <Table.Body items={SKELETON_ROWS}>
                      {(row) => (
                        <Table.Row>
                          <Table.Cell
                            colSpan={columns.length}
                            // `style` tem especificidade maior que a borda de
                            // classe da lib — mais confiável que tentar
                            // sobrescrever a classe interna dela via CSS.
                            style={
                              row.id ===
                              SKELETON_ROWS[SKELETON_ROWS.length - 1].id
                                ? { borderBottom: "none" }
                                : undefined
                            }
                          >
                            <Skeleton className="rounded-lg">
                              <div className="h-8 w-full rounded-lg bg-default-300" />
                            </Skeleton>
                          </Table.Cell>
                        </Table.Row>
                      )}
                    </Table.Body>
                  ) : (
                    <Table.Body
                      items={items}
                      renderEmptyState={() => (
                        <div className="py-6 text-center text-sm">
                          Nenhum compromisso {status.label.toLowerCase()} nesta
                          página.
                        </div>
                      )}
                    >
                      {(item) => {
                        const isLastRow = item === items[items.length - 1];
                        // `style` tem especificidade maior que a borda de
                        // classe da lib — mais confiável que tentar
                        // sobrescrever a classe interna dela via CSS.
                        const noBorder = isLastRow
                          ? { borderBottom: "none" }
                          : undefined;
                        return (
                          <Table.Row>
                            <Table.Cell
                              style={noBorder}
                              className="max-w-56 truncate text-center text-sm text-gray-100"
                            >
                              {item.title || "-"}
                            </Table.Cell>
                            <Table.Cell
                              style={noBorder}
                              className="whitespace-nowrap text-center text-sm text-gray-100"
                            >
                              {formatWhen(item.startAt) || "-"}
                            </Table.Cell>
                            <Table.Cell
                              style={noBorder}
                              className="w-auto text-center text-sm text-gray-100"
                            >
                              {item.type || "-"}
                            </Table.Cell>
                            <Table.Cell
                              style={noBorder}
                              className="w-auto truncate text-center text-sm text-gray-100"
                            >
                              {item.description || "-"}
                            </Table.Cell>
                            {isCancelledStatus && (
                              <Table.Cell
                                style={noBorder}
                                className="w-auto truncate text-center text-sm text-gray-100"
                              >
                                {item.cancellationReason || "-"}
                              </Table.Cell>
                            )}
                            <Table.Cell style={noBorder}>
                              <div className="flex justify-center">
                                {renderActions(item)}
                              </div>
                            </Table.Cell>
                          </Table.Row>
                        );
                      }}
                    </Table.Body>
                  )}
                </Table.Content>
              </Table.ScrollContainer>

              {!isLoading && totalPages > 1 && (
                <Table.Footer>
                  {/*
                    `.table__footer` da lib já é `display:flex` sem
                    `justify-content` — em vez de uma div wrapper com
                    `w-full justify-end` (dependia do filho herdar 100% da
                    largura dentro do flex, frágil), `ml-auto` no próprio
                    `Pagination` empurra ele pro fim da linha de forma
                    garantida, sem depender de wrapper nenhum.
                  */}
                  <Pagination size="sm" className="ml-auto">
                    <Pagination.Content>
                      <Pagination.Item>
                        <Pagination.Previous
                          isDisabled={page === 1}
                          onPress={() => setStatusPage(status.value, page - 1)}
                        >
                          <Pagination.PreviousIcon />
                        </Pagination.Previous>
                      </Pagination.Item>

                      {buildPageList(page, totalPages).map((entry, i) =>
                        entry === ELLIPSIS ? (
                          <Pagination.Item key={`gap-${i}`}>
                            <Pagination.Ellipsis />
                          </Pagination.Item>
                        ) : (
                          <Pagination.Item key={entry}>
                            <Pagination.Link
                              isActive={entry === page}
                              onPress={() => setStatusPage(status.value, entry)}
                            >
                              {entry}
                            </Pagination.Link>
                          </Pagination.Item>
                        ),
                      )}

                      <Pagination.Item>
                        <Pagination.Next
                          isDisabled={page === totalPages}
                          onPress={() => setStatusPage(status.value, page + 1)}
                        >
                          <Pagination.NextIcon />
                        </Pagination.Next>
                      </Pagination.Item>
                    </Pagination.Content>
                  </Pagination>
                </Table.Footer>
              )}
            </Table>
          </Accordion.Body>
        </Accordion.Panel>
      </Accordion.Item>
    );
  };

  return (
    <Card className={`flex flex-col ${className}`}>
      <header className="flex items-start justify-between gap-4">
        <SectionTitle>Agenda</SectionTitle>
        <Tooltip delay={0}>
          <Button
            type="button"
            onClick={openCreateDrawer}
            aria-label="Novo compromisso"
            className="flex h-10 w-10 items-center justify-center text-primary p-2 bg-primary/10 rounded-full hover:bg-primary/5 cursor-pointer"
          >
            <CalendarOutlineIcon className="h-6 w-6" />
            <Tooltip.Content showArrow placement="bottom">
              <Tooltip.Arrow />
              <p>Novo compromisso</p>
            </Tooltip.Content>
          </Button>
        </Tooltip>
      </header>

      {/* ── Drawer "Novo compromisso" / "Editar compromisso" ── */}
      <Drawer isOpen={isDrawerOpen} onOpenChange={handleDrawerOpenChange}>
        <Drawer.Backdrop variant="opaque">
          <Drawer.Content placement="right">
            <Drawer.Dialog className={"w-auto"}>
              <Drawer.CloseTrigger />
              <Drawer.Header>
                <Drawer.Heading>
                  {isEditing ? "Editar compromisso" : "Novo compromisso"}
                </Drawer.Heading>
              </Drawer.Header>
              <Drawer.Body>
                <form
                  id="appointment-form"
                  className="flex flex-col gap-4"
                  onSubmit={handleSubmit}
                  noValidate
                >
                  <AppointmentFormFields
                    values={formValues}
                    errors={isFormDirty ? liveErrors : {}}
                    onChange={handleFieldChange}
                    isEditing={isEditing}
                    conflicts={conflicts}
                    onShiftAfter={(conflict) =>
                      setFormValues((current) =>
                        shiftAfter(current, conflict.endAt),
                      )
                    }
                    isDisabled={isSubmitting}
                  />
                  {isFormDirty && isPastBlocked && (
                    <p className="text-xs text-danger">
                      Confirme a ciência da data retroativa para continuar.
                    </p>
                  )}
                </form>
              </Drawer.Body>
              <Drawer.Footer className="flex justify-between">
                <Button
                  type="submit"
                  form="appointment-form"
                  isDisabled={isSubmitting || !isFormValid}
                  className="w-full"
                >
                  {isEditing ? "Salvar" : "Agendar"}
                </Button>
                <Button type="button" slot="close" variant="ghost">
                  Cancelar
                </Button>
              </Drawer.Footer>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>

      <ConflictDecisionModal
        isOpen={isConflictDecisionOpen}
        conflicts={conflicts}
        newTitle={formValues.title}
        onClose={() => setIsConflictDecisionOpen(false)}
        onConfirm={(idsToCancel) => void persist(idsToCancel)}
        isSubmitting={isSubmitting}
      />

      {/* ── Confirmação de descarte ── */}
      <Modal
        isOpen={isDiscardConfirmOpen}
        onOpenChange={setIsDiscardConfirmOpen}
      >
        <Modal.Backdrop
          variant="opaque"
          className="data-[entering]:duration-400 data-[entering]:ease-[cubic-bezier(0.16,1,0.3,1)] data-[exiting]:duration-200 data-[exiting]:ease-[cubic-bezier(0.7,0,0.84,0)]"
        >
          <Modal.Container className="data-[entering]:animate-in data-[entering]:fade-in-0 data-[entering]:zoom-in-95 data-[entering]:duration-400 data-[entering]:ease-[cubic-bezier(0.16,1,0.3,1)] data-[exiting]:animate-out data-[exiting]:fade-out-0 data-[exiting]:zoom-out-95 data-[exiting]:duration-200 data-[exiting]:ease-[cubic-bezier(0.7,0,0.84,0)]">
            <Modal.Dialog className="sm:max-w-[360px]">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Icon className="bg-danger/10 text-danger">
                  <WarningIcon className="size-5" />
                </Modal.Icon>
                <Modal.Heading>Descartar compromisso?</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p className="mt-1 text-sm text-gray-100/70">
                  Você tem certeza? As informações preenchidas serão perdidas.
                </p>
              </Modal.Body>
              <Modal.Footer>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => setIsDiscardConfirmOpen(false)}
                  className="w-full"
                >
                  Continuar preenchendo
                </Button>
                <Button type="button" variant="danger" onClick={handleDiscard}>
                  Descartar
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* ── Detalhes do compromisso (somente leitura) ── */}
      <Modal
        isOpen={detailsAppointment !== null}
        onOpenChange={(open) => !open && setDetailsAppointment(null)}
      >
        <Modal.Backdrop
          variant="opaque"
          className="data-[entering]:duration-400 data-[entering]:ease-[cubic-bezier(0.16,1,0.3,1)] data-[exiting]:duration-200 data-[exiting]:ease-[cubic-bezier(0.7,0,0.84,0)]"
        >
          <Modal.Container className="data-[entering]:animate-in data-[entering]:fade-in-0 data-[entering]:zoom-in-95 data-[entering]:duration-400 data-[entering]:ease-[cubic-bezier(0.16,1,0.3,1)] data-[exiting]:animate-out data-[exiting]:fade-out-0 data-[exiting]:zoom-out-95 data-[exiting]:duration-200 data-[exiting]:ease-[cubic-bezier(0.7,0,0.84,0)]">
            <Modal.Dialog className="sm:max-w-[440px]">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Icon className="bg-gray-100/10 text-gray-100">
                  <DetailsIcon />
                </Modal.Icon>
                <Modal.Heading>{detailsAppointment?.title}</Modal.Heading>
              </Modal.Header>

              <Modal.Body>
                {/* Contexto curto antes da descrição: uma modal com só um
                    parágrafo solto não diz de qual compromisso se trata. */}
                {detailsAppointment && (
                  <p className="text-xs text-gray-100/60">
                    {formatWhen(detailsAppointment.startAt)}
                    {detailsAppointment.type
                      ? ` · ${detailsAppointment.type}`
                      : ""}
                    {detailsAppointment.clientName
                      ? ` · ${detailsAppointment.clientName}`
                      : ""}
                  </p>
                )}

                {/* `whitespace-pre-line`: a descrição é texto livre digitado
                    num TextArea, então as quebras de linha do usuário importam. */}
                <p className="mt-3 whitespace-pre-line text-sm text-gray-100">
                  {detailsAppointment?.description}
                </p>
              </Modal.Body>

              <Modal.Footer>
                <Button
                  className="w-full"
                  type="button"
                  variant="primary"
                  onClick={() => setDetailsAppointment(null)}
                >
                  Fechar
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* ── Cancelar / excluir compromisso ── */}
      <Modal
        isOpen={rowAction !== null}
        onOpenChange={(open) => !open && closeRowAction()}
      >
        <Modal.Backdrop
          variant="opaque"
          className="data-[entering]:duration-400 data-[entering]:ease-[cubic-bezier(0.16,1,0.3,1)] data-[exiting]:duration-200 data-[exiting]:ease-[cubic-bezier(0.7,0,0.84,0)]"
        >
          <Modal.Container className="data-[entering]:animate-in data-[entering]:fade-in-0 data-[entering]:zoom-in-95 data-[entering]:duration-400 data-[entering]:ease-[cubic-bezier(0.16,1,0.3,1)] data-[exiting]:animate-out data-[exiting]:fade-out-0 data-[exiting]:zoom-out-95 data-[exiting]:duration-200 data-[exiting]:ease-[cubic-bezier(0.7,0,0.84,0)]">
            <Modal.Dialog className="sm:max-w-[400px]">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Icon className="bg-danger/10 text-orange-400">
                  <WarningIcon className="size-5" />
                </Modal.Icon>
                <Modal.Heading>
                  {rowAction?.kind === "cancel"
                    ? "Cancelar compromisso?"
                    : rowAction?.kind === "complete-early"
                      ? "Concluir antes da hora?"
                      : "Excluir compromisso?"}
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p className="mt-1 text-sm text-gray-100/70">
                  {rowAction?.kind === "cancel" ? (
                    <>
                      <span className="font-medium">
                        {rowAction.appointment.title}
                      </span>{" "}
                      será marcado como cancelado. Essa ação exige uma
                      justificativa.
                    </>
                  ) : rowAction?.kind === "complete-early" ? (
                    <>
                      <span className="font-medium">
                        {rowAction.appointment.title}
                      </span>{" "}
                      ainda não começou. Concluir agora registra que ele já
                      aconteceu, e concluído não pode ser editado nem
                      cancelado depois.
                    </>
                  ) : (
                    <>
                      <span className="font-medium">
                        {rowAction?.appointment.title}
                      </span>{" "}
                      será removido da agenda. Essa ação não pode ser desfeita.
                    </>
                  )}
                </p>

                {rowAction?.kind === "cancel" && (
                  <div className="mt-3 flex flex-col gap-1">
                    <Label
                      htmlFor="cancel-justification"
                      className="text-secondary"
                      isRequired
                      isInvalid={!!cancelJustificationError}
                    >
                      Justificativa
                    </Label>
                    <TextArea
                      id="cancel-justification"
                      value={cancelJustification}
                      onChange={(e) => {
                        setCancelJustification(e.target.value);
                        setCancelJustificationError(undefined);
                      }}
                      placeholder="Ex.: Cliente pediu para remarcar"
                      rows={3}
                      className="w-full form-border-style"
                    />
                    {!cancelJustificationError && (
                      <p className="text-xs text-gray-100/60">
                        Mínimo de {MIN_CANCEL_JUSTIFICATION_LENGTH} caracteres.
                      </p>
                    )}
                    {cancelJustificationError && (
                      <p className="text-sm text-danger">
                        {cancelJustificationError}
                      </p>
                    )}
                  </div>
                )}
              </Modal.Body>
              <Modal.Footer>
                <Button
                  className="w-full"
                  type="button"
                  variant="danger"
                  onClick={handleConfirmRowAction}
                  isDisabled={
                    rowAction?.kind === "cancel" &&
                    cancelJustification.trim().length <
                      MIN_CANCEL_JUSTIFICATION_LENGTH
                  }
                >
                  {rowAction?.kind === "cancel"
                    ? "Cancelar"
                    : rowAction?.kind === "complete-early"
                      ? "Concluir mesmo assim"
                      : "Excluir"}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={closeRowAction}
                >
                  Manter
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* ── Abas por mês ── */}
      {summaryLoading ? (
        <div className="mt-4">
          {tabsSkeleton}
          {listSkeleton}
        </div>
      ) : !hasAnyAppointmentsThisYear ? (
        <p className="mt-4 py-6 text-center text-sm text-gray-100/60">
          Ainda não há nenhum compromisso agendado.
        </p>
      ) : (
        <Tabs
          selectedKey={String(selectedMonth)}
          onSelectionChange={(key) => setSelectedMonth(Number(key))}
          className="mt-4"
        >
          <Tabs.ListContainer>
            <Tabs.List items={months} aria-label="Meses da agenda">
              {renderMonthTab as unknown as React.ReactNode}
            </Tabs.List>
          </Tabs.ListContainer>

          <Tabs.Panel id={String(selectedMonth)} className="p-0">
            {listLoading ? (
              listSkeleton
            ) : (
              <ul className="flex flex-1 flex-col gap-2">
                {appointmentsTotal === 0 && (
                  <li className="py-6 text-sm text-gray-100/60">
                    Não há agendamentos para {selectedMonthLabel} ainda.
                  </li>
                )}

                {visibleAppointments.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl px-1 py-2 hover:bg-light-gray/40"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-light-gray/70 text-[11px] font-medium text-gray-100">
                      {initialsFrom(item) ?? (
                        <CalendarOutlineIcon className="h-4 w-4 text-gray-100/70" />
                      )}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs text-primary">
                        {item.title}
                      </span>
                      <span className="block truncate text-[11px] text-gray-100/60">
                        {formatWhen(item.startAt)} · {item.type}
                      </span>
                    </span>

                    {renderActions(item)}
                  </li>
                ))}

                {hasMoreAppointments && (
                  <li className="flex justify-center pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAllOpen(true)}
                      className="text-sm text-secondary underline-offset-4 hover:text-secondary/70 hover:underline cursor-pointer"
                    >
                      Visualizar todos
                    </button>
                  </li>
                )}
              </ul>
            )}
          </Tabs.Panel>
        </Tabs>
      )}

      {/* ── "Ver todos" — mesmas abas + uma tabela paginada (10 em 10) por status ── */}
      <Modal isOpen={isAllOpen} onOpenChange={setIsAllOpen}>
        <Modal.Backdrop variant="opaque">
          <Modal.Container size="cover" scroll="inside">
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header className="relative">
                <Modal.Heading className="text-2xl">Agenda</Modal.Heading>
                <div className="absolute top-10 w-14 h-0.5 bg-secondary"></div>
              </Modal.Header>
              <Modal.Body>
                <Tabs
                  variant="secondary"
                  selectedKey={String(selectedMonth)}
                  onSelectionChange={(key) => setSelectedMonth(Number(key))}
                >
                  <Tabs.ListContainer>
                    {summaryLoading ? (
                      tabsSkeleton
                    ) : (
                      <Tabs.List items={months} aria-label="Meses da agenda">
                        {renderMonthTab as unknown as React.ReactNode}
                      </Tabs.List>
                    )}
                  </Tabs.ListContainer>
                </Tabs>

                {/* ── Filtros — ano/busca aplicam sobre o mês da aba aberta ── */}
                <div className="mt-4 flex flex-wrap items-end gap-3">
                  <Field
                    label="Buscar"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Título, cliente..."
                    className="min-w-[200px] flex-1"
                  />
                  <SelectField
                    label="Ano"
                    options={filterYearOptions.map((y) => ({
                      id: String(y),
                      label: String(y),
                    }))}
                    selectedKey={String(filterYear)}
                    onSelectionChange={(key) => setFilterYear(Number(key))}
                    className="w-28"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={clearFilters}
                    isDisabled={!hasActiveFilters}
                    className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Limpar filtro
                  </Button>
                </div>

                {isAnyVisibleStatusLoading &&
                !isAnyVisibleStatusConfirmedNonEmpty ? (
                  // Nada confirmado ainda (primeira busca desta combinação) —
                  // skeleton em vez de deixar a área em branco; as seções em
                  // si só aparecem quando alguma responder com dado.
                  accordionSkeleton
                ) : !isAnyVisibleStatusLoading && areAllVisibleStatusesEmpty ? (
                  <p className="mt-6 text-center text-sm text-gray-100/60">
                    {hasActiveFilters
                      ? "Nenhum resultado para os filtros aplicados."
                      : `Não há agendamentos para ${selectedMonthLabel} ainda.`}
                  </p>
                ) : (
                  <Accordion
                    className="mt-4 text-secondary"
                    defaultExpandedKeys={["AGENDADO"]}
                  >
                    {AppointmentStatusOptions.map((status) =>
                      renderStatusSection(status),
                    )}
                  </Accordion>
                )}
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </Card>
  );
}

/** Fallback do Suspense — mesma casca do card, sem depender de nenhum state interno do componente real. */
function appointmentsCardFallback(className: string) {
  return (
    <Card className={`flex flex-col ${className}`}>
      <header className="flex items-start justify-between gap-4">
        <SectionTitle>Agenda</SectionTitle>
      </header>
      <div className="mt-4 flex flex-col gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 px-1 py-2">
            <Skeleton className="shrink-0 rounded-lg">
              <div className="h-9 w-9 rounded-lg bg-default-300" />
            </Skeleton>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Skeleton className="rounded">
                <div className="h-3 w-2/3 rounded bg-default-300" />
              </Skeleton>
              <Skeleton className="rounded">
                <div className="h-2.5 w-1/3 rounded bg-default-300" />
              </Skeleton>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function AppointmentsCard({
  className = "",
}: AppointmentsCardProps) {
  return (
    <Suspense fallback={appointmentsCardFallback(className)}>
      <AppointmentsCardInner className={className} />
    </Suspense>
  );
}
