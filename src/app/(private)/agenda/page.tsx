"use client";

import { useMemo, useState } from "react";
import { Button } from "@heroui/react";

import FormModal from "@/components/ui/modals/FormModal";
import { MonthPicker } from "@/components/ui/filters/MonthPicker";
import { PageHeader } from "@/components/ui/layout/PageHeader";
import { Notice } from "@/components/ui/feedback/Notice";
import { groupByDay, localDayOf } from "@/components/agenda/agendaGrouping";
import { AgendaAccordion } from "@/components/agenda/AgendaAccordion";
import { AGENDA_DEFAULTS, AgendaFilters, agendaFilters } from "@/components/agenda/AgendaFilters";
import { useAppointmentActions } from "@/components/agenda/useAppointmentActions";
import { useAppointmentEditor } from "@/components/agenda/useAppointmentEditor";
import { useFilters } from "@/hooks/useFilters";
import { usePagedList } from "@/hooks/usePagedList";
import { usePermissions } from "@/hooks/usePermissions";
import { appointmentsListCache } from "@/lib/appointmentsCache";
import { messageOf } from "@/lib/errorMessage";
import { fetchAllPages } from "@/lib/pagination";
import { currentMonth, type MonthRef } from "@/lib/period";
import { applyPendingOverlay } from "@/lib/pendingActions";
import { listAppointments } from "@/services/appointmentService";
import type {
  AppointmentListRequest,
  AppointmentResponse,
} from "@/interfaces/appointment/Appointment.interface";
import {
  AppointmentStatusLabelByKey,
  AppointmentTypeOptions,
  type AppointmentStatusInput,
  type AppointmentStatusKey,
  type AppointmentTypeInput,
} from "@/enums/appointment/Appointment";

/**
 * Agenda — a visão completa dos compromissos, por dia. O "Visualizar todos" do
 * cartão da Home traz para cá.
 *
 * ## O que é compartilhado com o cartão da Home
 *
 * A linha (`AppointmentRow`), as ações (`appointmentActions` +
 * `useAppointmentActions`) e o formulário (`useAppointmentEditor`) são os
 * mesmos: as duas telas validam, avisam conflito e desfazem igual. O cartão é
 * o resumo do mês (só agendados, num painel lateral); esta página tem todos
 * os status, os filtros e o formulário em modal.
 *
 * ## Janela de desfazer
 *
 * Concluir e excluir passam pelo `usePendingAction`: a tela muda na hora e a
 * requisição sai 5s depois. Não é preciosismo — depois do envio não há volta
 * pela interface. Concluir não tem reversão nem na API (o
 * `AppointmentRequestDTO` não carrega `status`), e a exclusão, que é lógica no
 * banco, existe para auditoria: a rota de restaurar não é exposta na tela, por
 * decisão. Desfazer só é possível antes de enviar.
 */

/**
 * O mês inteiro, página a página: a tela agrupa por dia e pagina por conta
 * própria, então uma página só de 100 cortaria, sem aviso, o mês que passasse
 * disso.
 */
const fetchMonth = (params: AppointmentListRequest) =>
  fetchAllPages((page) => listAppointments({ ...params, ...page })).then((envelope) => {
    const items = envelope.data ?? [];
    return { items, total: items.length, totalPages: 1 };
  });

const PENDING_STATUS_LABELS = {
  complete: AppointmentStatusLabelByKey.CONCLUIDO,
  cancel: AppointmentStatusLabelByKey.CANCELADO,
};

