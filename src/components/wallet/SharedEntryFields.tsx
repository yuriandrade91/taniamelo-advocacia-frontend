"use client";

import {
  DatePickerField,
  Field,
  SelectField,
  SwitchField,
  TextAreaField,
} from "@/components/ui/form/Field";
import { AmountField } from "@/components/ui/form/AmountField";
import { toSelectOptions } from "@/components/ui/form/options";
import { PaymentMethodOptions } from "@/enums/payment/Payment";
import type { SharedValues } from "./entryForms";

/**
 * Os campos que entrada e saída têm em comum.
 *
 * Existe pelo mesmo motivo que `SharedValues` existe do lado dos dados: um
 * único lugar onde se decide o rótulo, a ordem e a validação desses sete
 * campos. Duplicá-los nos dois formulários é como eles divergiriam — um ganha
 * um `placeholder` melhor, o outro não, e ninguém percebe porque nunca se vê
 * os dois na mesma tela.
 *
 * O que muda entre os lados é só o texto do switch e da data, porque
 * "recebido" e "pago" são a mesma pergunta com palavras diferentes. Vem por
 * prop em vez de um `if` aqui dentro: assim este componente não precisa saber
 * que tipos existem.
 */

export type SharedEntryFieldsProps = {
  values: SharedValues;
  onChange: <K extends keyof SharedValues>(
    key: K,
    value: SharedValues[K],
  ) => void;
  errorOf: (key: keyof SharedValues) => string | undefined;
  isDisabled?: boolean;

  descriptionPlaceholder: string;
  settledLabel: string;
  settledHintOn: string;
  settledHintOff: string;
  settledDateLabel: string;
  paymentMethodLabel: string;
};

export function SharedEntryFields({
  values,
  onChange,
  errorOf,
  isDisabled,
  descriptionPlaceholder,
  settledLabel,
  settledHintOn,
  settledHintOff,
  settledDateLabel,
  paymentMethodLabel,
}: SharedEntryFieldsProps) {
  return (
    <>
      <Field
        label="Descrição"
        value={values.description}
        onChange={(event) => onChange("description", event.target.value)}
        placeholder={descriptionPlaceholder}
        isRequired
        isDisabled={isDisabled}
        isInvalid={!!errorOf("description")}
        errorMessage={errorOf("description")}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <AmountField
          label="Valor"
          value={values.amount}
          onChange={(next) => onChange("amount", next)}
          isRequired
          isDisabled={isDisabled}
          isInvalid={!!errorOf("amount")}
          errorMessage={errorOf("amount")}
        />
        <DatePickerField
          label="Vencimento"
          value={values.dueDate}
          onChange={(next) => onChange("dueDate", next)}
          allowFuture
          isRequired
          isDisabled={isDisabled}
          isInvalid={!!errorOf("dueDate")}
          errorMessage={errorOf("dueDate")}
        />
      </div>

      <SelectField
        label={paymentMethodLabel}
        options={toSelectOptions(PaymentMethodOptions)}
        selectedKey={values.paymentMethod || null}
        onSelectionChange={(key) => onChange("paymentMethod", key)}
        placeholder="Selecione"
        isDisabled={isDisabled}
      />

      {/*
        O switch é o que liga esta tela ao caixa. Sem ele, todo lançamento
        nasce "a vencer" e o mês fecha sem movimento nenhum — a Carteira
        pareceria quebrada funcionando direito, porque ela mede pagamento e não
        vencimento.
      */}
      <SwitchField
        label={settledLabel}
        value={values.isSettled}
        onChange={(next) => {
          onChange("isSettled", next);
          // Desmarcar limpa a data: "não foi pago" com data de pagamento
          // preenchida é um estado contraditório que o backend rejeitaria — e
          // que aqui viraria um payload com `paidDate` sem sentido.
          if (!next) onChange("paidDate", "");
        }}
        hint={values.isSettled ? settledHintOn : settledHintOff}
        isDisabled={isDisabled}
      />

      {values.isSettled && (
        <DatePickerField
          label={settledDateLabel}
          value={values.paidDate}
          onChange={(next) => onChange("paidDate", next)}
          isRequired
          isDisabled={isDisabled}
          isInvalid={!!errorOf("paidDate")}
          errorMessage={errorOf("paidDate")}
        />
      )}

      <TextAreaField
        label="Observações"
        value={values.notes}
        onChange={(next) => onChange("notes", next)}
        rows={3}
        isDisabled={isDisabled}
      />
    </>
  );
}
