"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import ConfirmDialog from "@/components/ui/modals/ConfirmDialog";
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
import { useAppointmentConflicts } from "@/hooks/useAppointmentConflicts";
import { useFieldErrors } from "@/hooks/useFieldErrors";
import { plural } from "@/lib/format";
import type { AppointmentResponse } from "@/interfaces/appointment/Appointment.interface";
import {
  cancelAppointment,
  createAppointment,
  updateAppointment,
} from "@/services/appointmentService";
import { notificationCenter } from "@/services/notificationService";

/** Os campos (datas, busca de cliente) e a decisão de conflito só vêm quando o formulário abre. */
const AppointmentFormFields = dynamic(() => import("./AppointmentFormFields"), { ssr: false });
const ConflictDecisionModal = dynamic(
  () => import("./ConflictDecisionModal").then((m) => m.ConflictDecisionModal),
  { ssr: false },
);

/**
 * Criar, editar e reagendar um compromisso — o formulário, a validação, o
 * aviso de conflito, a decisão de substituir e o "descartar?" ao fechar.
 *
 * A página da Agenda desenha isto numa modal; o cartão da Home, num painel
 * lateral (`compact`, uma coluna). As duas validam, avisam e gravam igual
 * porque o fluxo inteiro mora aqui — quem chama só escolhe a moldura.
 *
 * - Erros aparecem por campo assim que ele é mexido, e todos de uma vez no
 *   "Salvar". O botão fica travado enquanto há erro ou data retroativa sem
 *   ciência (o backend recusa com 422).
 * - Conflito de horário é aviso, não bloqueio: no "Salvar", a pessoa decide
 *   se mantém os dois ou cancela os que batem (`ConflictDecisionModal`).
 * - Os cancelamentos vêm **antes** da gravação: se um falhar, nada foi criado.
 * - Reagendar um cancelado cria um compromisso **novo** com os mesmos dados e
 *   sem data: não há rota para reabrir um cancelamento, e o original fica no
 *   histórico como cancelado.
 */
export function useAppointmentEditor({
  onSaved,
  compact = false,
}: {
  onSaved: () => void;
  /** Uma coluna — para o painel lateral, onde campos lado a lado ficariam espremidos. */
  compact?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<AppointmentResponse | null>(null);
  const [values, setValues] = useState<AppointmentFormValues>(EMPTY_APPOINTMENT_FORM);
  const [baseline, setBaseline] = useState<AppointmentFormValues>(EMPTY_APPOINTMENT_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeciding, setIsDeciding] = useState(false);
  const [isConfirmingDiscard, setIsConfirmingDiscard] = useState(false);

  const isEditing = editing !== null;
  const errors = validateAppointmentForm(values, { isEditing });
  const isPastBlocked = isStartInPast(values) && !values.pastDateAcknowledged;
  const isValid = Object.keys(errors).length === 0 && !isPastBlocked;
  const isDirty = JSON.stringify(values) !== JSON.stringify(baseline);
  const check = useFieldErrors({
    ...errors,
    pastDateAcknowledged: isPastBlocked ? "Confirme a ciência da data retroativa para continuar." : undefined,
  });
  const visibleErrors: AppointmentFormErrors = Object.fromEntries(
    Object.keys(errors).flatMap((key) => {
      const message = check.errorOf(key);
      return message ? [[key, message]] : [];
    }),
  );
  const pastError = check.errorOf("pastDateAcknowledged");

  const { conflicts } = useAppointmentConflicts({
    startAt: toIsoInstant(values.startAt),
    endAt: toIsoInstant(values.endAt),
    excludeId: editing?.id,
    enabled: isOpen && !isSubmitting,
  });

  const open = (next: AppointmentFormValues, target: AppointmentResponse | null) => {
    setEditing(target);
    setValues(next);
    setBaseline(next);
    check.reset();
    setIsOpen(true);
  };

  const close = () => {
    setIsConfirmingDiscard(false);
    setIsOpen(false);
  };

  /** Fechar o formulário mexido pergunta antes: o que foi preenchido se perderia. */
  const requestClose = () => {
    if (isDirty && !isSubmitting) setIsConfirmingDiscard(true);
    else close();
  };

  const setField = <K extends keyof AppointmentFormValues>(field: K, value: AppointmentFormValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
    check.touch(field);
  };

  const persist = async (idsToCancel: string[]) => {
    setIsSubmitting(true);
    try {
      // Um aviso só, no fim: o que foi gravado e quantos saíram para dar lugar.
      for (const id of idsToCancel) {
        await cancelAppointment(id, { justification: `Substituído por: ${values.title.trim()}` }, { silent: true });
      }
      const replaced = idsToCancel.length
        ? ` ${plural(idsToCancel.length, "compromisso substituído foi cancelado", "compromissos substituídos foram cancelados")}.`
        : "";
      const body = toRequest(values, { isEditing });
      if (editing) await updateAppointment(editing.id, body, { successMessage: `Compromisso atualizado.${replaced}` });
      else await createAppointment(body, { successMessage: `Compromisso agendado.${replaced}` });
      setIsDeciding(false);
      setIsOpen(false);
      onSaved();
    } catch {
      // O toast do erro já saiu pelo interceptor; o formulário fica aberto
      // para corrigir sem perder o que foi preenchido.
    } finally {
      setIsSubmitting(false);
    }
  };

  const submit = () => {
    if (!check.revealAll()) {
      notificationCenter.warning("Revise os campos destacados.");
      return;
    }
    if (conflicts.length > 0) setIsDeciding(true);
    else void persist([]);
  };

  return {
    isOpen,
    isEditing,
    isValid,
    isSubmitting,
    title: isEditing ? "Editar compromisso" : "Novo compromisso",
    confirmLabel: isEditing ? "Salvar alterações" : "Agendar",
    openCreate: () => open(EMPTY_APPOINTMENT_FORM, null),
    openEdit: (appointment: AppointmentResponse) => open(fromResponse(appointment), appointment),
    openReschedule: (appointment: AppointmentResponse) =>
      open(
        {
          ...fromResponse(appointment),
          startAt: null,
          endAt: null,
          justification: "",
          pastDateAcknowledged: false,
        },
        null,
      ),
    requestClose,
    submit,
    fields: (
      <>
        <AppointmentFormFields
          values={values}
          errors={visibleErrors}
          onChange={setField}
          isEditing={isEditing}
          conflicts={conflicts}
          onShiftAfter={(conflict) => setValues((current) => shiftAfter(current, conflict.endAt))}
          isDisabled={isSubmitting}
          compact={compact}
        />
        {pastError && (
          <p role="alert" className="mt-3 text-xs text-danger">
            {pastError}
          </p>
        )}
      </>
    ),
    dialogs: (
      <>
        <ConflictDecisionModal
          isOpen={isDeciding}
          conflicts={conflicts}
          newTitle={values.title}
          onClose={() => setIsDeciding(false)}
          onConfirm={(ids) => void persist(ids)}
          isSubmitting={isSubmitting}
        />
        <ConfirmDialog
          isOpen={isConfirmingDiscard}
          onClose={() => setIsConfirmingDiscard(false)}
          onConfirm={close}
          tone="danger"
          heading="Descartar compromisso?"
          description="As informações preenchidas serão perdidas."
          confirmLabel="Descartar"
          cancelLabel="Continuar preenchendo"
        />
      </>
    ),
  };
}