export default function AgendaPage() {
  /** Excluir é de quem pode (o backend recusa o atendente com 403). */
  const { canDestroy } = usePermissions();
  const [month, setMonth] = useState<MonthRef>(() => currentMonth());
  const filters = useFilters(agendaFilters, AGENDA_DEFAULTS);
  const { status, types } = filters.values;

  /**
   * A consulta do mês. Os selects guardam a CHAVE do enum; o backend aceita
   * nome ou rótulo, então a conversão é só de tipo.
   */
  const query = useMemo(
    () => ({
      year: month.year,
      month: month.month,
      searchTerm: filters.search || undefined,
      status: status.length ? (status as AppointmentStatusInput[]) : undefined,
      type: types.length ? (types as AppointmentTypeInput[]) : undefined,
    }),
    [month, filters.search, status, types],
  );

  /**
   * A lista do mês: `usePagedList` com o cache de sessão — voltar a um mês e
   * a um filtro já vistos não relê, e a mesma consulta pedida duas vezes vira
   * uma só. O cache some a cada gravação em `/appointments`; `invalidate()`
   * relê agora, com a lista atual na tela até a nova chegar.
   */
  const list = usePagedList({ params: query, cache: appointmentsListCache, fetchPage: fetchMonth });
  const { invalidate: reload } = list;

  /**
   * Mostra o compromisso recém-gravado: vai ao mês dele e tira o filtro que o
   * esconderia (a Situação, o Tipo ou a busca) — sem isso, agendar para o mês
   * seguinte ou com outro filtro ligado parece não ter gravado.
   */
  const reveal = (saved?: AppointmentResponse) => {
    const day = saved ? localDayOf(saved.startAt) : "";
    if (saved && day) {
      setMonth({ year: Number(day.slice(0, 4)), month: Number(day.slice(5, 7)) });
      const hidesStatus =
        status.length > 0 && !status.some((key) => AppointmentStatusLabelByKey[key as AppointmentStatusKey] === saved.status);
      const hidesType =
        types.length > 0 &&
        !types.some((key) => AppointmentTypeOptions.find((option) => option.value === key)?.label === saved.type);
      if (hidesStatus) filters.set("status", []);
      if (hidesType) filters.set("types", []);
      if (filters.values.search) filters.set("search", "");
    }
    reload();
  };

  const editor = useAppointmentEditor({ onSaved: reveal });
  const actions = useAppointmentActions({ onSettled: reload });

  /** A lista já mostra o efeito das ações na janela de desfazer, como a Home. */
  const days = useMemo(
    () => groupByDay(applyPendingOverlay(list.items, actions.pending, PENDING_STATUS_LABELS)),
    [list.items, actions.pending],
  );

  return (
    <div className="flex flex-col gap-5 pb-16">
      <PageHeader
        title="Agenda"
        description="Compromissos do escritório, por dia."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {/* Sem `maxMonth`: agenda existe para olhar para frente. */}
            <MonthPicker value={month} onChange={setMonth} tone="dark" />
            <Button type="button" variant="ghost" className="on-primary-button" onClick={editor.openCreate}>
              Novo compromisso
            </Button>
          </div>
        }
      />

      <AgendaFilters filters={filters} />

      {/* `key` por mês: dia aberto e páginas voltam ao padrão (só hoje aberto). */}
      {list.failed ? (
        <Notice tone="danger">{messageOf(list.failureReason, "Não foi possível carregar a agenda.")}</Notice>
      ) : (
        <AgendaAccordion
          key={`${month.year}-${month.month}`}
          days={days}
          isLoading={list.isLoading}
          actions={{
            onViewDetails: actions.requestDetails,
            onEdit: editor.openEdit,
            onComplete: actions.requestComplete,
            onCancel: actions.requestCancel,
            onReschedule: editor.openReschedule,
            onDelete: canDestroy ? actions.requestDelete : undefined,
            onCreate: editor.openCreate,
          }}
        />
      )}

      <FormModal
        isOpen={editor.isOpen}
        onOpenChange={(open) => !open && editor.requestClose()}
        title={editor.title}
        confirmLabel={editor.confirmLabel}
        onConfirm={editor.submit}
        isConfirmDisabled={!editor.isValid}
        size="lg"
        isSubmitting={editor.isSubmitting}
      >
        {editor.fields}
      </FormModal>
      {editor.dialogs}
      {actions.dialogs}
    </div>
  );
}
