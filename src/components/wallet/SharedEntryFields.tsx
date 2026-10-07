"use client";

import { SchemaField } from "@/components/ui/form/SchemaFields";
import type { FormValues, SectionForm } from "@/hooks/useSectionForm";
import type { SharedValues } from "./entryForms";

/**
 * Os campos que entrada, saída e parcela a receber têm em comum.
 *
 * Existe pelo mesmo motivo que `sharedEntryFields` existe do lado do schema:
 * um único lugar onde se decide a ordem e o agrupamento desses sete campos.
 * Duplicá-los nos formulários é como eles divergiriam — um ganha um grupo
 * melhor, o outro não, e ninguém percebe porque nunca se vê os dois na mesma
 * tela.
 *
 * Rótulo, obrigatoriedade e validador **não** estão aqui: vêm do schema de
 * quem chama, que é quem sabe se a pergunta é "já foi recebido?" ou "já foi
 * paga?". Por isso o componente é genérico no formulário — ele não precisa
 * saber que tipos de lançamento existem.
 *
 * Os campos saem soltos, sem moldura em volta: quem chama os põe numa grade
 * `[data-form-fields]` junto com os seus próprios, e é essa grade que desenha
 * o rótulo dentro da caixa. `col-span-full` é o campo que ocupa a linha
 * inteira — só valor e vencimento dividem.
 */

export type SharedEntryFieldsProps<V extends SharedValues & FormValues> = {
  form: SectionForm<V>;
  isDisabled?: boolean;
  /** A dica ao lado da caixa, nas duas posições. */
  settledHintOn: string;
  settledHintOff: string;
};

export function SharedEntryFields<V extends SharedValues & FormValues>({
  form,
  isDisabled,
  settledHintOn,
  settledHintOff,
}: SharedEntryFieldsProps<V>) {
  const field = (name: keyof V & string, className = "col-span-full") => (
    <SchemaField
      form={form}
      name={name}
      className={className}
      isDisabled={isDisabled}
    />
  );

  return (
    <>
      {field("description")}
      {field("amount", "")}
      {field("dueDate", "")}
      {field("paymentMethod")}

      {/*
        A caixa é o que liga esta tela ao caixa do escritório. Sem ela, todo
        lançamento nasce "a vencer" e o mês fecha sem movimento nenhum — a
        Carteira pareceria quebrada funcionando direito, porque ela mede
        pagamento e não vencimento.
      */}
      <SchemaField
        form={form}
        name="isSettled"
        className="col-span-full"
        isDisabled={isDisabled}
        description={form.values.isSettled ? settledHintOn : settledHintOff}
        onValueChange={(next) => {
          // Desmarcar limpa a data: "não foi pago" com data de pagamento
          // preenchida é um estado contraditório que o backend rejeitaria — e
          // que aqui viraria um payload com `paidDate` sem sentido.
          if (next === "false") form.setField("paidDate", "" as V["paidDate"]);
        }}
      />

      {/* Enquanto a caixa está marcada, a data é obrigatória — e some junto
          com ela, porque "não foi pago" não tem data de pagamento. */}
      {form.values.isSettled && (
        <SchemaField
          form={form}
          name="paidDate"
          className="col-span-full"
          isRequired
          isDisabled={isDisabled}
        />
      )}

      {field("notes")}
    </>
  );
}
