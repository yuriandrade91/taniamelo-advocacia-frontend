"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Input, Label } from "@heroui/react";

import FormModal from "@/components/ui/modals/FormModal/FormModal";
import { MonthPicker } from "@/components/ui/MonthPicker";
import { PageHeader } from "@/components/ui/layout/PageHeader";
import { MultiSelectField } from "@/components/ui/form/Field";
import AppointmentFormFields from "@/components/home/appointments/AppointmentFormFields";
import { ConflictDecisionModal } from "@/components/home/appointments/ConflictDecisionModal";
import { useAppointmentConflicts } from "@/hooks/useAppointmentConflicts";
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
} from "@/components/home/appointments/appointmentForm";
import { AgendaMonthChart } from "@/components/agenda/AgendaMonthChart";
import { AgendaTypeChart } from "@/components/agenda/AgendaTypeChart";
import { AppointmentRow } from "@/components/agenda/AppointmentRow";
import CancelAppointmentDialog from "@/components/agenda/CancelAppointmentDialog";
import { formatDayHeader, groupByDay } from "@/components/agenda/agendaGrouping";
import ConfirmDialog from "@/components/ui/modals/ConfirmDialog/ConfirmDialog";

import { usePendingAction } from "@/hooks/usePendingAction";
import { currentMonth, type MonthRef } from "@/lib/period";
import {
  AppointmentStatusOptions,
  AppointmentTypeOptions,
} from "@/enums/appointment/Appointment";
import {
  cancelAppointment,
  completeAppointment,
  createAppointment,
  deleteAppointment,
  listAppointments,
  updateAppointment,
} from "@/services/appointmentService";
import { notificationCenter } from "@/services/notificationService";
import { applyPendingOverlay, type PendingKind } from "@/lib/pendingActions";
import type { AppointmentResponse } from "@/interfaces/appointment/Appointment.interface";
import type {
  AppointmentStatusInput,
  AppointmentTypeInput,
} from "@/enums/appointment/Appointment";
import { AppointmentStatusLabelByKey } from "@/enums/appointment/Appointment";

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
 * O que reaproveitei foi o que já estava extraído e testado: `appointmentForm`
 * (validação, `toRequest`, `fromResponse` — puros), `AppointmentFormFields`
 * (apresentacional), o `appointmentService` e o `FormModal` da casa. O card da
 * home continua existindo como resumo compacto; esta página é a visão completa.
 *
 * ## Janela de desfazer
 *
 * Concluir e excluir passam pelo `usePendingAction`: a tela muda na hora e a
 * requisição sai 5s depois. Não é preciosismo — a API da agenda **não tem como
 * reverter** nenhuma das duas (o `AppointmentRequestDTO` não carrega `status`,
 * e o delete é soft delete sem rota de restore), então desfazer só é possível
 * antes de enviar.
 */

const PAGE_SIZE = 100;
const SEARCH_DEBOUNCE_MS = 400;

const STATUS_OPTIONS = AppointmentStatusOptions.map((option) => ({
  id: option.value,
  label: option.label,
}));
const TYPE_OPTIONS = AppointmentTypeOptions.map((option) => ({
  id: option.value,
  label: option.label,
}));

const PENDING_STATUS_LABELS = {
  complete: AppointmentStatusLabelByKey.CONCLUIDO,
  cancel: AppointmentStatusLabelByKey.CANCELADO,
};

