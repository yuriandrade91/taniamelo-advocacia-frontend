"use client";

import {
  Button,
  Label,
  Modal,
  Skeleton,
  Tabs,
  TextArea,
  Tooltip,
  WarningIcon,
} from "@heroui/react";
import ModalShell from "@/components/ui/modals/ModalShell";
import ConfirmDialog from "@/components/ui/modals/ConfirmDialog/ConfirmDialog";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Card, SectionTitle } from "@/components/ui/layout/Card";
import Drawer from "@/components/ui/Drawer/Drawer";
import {
  CountBadge,
  TabBar,
  TabBarSkeleton,
  TabItem,
} from "@/components/ui/tabs/SegmentedTabs";
import { MONTH_LABELS } from "@/constants/date/months";
import { openInNewTab } from "@/lib/openInNewTab";
import { DetailsIcon, PencilIcon, TrashIcon } from "@/components/ui/icons/actions";
import {
  CalendarIcon,
  CancelIcon,
  CheckIcon,
  RescheduleIcon,
  VideoIcon,
} from "@/components/agenda/agendaIcons";
import { formatWhen } from "@/components/agenda/agendaGrouping";
import ActionButton from "@/components/ui/table/ActionButton";
import { useFieldErrors } from "@/hooks/useFieldErrors";
import { notificationCenter } from "@/services/notificationService";
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
  type AppointmentFormErrors,
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
import { AppointmentStatusLabelByKey } from "@/enums/appointment/Appointment";
import { usePermissions } from "@/hooks/usePermissions";

/**
 * Card "Agenda" — compromissos reais (AppointmentController), agrupados por
 * mês. Substitui o antigo `Schedule.tsx`, que era só um mock com 3 campos de
 * formulário: aqui o cadastro/edição usa `AppointmentFormFields` (espelha os
 * campos obrigatórios do backend) e todas as ações batem nos endpoints reais.
 *
 * As abas vêm de `GET /appointments/summary?year=` (contagem por mês, exclui
 * cancelados); a lista do mês selecionado vem de `GET /appointments`,
 * filtrada por `status=AGENDADO` — cancelados/concluídos saem da agenda "do
 * que vem por aí" assim que mudam de status. A visão completa (todos os
 * status, busca, outros meses) é a página `/agenda`, aonde "Visualizar todos"
 * leva.
 */

/** Tamanho mínimo exigido na justificativa de cancelamento. */
const MIN_CANCEL_JUSTIFICATION_LENGTH = 10;

/**
 * Como a linha aparece enquanto a janela de desfazer corre. A API trabalha
 * com o label PT-BR (`@JsonValue`), não com a chave do enum — por isso o
 * overlay compara e escreve label.
 */
const PENDING_STATUS_LABELS = {
  complete: AppointmentStatusLabelByKey.CONCLUIDO,
  cancel: AppointmentStatusLabelByKey.CANCELADO,
} as const;

/** Itens visíveis na lista compacta do card — o resto fica na página `/agenda`. */
const COMPACT_LIMIT = 3;

/**
 * Uma página de compromissos — `items` já vem do tamanho certo (`pageSize`)
 * direto do backend via `listAppointments`; `total` é `pagination.totalRecords`
 * do envelope, para saber quanto tem no total sem precisar carregar tudo.
 */
type PagedAppointments = { items: AppointmentResponse[]; total: number };

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

