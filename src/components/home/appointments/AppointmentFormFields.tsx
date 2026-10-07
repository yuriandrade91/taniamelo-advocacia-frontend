"use client";

import React from "react";
import { parseDateTime, type CalendarDateTime } from "@internationalized/date";
import { Alert, Checkbox } from "@heroui/react";
import {
  DateTimePickerField,
  Field,
  SelectField,
  TextAreaField,
} from "@/components/ui/form/Field";
import { FieldGrid } from "@/components/ui/form/FieldGrid";
import {
  AppointmentModalityOptions,
  AppointmentTypeOptions,
} from "@/enums/appointment/Appointment";
import { ClientSearchField } from "@/components/ui/form/ClientSearchField";
// Mesma formatação de hora da lista da agenda — já testada em agendaGrouping.test.
import { localTimeOf } from "@/components/agenda/agendaGrouping";
import type {
  AppointmentFormErrors,
  AppointmentFormValues,
} from "./appointmentForm";
import type { AppointmentResponse } from "@/interfaces/appointment/Appointment.interface";
import { isStartInPast } from "./appointmentForm";

/**
 * Campos do compromisso. Só renderiza — validação e conversão vivem em
 * `appointmentForm.ts`, e o estado é do componente pai.
 *
 * O desenho é o da Carteira: os campos numa `FieldGrid`, que põe o rótulo
 * dentro da moldura e deixa só início e término dividindo a linha. `compact`
 * empilha tudo numa coluna, para o painel lateral da Home — dois campos lado
 * a lado ali espremeriam os dois.
 *
 * Os avisos (conflito de horário, data no passado) são filhos diretos da
 * grade ocupando a linha inteira: ficam onde pertencem, logo abaixo das
 * datas que os provocaram, e a grade só desenha quem tem caixa de campo.
 *
 * Os campos marcados com `isRequired` são os que o backend valida
 * (`@NotBlank`/`@NotNull`), mais `justification` na edição e `clientName`
 * (obrigatório na regra de negócio, ainda que o backend aceite o compromisso
 * sem cliente vinculado).
 */

export type AppointmentFormFieldsProps = {
  values: AppointmentFormValues;
  errors: AppointmentFormErrors;
  onChange: <K extends keyof AppointmentFormValues>(
    field: K,
    value: AppointmentFormValues[K],
  ) => void;
  /** Na edição, exibe o campo de justificativa (obrigatório). */
  isEditing: boolean;
  /**
   * Compromissos que ocupam o mesmo horário.
   *
   * Vem por prop, e não de um hook aqui dentro, porque **quem salva é o pai** —
   * e é ele que precisa da lista para interceptar o clique de agendar. Duas
   * fontes para a mesma consulta produziriam duas listas que podem discordar
   * no instante da decisão.
   */
  conflicts?: AppointmentResponse[];
  /** Move o novo compromisso para depois deste conflito, mantendo a duração. */
  onShiftAfter?: (conflict: AppointmentResponse) => void;
  isDisabled?: boolean;
  /** Uma coluna só — o painel lateral da Home. */
  compact?: boolean;
};

/** O campo guarda `CalendarDateTime`; o `DateTimePickerField` da casa fala texto ISO local. */
const toText = (value: CalendarDateTime | null) => value?.toString() ?? "";
const fromText = (text: string) => (text ? parseDateTime(text) : null);

