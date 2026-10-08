"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@heroui/react";

import FormModal from "@/components/ui/modals/FormModal/FormModal";
import { MonthPicker } from "@/components/ui/MonthPicker";
import { PageHeader } from "@/components/ui/layout/PageHeader";
import { groupByDay } from "@/components/agenda/agendaGrouping";
import { AgendaAccordion } from "@/components/agenda/AgendaAccordion";
import { AGENDA_DEFAULTS, AgendaFilters, agendaFilters } from "@/components/agenda/AgendaFilters";
import { useAppointmentActions } from "@/components/agenda/useAppointmentActions";
import { useAppointmentEditor } from "@/components/agenda/useAppointmentEditor";
import { useFilters } from "@/hooks/useFilters";
import { usePermissions } from "@/hooks/usePermissions";
import { currentMonth, type MonthRef } from "@/lib/period";
import { applyPendingOverlay } from "@/lib/pendingActions";
import { listAppointments } from "@/services/appointmentService";
import type { AppointmentResponse } from "@/interfaces/appointment/Appointment.interface";
import {
  AppointmentStatusLabelByKey,
  type AppointmentStatusInput,
  type AppointmentTypeInput,
} from "@/enums/appointment/Appointment";

/**
 * Agenda — página própria, no lugar do modal aberto por `?openAgenda=true`.
 *
 * ## Por que não reaproveitei o `AppointmentsCard`
 *
 * Ele resolve o mesmo domínio, mas é o componente-Deus que o
 * `REVISAO_ARQUITETURA_2026` aponta: 1.797 linhas, 25 `useState`, três caches
 * e o formulário inteiro no mesmo escopo. Colocá-lo numa rota faria a página
 * nascer com o problema pronto.
 *
 * O fluxo de formulário e o das ações moram em hooks compartilhados com o card
 * da Home (`useAppointmentEditor`, `useAppointmentActions`): as duas telas
 * validam, avisam conflito e desfazem igual. O card é o resumo compacto; esta
 * página é a visão completa.
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

const PAGE_SIZE = 100;

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
      pageSize: PAGE_SIZE,
      searchTerm: filters.search || undefined,
      status: status.length ? (status as AppointmentStatusInput[]) : undefined,
      type: types.length ? (types as AppointmentTypeInput[]) : undefined,
    }),
    [month, filters.search, status, types],
  );
  const queryKey = JSON.stringify(query);

  /**
   * A lista marcada com a consulta que a trouxe: "carregando" é derivado
   * (consulta nova sem resposta), e resposta atrasada de uma consulta antiga
   * não entra. Recarregar depois de uma ação (`version`) mantém a lista na
   * tela até a nova chegar.
   */
  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);
  const [loaded, setLoaded] = useState<{ key: string; items: AppointmentResponse[] } | null>(null);
  useEffect(() => {
    let active = true;
    listAppointments(query)
      // O toast de erro já vem do interceptor do axiosService.
      .then((envelope) => envelope.data ?? [], () => [])
      .then((items) => {
        if (active) setLoaded({ key: queryKey, items });
      });
    return () => {
      active = false;
    };
    // `query` entra pela `queryKey`; `version` força a releitura.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey, version]);
  const isLoading = loaded?.key !== queryKey;

  const editor = useAppointmentEditor({ onSaved: reload });
  const actions = useAppointmentActions({ onSettled: reload });

  /** A lista já mostra o efeito das ações na janela de desfazer, como a Home. */
  const days = useMemo(
    () => groupByDay(applyPendingOverlay(loaded?.items ?? [], actions.pending, PENDING_STATUS_LABELS)),
    [loaded, actions.pending],
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
      <AgendaAccordion
        key={`${month.year}-${month.month}`}
        days={days}
        isLoading={isLoading}
        actions={{
          onEdit: editor.openEdit,
          onComplete: actions.requestComplete,
          onCancel: actions.requestCancel,
          onDelete: canDestroy ? actions.requestDelete : undefined,
          onCreate: editor.openCreate,
        }}
      />

      <FormModal
        isOpen={editor.isOpen}
        onOpenChange={(open) => !open && editor.close()}
        title={editor.isEditing ? "Editar compromisso" : "Novo compromisso"}
        confirmLabel={editor.isEditing ? "Salvar alterações" : "Agendar"}
        onConfirm={editor.submit}
        isConfirmDisabled={!editor.isValid}
        size="lg"
        // O mesmo rodapé da Carteira — as modais de lançamento falam a mesma
        // língua, seja compromisso, parcela ou despesa.
        actions="pill"
        isSubmitting={editor.isSubmitting}
      >
        {editor.fields}
      </FormModal>
      {editor.conflictDialog}
      {actions.dialogs}
    </div>
  );
}
