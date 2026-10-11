"use client";

import { useState } from "react";
import { useSectionForm } from "@/hooks/useSectionForm";
import {
  createOfficeExpense,
  updateOfficeExpense,
} from "@/services/officeExpenseService";
import {
  createOfficeRevenue,
  updateOfficeRevenue,
} from "@/services/officeRevenueService";
import {
  carryShared,
  emptyExpenseForm,
  emptyIncomeForm,
  expenseRules,
  expenseSchema,
  incomeRules,
  incomeSchema,
  toExpenseRequest,
  toRevenueRequest,
  type EntryKind,
  type ExpenseFormValues,
  type IncomeFormValues,
  type SharedValues,
} from "./entryForms";

/**
 * Estado, validação e envio do formulário de lançamento — entrada ou saída.
 *
 * Saiu do `EntryFormModal` quando a edição passou a acontecer também **dentro
 * do painel de detalhes**. Duas cópias desta lógica seriam dois lugares para
 * a regra do PUT (que substitui o registro inteiro e precisa carregar o
 * status) divergir; aqui ela existe uma vez, e o modal e o painel só desenham.
 *
 * ## Dois formulários, não um com `if`
 *
 * Entrada e saída são dois `useSectionForm` vivos ao mesmo tempo, cada um com
 * o seu schema. É o que faz "errei o tipo" custar um clique: quem volta para
 * "entrada" reencontra o cliente que já tinha escolhido, porque aquele estado
 * nunca foi apagado — só o núcleo comum atravessa, por `carryShared`.
 */

/**
 * Lançamento em edição. Discrimina pelo tipo porque receita e despesa moram em
 * rotas (e schemas) diferentes, e o id sozinho não diz em qual.
 */
export type EntryEditing = (
  | { kind: "income"; values: IncomeFormValues }
  | { kind: "expense"; values: ExpenseFormValues }
) & {
  id: string;
  /**
   * Distingue dois modos de editar o mesmo registro — a edição comum e o
   * "marcar como pago", que abre os mesmos campos já preenchidos. Sem isto a
   * chave seria a mesma (tipo + id) e o segundo reusaria os valores do
   * primeiro.
   */
  seed?: string;
};

export function useEntryForm({
  initialKind = "income",
  lockedKind,
  editing = null,
}: {
  initialKind?: EntryKind;
  lockedKind?: EntryKind;
  /** Lançamento em edição: PUT no id. Ausente, é cadastro novo (POST). */
  editing?: EntryEditing | null;
}) {
  const isEditing = editing !== null;
  const [kind, setKind] = useState<EntryKind>(lockedKind ?? initialKind);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /*
   * `rules` acrescenta ao schema o que ele não descreve: a data da liquidação
   * (que só é exigida com a caixa marcada) e o cliente (que é um campo na tela
   * e dois no estado).
   */
  const income = useSectionForm({
    schema: incomeSchema,
    initial: emptyIncomeForm(),
    rules: incomeRules(),
  });
  const expense = useSectionForm({
    schema: expenseSchema,
    initial: emptyExpenseForm(),
    rules: expenseRules(),
  });

  const isIncome = kind === "income";
  const active = isIncome ? income : expense;
  const values: SharedValues = active.values;

  /**
   * Carrega o registro quando a edição abre — por chave, e não pelo objeto:
   * quem chama monta `editing` a cada render, e depender da referência
   * sobrescreveria o que a pessoa está digitando. Ajuste no render: o
   * formulário já abre preenchido.
   */
  const seedKey = editing
    ? `${editing.kind}:${editing.id}:${editing.seed ?? ""}`
    : null;
  const [seededKey, setSeededKey] = useState<string | null>(null);
  if (seedKey !== seededKey) {
    setSeededKey(seedKey);
    if (editing) {
      setKind(editing.kind);
      if (editing.kind === "income") income.reset(editing.values);
      else expense.reset(editing.values);
    }
  }

  /**
   * Troca de tipo. Leva o núcleo comum e zera os erros revelados: as regras do
   * outro lado são outras, e manter os avisos anteriores acusaria campos que
   * nem estão mais na tela.
   */
  const switchKind = (next: EntryKind) => {
    if (next === kind) return;
    if (next === "expense") expense.reset(carryShared(expense.values, income.values));
    else income.reset(carryShared(income.values, expense.values));
    setKind(next);
  };

  const reset = () => {
    income.reset();
    expense.reset();
    setKind(lockedKind ?? initialKind);
  };

  /**
   * Valida e grava. Devolve o tipo gravado, ou `null` se não gravou — por
   * erro de validação (que fica revelado na tela) ou da requisição (o
   * axiosService já mostrou o toast).
   */
  const submit = async (): Promise<EntryKind | null> => {
    if (!active.revealErrors()) return null;

    setIsSubmitting(true);
    try {
      if (editing) {
        if (isIncome) {
          await updateOfficeRevenue(editing.id, toRevenueRequest(income.values));
        } else {
          await updateOfficeExpense(editing.id, toExpenseRequest(expense.values));
        }
      } else if (isIncome) {
        await createOfficeRevenue(toRevenueRequest(income.values));
      } else {
        await createOfficeExpense(toExpenseRequest(expense.values));
      }
      return kind;
    } catch {
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    kind,
    isIncome,
    isEditing,
    lockedKind,
    income,
    expense,
    values,
    switchKind,
    isSubmitting,
    submit,
    reset,
  };
}

export type EntryForm = ReturnType<typeof useEntryForm>;