export default function AppointmentFormFields({
  values,
  errors,
  onChange,
  isEditing,
  conflicts = [],
  onShiftAfter,
  isDisabled = false,
  compact = false,
}: AppointmentFormFieldsProps) {
  const showPastWarning = isStartInPast(values);
  // Modalidade online é a única em que a URL da reunião faz sentido.
  const isOnline = values.modality === "ONLINE";

  return (
    <FieldGrid compact={compact}>
      <Field
        label="Título"
        className="col-span-full"
        value={values.title}
        onChange={(e) => onChange("title", e.target.value)}
        placeholder="Entrevista com Yuri Andrade"
        isRequired
        isDisabled={isDisabled}
        isInvalid={!!errors.title}
        errorMessage={errors.title}
      />

      <SelectField
        label="Tipo"
        className="col-span-full"
        options={AppointmentTypeOptions.map((o) => ({
          id: o.value,
          label: o.label,
        }))}
        selectedKey={values.type || null}
        onSelectionChange={(key) =>
          onChange("type", key as AppointmentFormValues["type"])
        }
        isRequired
        isDisabled={isDisabled}
        isInvalid={!!errors.type}
        errorMessage={errors.type}
      />

      {/* ── Início / término: o único par que divide a linha ── */}
      <DateTimePickerField
        label="Início"
        isRequired
        value={toText(values.startAt)}
        onChange={(text) => onChange("startAt", fromText(text))}
        isDisabled={isDisabled}
        isInvalid={!!errors.startAt}
        errorMessage={errors.startAt}
      />
      <DateTimePickerField
        label="Término"
        isRequired
        value={toText(values.endAt)}
        onChange={(text) => onChange("endAt", fromText(text))}
        isDisabled={isDisabled}
        isInvalid={!!errors.endAt}
        errorMessage={errors.endAt}
      />

      {/*
        Conflito de horário — dourado, não vermelho.

        Vermelho é do erro que impede de salvar (a data no passado, logo
        abaixo). Este aqui não impede nada, e pintar os dois igual ensinaria a
        ignorar o vermelho. Mostra COM QUEM o horário bate, porque "existe
        conflito" sem dizer com o quê obriga a abrir outra tela para decidir.
      */}
      {conflicts.length > 0 && (
        <div
          role="status"
          className="col-span-full rounded-xl border border-secondary/40 bg-light-secondary px-4 py-3"
        >
          <p className="text-sm font-medium text-primary">
            {conflicts.length === 1
              ? "Já há um compromisso nesse horário"
              : `Já há ${conflicts.length} compromissos nesse horário`}
          </p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {conflicts.slice(0, 4).map((conflict) => (
              <li
                key={conflict.id}
                className="flex items-center gap-2 text-xs text-gray-100"
              >
                <span className="min-w-0 flex-1 truncate">
                  <span className="text-primary">{conflict.title}</span>
                  {" · "}
                  {localTimeOf(conflict.startAt)}–{localTimeOf(conflict.endAt)}
                  {conflict.clientName ? ` · ${conflict.clientName}` : ""}
                </span>

                {/*
                  A saída não destrutiva, à mão: encaixa o novo compromisso logo
                  depois deste, mantendo a duração. Cancelar o que já existe é
                  decisão de outra ordem e fica para o diálogo do salvar, onde
                  há confirmação — resolver aqui, com um clique, tornaria fácil
                  demais apagar a agenda de alguém.
                */}
                {onShiftAfter && !isDisabled && (
                  <button
                    type="button"
                    onClick={() => onShiftAfter(conflict)}
                    className="shrink-0 rounded-full border border-secondary/40 px-2 py-0.5 text-[11px] font-medium text-secondary hover:bg-secondary/10"
                  >
                    Agendar após este
                  </button>
                )}
              </li>
            ))}
          </ul>
          {conflicts.length > 4 && (
            <p className="mt-1 text-xs text-gray-100/70">
              e mais {conflicts.length - 4}.
            </p>
          )}
          <p className="mt-2 text-xs text-gray-100">
            Não impede de agendar. Ao salvar, você escolhe entre manter os dois
            ou substituir.
          </p>
        </div>
      )}

      {/* Data no passado: o backend recusa com 422 sem esta confirmação. */}
      {showPastWarning && (
        <div className="col-span-full flex flex-col gap-2 rounded-3xl border-2 border-solid border-danger">
          <Alert status="warning">
            <Alert.Indicator className="text-danger" />
            <Alert.Content>
              <Alert.Title className="text-danger">Data no passado</Alert.Title>
              <Alert.Description>
                O início informado está no passado.
              </Alert.Description>
              <Checkbox
                onChange={(selected) =>
                  onChange("pastDateAcknowledged", selected)
                }
                isSelected={values.pastDateAcknowledged}
                isDisabled={isDisabled}
                isRequired
                className="mt-4 cursor-pointer"
              >
                <Checkbox.Content>
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  <span className="text-gray-100">
                    Estou ciente e quero registrar mesmo assim
                  </span>
                </Checkbox.Content>
              </Checkbox>
            </Alert.Content>
          </Alert>
        </div>
      )}

      <SelectField
        label="Modalidade"
        className="col-span-full"
        options={AppointmentModalityOptions.map((o) => ({
          id: o.value,
          label: o.label,
        }))}
        selectedKey={values.modality || null}
        onSelectionChange={(key) =>
          onChange("modality", key as AppointmentFormValues["modality"])
        }
        isDisabled={isDisabled}
      />

      {isOnline ? (
        <Field
          label="Link da reunião"
          className="col-span-full"
          value={values.meetingUrl}
          onChange={(e) => onChange("meetingUrl", e.target.value)}
          placeholder="https://meet.google.com/xxx-yyyy-zzz"
          isDisabled={isDisabled}
          isInvalid={!!errors.meetingUrl}
          errorMessage={errors.meetingUrl}
        />
      ) : (
        <Field
          label="Local"
          className="col-span-full"
          value={values.location}
          onChange={(e) => onChange("location", e.target.value)}
          placeholder="Escritório — sala 2"
          isDisabled={isDisabled}
        />
      )}

      {/*
        Busca conforme digita — o backend ignora `clientName` quando
        `clientId` vem preenchido, então selecionar uma sugestão vincula os
        dois juntos. Digitar de novo depois de selecionado solta o vínculo
        (`clientId` volta a "") e passa a valer só o texto livre.
      */}
      <ClientSearchField
        className="col-span-full"
        value={{ clientId: values.clientId, clientName: values.clientName }}
        onChange={(next) => {
          onChange("clientName", next.clientName);
          onChange("clientId", next.clientId);
        }}
        isRequired
        isDisabled={isDisabled}
        errorMessage={errors.clientName}
      />

      <TextAreaField
        label="Descrição"
        className="col-span-full"
        value={values.description}
        onChange={(next) => onChange("description", next)}
        placeholder="Pauta, documentos necessários, observações..."
        rows={3}
        isDisabled={isDisabled}
        isInvalid={!!errors.description}
        errorMessage={errors.description}
      />

      {isEditing && (
        <Field
          label="Justificativa da alteração"
          className="col-span-full"
          value={values.justification}
          onChange={(e) => onChange("justification", e.target.value)}
          placeholder="Cliente pediu para remarcar"
          isRequired
          isDisabled={isDisabled}
          isInvalid={!!errors.justification}
          errorMessage={errors.justification}
        />
      )}
    </FieldGrid>
  );
}