export default function AgendaPage() {
  const [month, setMonth] = useState<MonthRef>(() => currentMonth());
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);

  const [items, setItems] = useState<AppointmentResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { pending, schedule } = usePendingAction();

  // Modal de criação/edição
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<AppointmentResponse | null>(null);
  const [formValues, setFormValues] = useState<AppointmentFormValues>(
    EMPTY_APPOINTMENT_FORM,
  );
  const [showErrors, setShowErrors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  /** Aberto quando o salvar esbarra em conflito e a escolha ainda não foi feita. */
  const [isConflictDecisionOpen, setIsConflictDecisionOpen] = useState(false);

  /**
   * Conflitos do horário em edição.
   *
   * Fica aqui, e não dentro de `AppointmentFormFields`, porque quem salva é
   * esta página: interceptar o clique exige ter a lista no mesmo lugar da
   * decisão.
   */
  const { conflicts } = useAppointmentConflicts({
    startAt: toIsoInstant(formValues.startAt),
    endAt: toIsoInstant(formValues.endAt),
    excludeId: editing?.id,
    enabled: isFormOpen && !isSubmitting,
  });

  // Diálogos de ação
  const [cancelTarget, setCancelTarget] = useState<AppointmentResponse | null>(
    null,
  );
  /**
   * Compromisso que se quer concluir mas que ainda não começou.
   *
   * O backend recusa isso com 422 `EARLY_COMPLETION_NOT_CONFIRMED`: dar por
   * realizado o que a agenda diz que ainda vai acontecer é quase sempre linha
   * errada da lista. Perguntar aqui poupa a ida ao servidor e o toast de erro
   * numa recusa previsível - quem manda continua sendo o backend, que recusa
   * de novo se o relógio daqui estiver adiantado.
   */
  const [earlyCompleteTarget, setEarlyCompleteTarget] =
    useState<AppointmentResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AppointmentResponse | null>(
    null,
  );

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedSearch(search.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const envelope = await listAppointments({
        year: month.year,
        month: month.month,
        pageSize: PAGE_SIZE,
        searchTerm: debouncedSearch || undefined,
        // Os selects guardam a CHAVE do enum como string; o tipo do request é
        // a união literal. O `EnumLabelSupport` do backend aceita nome ou
        // label, então a conversão é só de tipo.
        status: status.length ? (status as AppointmentStatusInput[]) : undefined,
        type: types.length ? (types as AppointmentTypeInput[]) : undefined,
      });
      setItems(envelope.data ?? []);
    } catch (error) {
      // O toast de erro já vem do interceptor do axiosService.
      console.error("Erro ao carregar a agenda:", error);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [month, debouncedSearch, status, types]);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * A lista mostra o efeito das ações agendadas antes de elas irem para a API
   * — mesma sobreposição usada na agenda da home, para as duas telas não
   * discordarem sobre o que já aconteceu.
   */
  const visible = useMemo(
    () => applyPendingOverlay(items, pending, PENDING_STATUS_LABELS),
    [items, pending],
  );

  const days = useMemo(() => groupByDay(visible), [visible]);

  const errors: AppointmentFormErrors = useMemo(
    () => validateAppointmentForm(formValues, { isEditing: !!editing }),
    [formValues, editing],
  );
  const isFormValid = Object.keys(errors).length === 0;

  const openCreate = () => {
    setEditing(null);
    setFormValues(EMPTY_APPOINTMENT_FORM);
    setShowErrors(false);
    setIsFormOpen(true);
  };

  const openEdit = (appointment: AppointmentResponse) => {
    setEditing(appointment);
    setFormValues(fromResponse(appointment));
    setShowErrors(false);
    setIsFormOpen(true);
  };

  /**
   * Clique em salvar. Com conflito, pede a decisão antes de gravar.
   *
   * O aviso no formulário informa; ele não obriga a olhar. Este é o único
   * momento em que dá para exigir uma escolha consciente sem bloquear nada —
   * e sobrepor horário às vezes é o certo.
   */
  const handleSubmit = () => {
    if (!isFormValid) {
      setShowErrors(true);
      notificationCenter.warning("Revise os campos destacados.");
      return;
    }
    if (conflicts.length > 0) {
      setIsConflictDecisionOpen(true);
      return;
    }
    void persist([]);
  };

  /**
   * Grava de fato. `idsToCancel` vazio = manter os dois.
   *
   * Os cancelamentos vêm **antes** da gravação: se um deles falhar, nada foi
   * criado e a agenda continua coerente. Na ordem inversa, um erro deixaria o
   * compromisso novo marcado e o antigo vivo — exatamente a sobreposição que a
   * pessoa acabou de dizer que não queria.
   */
  const persist = async (idsToCancel: string[]) => {
    setIsSubmitting(true);
    try {
      for (const id of idsToCancel) {
        await cancelAppointment(id, {
          justification: `Substituído por: ${formValues.title.trim()}`,
        });
      }

      const body = toRequest(formValues, { isEditing: !!editing });
      if (editing) await updateAppointment(editing.id, body);
      else await createAppointment(body);

      setIsConflictDecisionOpen(false);
      setIsFormOpen(false);
      await load();
    } catch (error) {
      // Mantém o formulário aberto para o usuário corrigir sem perder o que
      // preencheu — o toast do erro já saiu pelo interceptor.
      console.error("Erro ao salvar compromisso:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const scheduleAction = (
    appointment: AppointmentResponse,
    kind: PendingKind,
    message: string,
    commit: () => Promise<unknown>,
  ) =>
    schedule({
      key: appointment.id,
      kind,
      message,
      commit,
      onSettled: () => void load(),
    });

  return (
    <div className="flex flex-col gap-5 pb-16">
      <PageHeader
        title="Agenda"
        description="Compromissos do escritório, por dia."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {/* Sem `maxMonth`: agenda existe para olhar para frente. */}
            <MonthPicker value={month} onChange={setMonth} tone="dark" />
            <Button
              type="button"
              variant="ghost"
              className="on-primary-button"
              onClick={openCreate}
            >
              Novo compromisso
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 items-end gap-3 rounded-2xl bg-gray-100/0 px-5 py-4 md:grid-cols-3">
        <div>
          <Label className="text-secondary">Buscar</Label>
          <Input
            className="form-border-style bg-white"
            placeholder="Título, cliente ou descrição"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <MultiSelectField
          label="Situação"
          options={STATUS_OPTIONS}
          selectedKeys={status}
          onSelectionChange={setStatus}
        />
        <MultiSelectField
          label="Tipo"
          options={TYPE_OPTIONS}
          selectedKeys={types}
          onSelectionChange={setTypes}
        />
      </div>

      

      {isLoading ? (
        <p className="rounded-2xl bg-white px-6 py-14 text-center text-sm text-gray-100/70">
          Carregando a agenda…
        </p>
      ) : days.length === 0 ? (
        <p className="rounded-2xl bg-white px-6 py-14 text-center text-sm text-gray-100/70">
          Nenhum compromisso neste mês com os filtros escolhidos.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {days.map((day) => (
            <section key={day.date}>
              <h2 className="mb-2 text-sm font-medium text-secondary">
                {formatDayHeader(day.date)}
              </h2>
              <ul className="flex flex-col gap-2">
                {day.items.map((appointment) => (
                  <AppointmentRow
                    key={appointment.id}
                    appointment={appointment}
                    onEdit={openEdit}
                    onComplete={(item) => {
                      const naoComecou =
                        !!item.startAt &&
                        new Date(item.startAt).getTime() > Date.now();
                      if (naoComecou) {
                        setEarlyCompleteTarget(item);
                        return;
                      }
                      scheduleAction(
                        item,
                        "complete",
                        "Compromisso concluído.",
                        () => completeAppointment(item.id, { silent: true }),
                      );
                    }}
                    onCancel={setCancelTarget}
                    onDelete={setDeleteTarget}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <FormModal
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        title={editing ? "Editar compromisso" : "Novo compromisso"}
        confirmLabel={editing ? "Salvar alterações" : "Agendar"}
        onConfirm={handleSubmit}
        isConfirmDisabled={!isFormValid}
        size="lg"
        isSubmitting={isSubmitting}
      >
        <AppointmentFormFields
          values={formValues}
          errors={showErrors ? errors : {}}
          onChange={(field, value) =>
            setFormValues((current) => ({ ...current, [field]: value }))
          }
          isEditing={!!editing}
          conflicts={conflicts}
          onShiftAfter={(conflict) =>
            setFormValues((current) => shiftAfter(current, conflict.endAt))
          }
          isDisabled={isSubmitting}
        />
        {isStartInPast(formValues) && (
          <p className="mt-3 rounded-xl bg-light-secondary px-3 py-2 text-xs text-secondary">
            A data escolhida está no passado. O servidor pede confirmação
            explícita nesse caso.
          </p>
        )}
      </FormModal>

      <ConflictDecisionModal
        isOpen={isConflictDecisionOpen}
        conflicts={conflicts}
        newTitle={formValues.title}
        onClose={() => setIsConflictDecisionOpen(false)}
        onConfirm={(idsToCancel) => void persist(idsToCancel)}
        isSubmitting={isSubmitting}
      />

      <CancelAppointmentDialog
        isOpen={cancelTarget !== null}
        onClose={() => setCancelTarget(null)}
        appointmentTitle={cancelTarget?.title ?? ""}
        onConfirm={(justification) => {
          if (!cancelTarget) return;
          const target = cancelTarget;
          scheduleAction(target, "cancel", "Compromisso cancelado.", () =>
            cancelAppointment(target.id, { justification }, { silent: true }),
          );
        }}
      />

      <ConfirmDialog
        isOpen={earlyCompleteTarget !== null}
        onClose={() => setEarlyCompleteTarget(null)}
        tone="danger"
        heading="Concluir antes da hora?"
        confirmLabel="Concluir mesmo assim"
        cancelLabel="Voltar"
        description={
          earlyCompleteTarget ? (
            <>
              <span className="font-medium">{earlyCompleteTarget.title}</span>{" "}
              ainda não começou. Concluir agora registra que ele já aconteceu, e
              concluído não pode ser editado nem cancelado depois.
            </>
          ) : null
        }
        onConfirm={() => {
          if (!earlyCompleteTarget) return;
          const target = earlyCompleteTarget;
          setEarlyCompleteTarget(null);
          scheduleAction(target, "complete", "Compromisso concluído.", () =>
            completeAppointment(target.id, {
              silent: true,
              earlyCompletionAcknowledged: true,
            }),
          );
        }}
      />

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        tone="danger"
        heading="Excluir compromisso?"
        confirmLabel="Excluir"
        cancelLabel="Manter"
        description={
          deleteTarget ? (
            <>
              <span className="font-medium">{deleteTarget.title}</span> sai da
              agenda. Você tem alguns segundos para desfazer.
            </>
          ) : null
        }
        onConfirm={() => {
          if (!deleteTarget) return;
          const target = deleteTarget;
          scheduleAction(target, "delete", "Compromisso excluído.", () =>
            deleteAppointment(target.id, { silent: true }),
          );
        }}
      />
    </div>
  );
}