export default function AppointmentsCard({
  className = "",
}: AppointmentsCardProps) {
  const { canDestroy } = usePermissions();
  // ── Ano fixo no atual — sem seletor de ano por enquanto (fora do escopo). ──
  const year = useMemo(() => new Date().getFullYear(), []);
  const currentMonth = useMemo(() => new Date().getMonth() + 1, []);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  /** Resumo (contagem por mês) do ano, cacheado por ano. */
  const [yearSummaryCache, setYearSummaryCache] = useState<
    Record<number, AppointmentSummary[]>
  >({});
  const fetchedYearsRef = useRef<Set<number>>(new Set());
  /*
   * O `??` devolvia um array novo a cada render, e o `useMemo` das abas (que
   * depende dele) recalculava sempre — a lista de meses é reconstruída à toa e
   * o `Tabs.Indicator` remede a posição. Memoizado, só muda quando o resumo
   * daquele ano muda.
   */
  const summary = useMemo(
    () => yearSummaryCache[year] ?? [],
    [yearSummaryCache, year],
  );
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
   * Busca (e cacheia) o resumo de um ano. `summaryLoading` só desarma
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
  useEffect(() => fetchList(selectedMonth), [selectedMonth, fetchList]);

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
      .map((month) => {
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

  /**
   * A aba no desenho de abas da aplicação (`tabStyle`, do cadastro de
   * cliente): segmentos num contêiner com filete, a ativa em azul. Eram as
   * pílulas cruas do HeroUI com separador e selo vermelho — vermelho é da
   * ação que destrói e do erro, e um mês com quatro compromissos não é nem
   * uma coisa nem outra. O selo é o dourado da marca, e some no fundo azul da
   * aba ativa.
   */
  const monthTabs = months.map((item) => (
    <TabItem key={item.id} id={item.id} className="px-3! py-2! text-sm">
      {item.label}
      {/* O número é decorativo para quem lê a tela; a contagem vai por extenso. */}
      <CountBadge tone="accent" count={item.count} />
      <span className="sr-only">
        {" "}
        ({item.count === 1 ? "1 compromisso" : `${item.count} compromissos`})
      </span>
    </TabItem>
  ));

  /** Placeholder da barra de abas, enquanto `summaryLoading` — ver comentário acima de `summaryLoading`. */
  const tabsSkeleton = <TabBarSkeleton />;

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

  /*
   * Quando o erro aparece: assim que o campo é mexido, e todos de uma vez no
   * "Salvar" (`useFieldErrors`, o mesmo do cadastro, do financeiro e da página
   * da Agenda). Antes era tudo-ou-nada pelo `isFormDirty`: mexer no título
   * acendia de vermelho os seis campos que a pessoa ainda nem tinha visto.
   *
   * A ciência da data retroativa entra como um erro de campo porque é o que
   * ela é — o backend recusa com 422 sem a marcação.
   */
  const check = useFieldErrors({
    ...liveErrors,
    pastDateAcknowledged: isPastBlocked
      ? "Confirme a ciência da data retroativa para continuar."
      : undefined,
  });
  const visibleErrors: AppointmentFormErrors = useMemo(
    () =>
      Object.fromEntries(
        Object.keys(liveErrors).flatMap((key) => {
          const message = check.errorOf(key);
          return message ? [[key, message]] : [];
        }),
      ),
    // `check` nasce de novo a cada render; o que muda o que se vê é o conjunto
    // de erros e o que já foi tocado — ambos já disparam este render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [liveErrors, check.errorOf],
  );
  const pastError = check.errorOf("pastDateAcknowledged");

  const openCreateDrawer = () => {
    setEditingAppointment(null);
    setFormValues(EMPTY_APPOINTMENT_FORM);
    setFormBaseline(EMPTY_APPOINTMENT_FORM);
    check.reset();
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (appointment: AppointmentResponse) => {
    const values = fromResponse(appointment);
    setEditingAppointment(appointment);
    setFormValues(values);
    setFormBaseline(values);
    check.reset();
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
    check.reset();
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setEditingAppointment(null);
    setFormValues(EMPTY_APPOINTMENT_FORM);
    setFormBaseline(EMPTY_APPOINTMENT_FORM);
    check.reset();
  };

  const handleFieldChange = useCallback(
    <K extends keyof AppointmentFormValues>(
      field: K,
      value: AppointmentFormValues[K],
    ) => {
      setFormValues((prev) => ({ ...prev, [field]: value }));
      check.touch(field);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // O botão já fica desabilitado enquanto `isFormValid` é falso; o
    // `revealAll` é para o Enter dentro de um campo, que não passa por ele —
    // e mostra de uma vez o que falta, em vez de não fazer nada.
    if (!check.revealAll()) {
      notificationCenter.warning("Revise os campos destacados.");
      return;
    }
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
      complete(appointment, true);
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
  const complete = (
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
    const hasNotStarted =
      !!appointment.startAt &&
      new Date(appointment.startAt).getTime() > Date.now();
    if (hasNotStarted) {
      setRowAction({ kind: "complete-early", appointment });
      return;
    }
    complete(appointment);
  };

  /**
   * Cluster de ações de uma linha da lista compacta. Concluir/editar/cancelar só fazem sentido em quem
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
            onClick={() => openInNewTab(item.meetingUrl)}
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
        {canDestroy && (
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
   * Recarrega abas e lista compacta após qualquer ação que altere um
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

    fetchSummary();
    fetchList(selectedMonth);
  }, [fetchSummary, fetchList, selectedMonth]);

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
            <CalendarIcon className="h-6 w-6" />
            <Tooltip.Content showArrow placement="bottom">
              <Tooltip.Arrow />
              <p>Novo compromisso</p>
            </Tooltip.Content>
          </Button>
        </Tooltip>
      </header>

      {/*
        Drawer "Novo compromisso" / "Editar compromisso" — o wrapper da casa,
        que já traz a largura do painel, o corpo como `<form>` (Enter num campo
        envia) e o rodapé em cápsula. Era o compound cru do HeroUI, com largura
        `w-auto` e o botão de salvar ocupando a linha inteira.
      */}
      <Drawer
        isOpen={isDrawerOpen}
        onOpenChange={handleDrawerOpenChange}
        title={isEditing ? "Editar compromisso" : "Novo compromisso"}
        dialogClassName="w-full sm:w-[520px]"
        actions="pill"
        confirmLabel={isEditing ? "Salvar" : "Agendar"}
        onConfirm={handleSubmit}
        isConfirmDisabled={!isFormValid}
        isSubmitting={isSubmitting}
        // Fechar com o formulário mexido pede confirmação: o que foi
        // preenchido se perderia.
        confirmClose={isFormDirty}
        onRequestClose={() => setIsDiscardConfirmOpen(true)}
      >
        <div className="flex flex-col gap-4">
          <AppointmentFormFields
            values={formValues}
            errors={visibleErrors}
            onChange={handleFieldChange}
            isEditing={isEditing}
            conflicts={conflicts}
            onShiftAfter={(conflict) =>
              setFormValues((current) => shiftAfter(current, conflict.endAt))
            }
            isDisabled={isSubmitting}
            // Painel lateral: uma coluna só, senão os campos que dividem a
            // linha ficam espremidos.
            compact
          />
          {pastError && (
            <p role="alert" className="text-xs text-danger">
              {pastError}
            </p>
          )}
        </div>
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
      <ConfirmDialog
        isOpen={isDiscardConfirmOpen}
        onClose={() => setIsDiscardConfirmOpen(false)}
        onConfirm={handleDiscard}
        tone="danger"
        heading="Descartar compromisso?"
        description="As informações preenchidas serão perdidas."
        confirmLabel="Descartar"
        cancelLabel="Continuar preenchendo"
      />

      {/* ── Detalhes do compromisso (somente leitura) ── */}
      <ModalShell
        isOpen={detailsAppointment !== null}
        onClose={() => setDetailsAppointment(null)}
        className="sm:max-w-[440px]"
        heading={detailsAppointment?.title ?? ""}
        icon={<DetailsIcon />}
        iconClassName="bg-gray-100/10 text-gray-100"
      >
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
      </ModalShell>

      {/* ── Cancelar / excluir compromisso ── */}
      <ModalShell
        isOpen={rowAction !== null}
        onClose={closeRowAction}
        className="sm:max-w-[400px]"
        heading={
          rowAction?.kind === "cancel"
            ? "Cancelar compromisso?"
            : rowAction?.kind === "complete-early"
              ? "Concluir antes da hora?"
              : "Excluir compromisso?"
        }
        icon={<WarningIcon className="size-5" />}
        iconClassName="bg-danger/10 text-orange-400"
      >
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
      </ModalShell>

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
          <TabBar label="Meses da agenda">{monthTabs}</TabBar>

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
                        <CalendarIcon className="h-4 w-4 text-gray-100/70" />
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
                    <Link
                      href="/agenda"
                      className="text-sm text-secondary underline-offset-4 hover:text-secondary/70 hover:underline"
                    >
                      Visualizar todos
                    </Link>
                  </li>
                )}
              </ul>
            )}
          </Tabs.Panel>
        </Tabs>
      )}
    </Card>
  );
}
