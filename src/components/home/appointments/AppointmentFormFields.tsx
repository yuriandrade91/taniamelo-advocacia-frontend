"use client";

import React from "react";
import type { CalendarDateTime } from "@internationalized/date";
import {
  Alert,
  Calendar,
  Checkbox,
  ComboBox,
  DateField,
  DatePicker,
  I18nProvider,
  Input,
  Label,
  ListBox,
  TextArea,
} from "@heroui/react";
import { Field, SelectField } from "@/components/ui/form/Field";
import {
  AppointmentModalityOptions,
  AppointmentTypeOptions,
} from "@/enums/appointment/Appointment";
import { useClientSearch } from "@/hooks/useClientSearch";
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
};

/**
 * Data + hora (heroui.com/.../date-picker) — composição manual: `DateField`
 * pros segmentos editáveis inline e `Calendar` no popover pra escolher visual.
 * `granularity="minute"` faz os segmentos incluírem hora/minuto junto com a
 * data, sem precisar de um `TimeField` separado.
 */
function AppointmentDateTimeField({
  label,
  value,
  onChange,
  isDisabled,
  isInvalid,
  errorMessage,
}: {
  label: string;
  value: CalendarDateTime | null;
  onChange: (value: CalendarDateTime | null) => void;
  isDisabled?: boolean;
  isInvalid?: boolean;
  errorMessage?: string;
}) {
  return (
    <div>
      {/* heroui.com/.../date-picker#international-calendar — `I18nProvider`
      troca o locale só dentro dele (nomes de mês/dia, formato, 1º dia da
      semana), sem afetar o resto do app. */}
      <I18nProvider locale="pt-BR">
        <DatePicker
          value={value}
          onChange={onChange}
          granularity="minute"
          hourCycle={24}
          isDisabled={isDisabled}
          isInvalid={isInvalid}
          isRequired
        >
          <Label className="text-secondary">{label}</Label>
          <DateField.Group fullWidth className={`form-border-style`}>
            <DateField.Input>
              {(segment) => <DateField.Segment segment={segment} />}
            </DateField.Input>
            <DateField.Suffix>
              <DatePicker.Trigger>
                <DatePicker.TriggerIndicator />
              </DatePicker.Trigger>
            </DateField.Suffix>
          </DateField.Group>
          <DatePicker.Popover>
            <Calendar aria-label={label} className="text-gray-100">
              <Calendar.Header>
                <Calendar.Heading />
                <Calendar.NavButton
                  slot="previous"
                  className="text-gray-100"
                />
                <Calendar.NavButton slot="next" className="text-gray-100" />
              </Calendar.Header>
              <Calendar.Grid>
                <Calendar.GridHeader>
                  {(day) => (
                    <Calendar.HeaderCell className="text-secondary">
                      {day}
                    </Calendar.HeaderCell>
                  )}
                </Calendar.GridHeader>
                <Calendar.GridBody>
                  {(date) => <Calendar.Cell date={date} />}
                </Calendar.GridBody>
              </Calendar.Grid>
            </Calendar>
          </DatePicker.Popover>
        </DatePicker>
      </I18nProvider>
      {isInvalid && errorMessage ? (
        <p className="mt-1 text-sm text-danger">{errorMessage}</p>
      ) : null}
    </div>
  );
}

export default function AppointmentFormFields({
  values,
  errors,
  onChange,
  isEditing,
  conflicts = [],
  onShiftAfter,
  isDisabled = false,
}: AppointmentFormFieldsProps) {
  const showPastWarning = isStartInPast(values);
  // Modalidade online é a única em que a URL da reunião faz sentido.
  const isOnline = values.modality === "ONLINE";

  /**
   * Sugestões de cliente conforme digita. O I/O vive no hook — este componente
   * continua sendo só apresentação, e o mesmo hook serve qualquer outro
   * formulário que precise vincular um cliente.
   */
  const { suggestions: clientSuggestions } = useClientSearch({
    query: values.clientName,
    linkedClientId: values.clientId,
    enabled: !isDisabled,
  });

  return (
    <div className="flex flex-col gap-4">
      <Field
        label="Título"
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

      {/* ── Início / término ── */}
      <div className="grid grid-cols-2 gap-3 ">
        <AppointmentDateTimeField
          label="Início"
          value={values.startAt}
          onChange={(value) => onChange("startAt", value)}
          isDisabled={isDisabled}
          isInvalid={!!errors.startAt}
          errorMessage={errors.startAt}
        />
        <AppointmentDateTimeField
          label="Término"
          value={values.endAt}
          onChange={(value) => onChange("endAt", value)}
          isDisabled={isDisabled}
          isInvalid={!!errors.endAt}
          errorMessage={errors.endAt}
        />
      </div>

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
          className="rounded-xl border border-secondary/40 bg-light-secondary px-4 py-3"
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
        <div className="flex flex-col gap-2 border-2 border-solid rounded-3xl border-danger">
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
      <div>
        <ComboBox
          aria-label="Cliente"
          inputValue={values.clientName}
          onInputChange={(text) => {
            onChange("clientName", text);
            if (values.clientId) onChange("clientId", "");
          }}
          selectedKey={values.clientId || null}
          onSelectionChange={(key) => {
            if (key == null) return;
            const match = clientSuggestions.find((c) => c.id === String(key));
            if (match?.id) {
              onChange("clientId", match.id);
              onChange("clientName", match.fullName);
            }
          }}
          allowsCustomValue
          allowsEmptyCollection
          isRequired
          isInvalid={!!errors.clientName}
          isDisabled={isDisabled}
        >
          <Label
            className="text-secondary"
            isRequired
            isInvalid={!!errors.clientName}
          >
            Cliente
          </Label>
          <ComboBox.InputGroup>
            <Input placeholder="Nome da pessoa" className="form-border-style" />
          </ComboBox.InputGroup>
          <ComboBox.Popover>
            <ListBox
              renderEmptyState={() => (
                <div className="px-3 py-2 text-sm text-gray-100/60">
                  Nenhum cliente cadastrado com esse nome.
                </div>
              )}
            >
              {clientSuggestions.map((client) => (
                <ListBox.Item
                  key={client.id}
                  id={client.id ?? ""}
                  textValue={client.fullName}
                >
                  {client.fullName}
                </ListBox.Item>
              ))}
            </ListBox>
          </ComboBox.Popover>
        </ComboBox>
        {errors.clientName ? (
          <p className="mt-1 text-sm text-danger">{errors.clientName}</p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="appointment-description"
          className="text-sm text-secondary"
        >
          Descrição
        </label>
        <TextArea
          id="appointment-description"
          value={values.description}
          onChange={(e) => onChange("description", e.target.value)}
          placeholder="Pauta, documentos necessários, observações..."
          disabled={isDisabled}
          rows={3}
          className="mt-1 w-full form-border-style"
        />
        {errors.description ? (
          <p className="mt-1 text-sm text-danger">{errors.description}</p>
        ) : null}
      </div>

      {isEditing && (
        <Field
          label="Justificativa da alteração"
          value={values.justification}
          onChange={(e) => onChange("justification", e.target.value)}
          placeholder="Cliente pediu para remarcar"
          isRequired
          isDisabled={isDisabled}
          isInvalid={!!errors.justification}
          errorMessage={errors.justification}
        />
      )}
    </div>
  );
}
