"use client";

import { ClientSearchField } from "@/components/ui/form/ClientSearchField";
import { FieldGrid } from "@/components/ui/form/FieldGrid";
import { SchemaField } from "@/components/ui/form/SchemaFields";
import { Segmented } from "@/components/ui/filters/FilterBar";
import { SharedEntryFields } from "./SharedEntryFields";
import { isCancelled, type EntryKind } from "./entryForms";
import type { EntryForm } from "./useEntryForm";

/**
 * Os campos do lançamento — o mesmo desenho no modal de cadastro e na edição
 * dentro do painel de detalhes. Estado e envio ficam em `useEntryForm`, e o
 * que cada campo é (rótulo, máscara, obrigatoriedade, validador) está nos
 * schemas de `entryForms`.
 *
 * `compact` empilha os campos em uma coluna: o painel lateral é estreito, e
 * dois campos lado a lado ali espremeriam os dois.
 *
 * O aviso, o seletor de tipo e a explicação ficam **fora** da grade: ela é só
 * dos campos, porque é o que a põe dentro da moldura certa.
 */

export function EntryFormFields({
  form,
  compact = false,
}: {
  form: EntryForm;
  compact?: boolean;
}) {
  const {
    isIncome,
    isEditing,
    lockedKind,
    kind,
    income,
    expense,
    values,
    switchKind,
    isSubmitting,
  } = form;

  return (
    <div className="flex flex-col gap-4">
      {/* Cancelado não tem caixa que o represente, e o PUT substitui o
          registro inteiro: sem dizer isto, quem só vem corrigir a descrição
          não descobre que pode reabrir o lançamento marcando "já foi pago". */}
      {isEditing && isCancelled(values) && (
        <p
          role="status"
          className="rounded-xl border border-secondary/40 bg-light-secondary px-4 py-3 text-sm text-primary"
        >
          Este lançamento está <strong>cancelado</strong>. Salvar mantém o
          cancelamento; marcar que já foi liquidado o reabre como pago.
        </p>
      )}

      {/*
        O mesmo segmentado das abas da lista (`Segmented`), em modo `radio`:
        são duas opções que mudam o formulário inteiro, não um filtro. Some com
        `lockedKind` e na edição — mudar o tipo de um registro existente não é
        editar, é apagar de uma tabela e criar na outra.

        `shape="rounded"` é o formato da barra de filtros, onde este mesmo
        segmentado já aparece na tela de trás: em cápsula, a mesma peça tinha
        dois desenhos na mesma tela. `surface="page"` porque aqui o fundo é
        branco, e o trilho branco da barra sumiria.
      */}
      {!lockedKind && !isEditing && (
        <Segmented
          label="Tipo de lançamento"
          mode="radio"
          surface="page"
          size="lg"
          grow
          segments={[
            {
              id: "entrada",
              label: "Entrada",
              hint: "Honorário do escritório",
              active: kind === "entrada",
            },
            {
              id: "saida",
              label: "Saída",
              hint: "Despesa do escritório",
              active: kind === "saida",
            },
          ]}
          onPress={(id) => switchKind(id as EntryKind)}
        />
      )}

      {/*
        Os dois lados são formulários diferentes, com schemas diferentes — daí
        a bifurcação ser aqui, uma vez, e não campo a campo.
      */}
      {isIncome ? (
        <>
          {/* Entrada aqui é honorário: dinheiro do escritório. O que o cliente
              recebe do INSS fica em Pagamentos e não passa por este caixa. */}
          <p className="text-sm text-gray-100">
            Honorário, parecer avulso, reembolso. Não é o que o cliente recebe
            do INSS — isso fica em Pagamentos, e é dinheiro dele.
          </p>

          <FieldGrid compact={compact}>
            {/*
              Fora do schema porque é um campo na tela e dois valores no
              estado: o combo grava o nome que aparece e o id que vai no corpo.
              Sem asterisco — o cliente é opcional, e `incomeRules` concorda:
              nem toda receita vem de um (parecer avulso, reembolso).
            */}
            <ClientSearchField
              label="Cliente (opcional)"
              className="col-span-full"
              value={{
                clientId: income.values.clientId,
                clientName: income.values.clientName,
              }}
              onChange={(next) => {
                income.setField("clientId", next.clientId);
                income.setField("clientName", next.clientName);
                income.touchField("clientName");
              }}
              isDisabled={isSubmitting}
              errorMessage={income.errorOf("clientName")}
            />

            <SharedEntryFields
              form={income}
              isDisabled={isSubmitting}
              settledHintOn="Sim, entrou no caixa"
              settledHintOff="Ainda a receber"
            />
          </FieldGrid>
        </>
      ) : (
        <FieldGrid compact={compact}>
          <SchemaField form={expense} name="category" isDisabled={isSubmitting} />
          <SchemaField form={expense} name="supplier" isDisabled={isSubmitting} />

          <SharedEntryFields
            form={expense}
            isDisabled={isSubmitting}
            settledHintOn="Sim, saiu do caixa"
            settledHintOff="Ainda a pagar"
          />
        </FieldGrid>
      )}
    </div>
  );
}
