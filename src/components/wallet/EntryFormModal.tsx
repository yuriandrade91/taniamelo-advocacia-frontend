"use client";

import { useEffect, useState } from "react";
import { ComboBox, Input, Label, ListBox } from "@heroui/react";

import FormModal from "@/components/ui/modals/FormModal/FormModal";
import { Field, SelectField } from "@/components/ui/form/Field";
import { toSelectOptions } from "@/components/ui/form/options";
import { useClientSearch } from "@/hooks/useClientSearch";
import { ExpenseCategoryOptions } from "@/enums/expenseCategory/ExpenseCategory";
import {
  createOfficeExpense,
  updateOfficeExpense,
} from "@/services/officeExpenseService";
import {
  createOfficeRevenue,
  updateOfficeRevenue,
} from "@/services/officeRevenueService";

import { SharedEntryFields } from "./SharedEntryFields";
import {
  carryShared,
  emptyExpenseForm,
  emptyIncomeForm,
  estaCancelado,
  hasErrors,
  toExpenseRequest,
  toRevenueRequest,
  validateExpenseForm,
  validateIncomeForm,
  type EntryKind,
  type ExpenseFormValues,
  type IncomeFormValues,
  type SharedValues,
} from "./entryForms";

/**
 * Registro de lançamento na Carteira — entrada ou saída, um modal só.
 *
 * ## Por que um botão e não dois
 *
 * Dois botões no cabeçalho obrigam a decidir o tipo antes de saber o que a
 * tela vai pedir, e transformam "errei o tipo" em fechar e recomeçar. Com o
 * tipo *dentro* do formulário, trocar é um clique — e o que já foi digitado
 * nos campos comuns atravessa, via `carryShared`.
 *
 * Os campos próprios de cada lado **não** atravessam, e cada estado é
 * preservado no seu canto: cliente não vira fornecedor (são coisas
 * diferentes, não traduções), mas quem voltar para "entrada" reencontra o
 * cliente que já tinha escolhido.
 *
 * ## As duas metades são do escritório
 *
 * Entrada é **honorário** (`POST /api/v1/revenues`); saída é despesa
 * (`POST /api/v1/expenses`). Nenhuma das duas existe no backend ainda.
 *
 * O que **não** entra aqui é o dinheiro que o INSS paga ao cliente: aquilo é
 * `client_payments` e vive na tela de Pagamentos. Este formulário chegou a
 * gravar lá, e o efeito era honorário somando como benefício do cliente, sem
 * nada na tabela que permitisse separar depois.
 */

export type EntryFormModalProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  /** Chamado após gravar, para a página recarregar os números. */
  onSaved: () => void;
  /** Tipo pré-selecionado ao abrir. */
  initialKind?: EntryKind;
  /**
   * Fixa o tipo e esconde o seletor.
   *
   * É o que a tela de Pagamentos usa: lá só existe recebimento de cliente —
   * despesa do escritório é assunto da Carteira. Mostrar um seletor com uma
   * opção que não pertence àquela tela convidaria a lançar no lugar errado.
   */
  lockedKind?: EntryKind;
  /**
   * Lançamento em edição. Presente, o modal vira "Editar" e faz PUT no id em
   * vez de POST; ausente, é cadastro novo.
   *
   * O tipo vem junto porque receita e despesa moram em rotas diferentes e o
   * id sozinho não diz em qual. Durante a edição o seletor some: mudar
   * "entrada" para "saída" num registro existente não é editar, é apagar de
   * uma tabela e criar na outra — e o botão não diz isso.
   */
  editing?: { kind: EntryKind; id: string; values: SharedValues } | null;
};

const KINDS: { id: EntryKind; label: string; hint: string }[] = [
  { id: "entrada", label: "Entrada", hint: "Honorário do escritório" },
  { id: "saida", label: "Saída", hint: "Despesa do escritório" },
];

export function EntryFormModal({
  isOpen,
  onOpenChange,
  onSaved,
  initialKind = "entrada",
  lockedKind,
  editing = null,
}: EntryFormModalProps) {
  const isEditing = editing !== null;
  const [kind, setKind] = useState<EntryKind>(lockedKind ?? initialKind);
  const [income, setIncome] = useState<IncomeFormValues>(emptyIncomeForm);
  const [expense, setExpense] = useState<ExpenseFormValues>(emptyExpenseForm);
  const [revealed, setRevealed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Carrega o registro quando a edição abre.
   *
   * Depende do id, e não do objeto: quem chama monta `editing` a cada render,
   * e depender da referência sobrescreveria o que a pessoa está digitando a
   * cada re-render da página.
   */
  useEffect(() => {
    if (!editing) return;
    setKind(editing.kind);
    setRevealed(false);
    if (editing.kind === "entrada") {
      setIncome(editing.values as IncomeFormValues);
    } else {
      setExpense(editing.values as ExpenseFormValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing?.id, editing?.kind]);

  const isIncome = kind === "entrada";
  const values: SharedValues = isIncome ? income : expense;
  const errors = isIncome
    ? validateIncomeForm(income)
    : validateExpenseForm(expense);
  const errorOf = (key: string) =>
    revealed ? (errors as Record<string, string | undefined>)[key] : undefined;

  const setShared = <K extends keyof SharedValues>(
    key: K,
    value: SharedValues[K],
  ) => {
    if (isIncome) setIncome((current) => ({ ...current, [key]: value }));
    else setExpense((current) => ({ ...current, [key]: value }));
  };

  /**
   * Troca de tipo. Leva o núcleo comum e zera os erros revelados: as regras do
   * outro lado são outras, e manter os avisos anteriores acusaria campos que
   * nem estão mais na tela.
   */
  const switchKind = (next: EntryKind) => {
    if (next === kind) return;
    if (next === "saida") setExpense((current) => carryShared(current, income));
    else setIncome((current) => carryShared(current, expense));
    setRevealed(false);
    setKind(next);
  };

  const { suggestions } = useClientSearch({
    query: income.clientName,
    linkedClientId: income.clientId,
    enabled: isOpen && isIncome && !isSubmitting,
  });

  const close = () => {
    setIncome(emptyIncomeForm());
    setExpense(emptyExpenseForm());
    setKind(lockedKind ?? initialKind);
    setRevealed(false);
    onOpenChange(false);
  };

  const handleConfirm = async () => {
    setRevealed(true);
    if (hasErrors(errors)) return;

    setIsSubmitting(true);
    try {
      if (isEditing) {
        if (isIncome) {
          await updateOfficeRevenue(editing.id, toRevenueRequest(income));
        } else {
          await updateOfficeExpense(editing.id, toExpenseRequest(expense));
        }
      } else if (isIncome) {
        await createOfficeRevenue(toRevenueRequest(income));
      } else {
        await createOfficeExpense(toExpenseRequest(expense));
      }
      onSaved();
      close();
    } catch {
      // O axiosService já mostrou o erro da requisição.
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormModal
      isOpen={isOpen}
      onOpenChange={(open) => (open ? onOpenChange(true) : close())}
      title={
        isEditing
          ? isIncome
            ? "Editar entrada"
            : "Editar saída"
          : lockedKind === "entrada"
            ? "Lançar cobrança"
            : "Novo lançamento"
      }
      description={
        isEditing
          ? "O registro é substituído pelo que estiver aqui ao salvar."
          : lockedKind === "entrada"
            ? "Uma parcela de honorários. Nasce a vencer, a menos que já tenha sido recebida."
            : "O caixa do mês conta pelo que foi efetivamente pago ou recebido."
      }
      size="lg"
      confirmLabel={
        isEditing ? "Salvar" : isIncome ? "Lançar receita" : "Lançar saída"
      }
      onConfirm={handleConfirm}
      isSubmitting={isSubmitting}
    >
      <div className="flex flex-col gap-4">
        {/*
          Segmentado, e não um `select`: são duas opções que mudam o
          formulário inteiro. Escondê-las atrás de um menu faria a tela mudar
          "sozinha" depois de um clique em outro lugar.

          Com `lockedKind` ele some — não fica desabilitado. Um controle
          travado ainda ocupa espaço e sugere que existe uma escolha ali.
        */}
        {/* Cancelado não tem caixa que o represente, e o PUT substitui o
            registro inteiro: sem dizer isto, quem só vem corrigir a descrição
            não descobre que pode reabrir o lançamento marcando "já foi pago". */}
        {isEditing && estaCancelado(values) && (
          <p
            role="status"
            className="rounded-xl border border-secondary/40 bg-light-secondary px-4 py-3 text-sm text-primary"
          >
            Este lançamento está <strong>cancelado</strong>. Salvar mantém o
            cancelamento; marcar que já foi liquidado o reabre como pago.
          </p>
        )}

        {!lockedKind && !isEditing && (
        <div
          role="radiogroup"
          aria-label="Tipo de lançamento"
          className="grid grid-cols-2 gap-2 rounded-xl bg-light-gray/50 p-1"
        >
          {KINDS.map((option) => {
            const isActive = option.id === kind;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={isActive}
                disabled={isSubmitting}
                onClick={() => switchKind(option.id)}
                className={`rounded-lg px-3 py-2 text-left transition-colors ${
                  isActive
                    ? "bg-white text-primary shadow-sm"
                    : "text-gray-100 hover:bg-white/50"
                }`}
              >
                <span className="block text-sm font-medium">{option.label}</span>
                <span className="block text-xs text-gray-100">{option.hint}</span>
              </button>
            );
          })}
        </div>
        )}

        {isIncome ? (
          <>
            {/* Entrada aqui é honorário: dinheiro do escritório. O que o
                cliente recebe do INSS fica em Pagamentos e não passa por este
                caixa — as duas coisas têm o mesmo formato, e é por isso que o
                aviso vale a linha que ocupa. */}
            <p className="text-sm text-gray-100">
              Honorário, parecer avulso, reembolso. Não é o que o cliente recebe
              do INSS — isso fica em Pagamentos, e é dinheiro dele.
            </p>

            {/* Opcional: nem toda receita vem de cliente (parecer avulso,
                reembolso, rendimento). */}
            <div>
              <ComboBox
                inputValue={income.clientName}
                onInputChange={(text) => {
                  setIncome((current) => ({
                    ...current,
                    clientName: text,
                    // Editar o texto desfaz o vínculo: o nome na tela e o id
                    // enviado não podem divergir sem ninguém notar.
                    clientId: current.clientId ? "" : current.clientId,
                  }));
                }}
                onSelectionChange={(key) => {
                  const match = suggestions.find((c) => c.id === String(key));
                  if (match?.id) {
                    setIncome((current) => ({
                      ...current,
                      clientId: match.id ?? "",
                      clientName: match.fullName,
                    }));
                  }
                }}
                allowsCustomValue
                allowsEmptyCollection
                isInvalid={!!errorOf("clientName")}
                isDisabled={isSubmitting}
              >
                {/* Sem asterisco: o cliente É opcional, e `validateIncomeForm`
                    concorda — nem toda receita vem de cliente (parecer avulso,
                    reembolso). O `isRequired` que estava aqui vinha de quando
                    isto gravava em `client_payments`, onde a FK obrigava. Um
                    asterisco que a validação não cobra ensina a desconfiar de
                    todos os outros. */}
                <Label
                  className="text-secondary"
                  isInvalid={!!errorOf("clientName")}
                >
                  Cliente (opcional)
                </Label>
                <ComboBox.InputGroup>
                  <Input
                    placeholder="Nome da pessoa"
                    className="form-border-style"
                  />
                </ComboBox.InputGroup>
                <ComboBox.Popover>
                  <ListBox
                    renderEmptyState={() => (
                      <div className="px-3 py-2 text-sm text-gray-100/60">
                        Nenhum cliente cadastrado com esse nome.
                      </div>
                    )}
                  >
                    {suggestions.map((client) => (
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
              {errorOf("clientName") ? (
                <p className="mt-1 text-sm text-danger">
                  {errorOf("clientName")}
                </p>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField
                label="Categoria"
                options={toSelectOptions(ExpenseCategoryOptions)}
                selectedKey={expense.category || null}
                onSelectionChange={(key) =>
                  setExpense((current) => ({ ...current, category: key }))
                }
                placeholder="Selecione"
                isDisabled={isSubmitting}
              />
              <Field
                label="Fornecedor"
                value={expense.supplier}
                onChange={(event) =>
                  setExpense((current) => ({
                    ...current,
                    supplier: event.target.value,
                  }))
                }
                placeholder="Imobiliária Central"
                isDisabled={isSubmitting}
              />
            </div>
          </>
        )}

        <SharedEntryFields
          values={values}
          onChange={setShared}
          errorOf={errorOf}
          isDisabled={isSubmitting}
          descriptionPlaceholder={
            isIncome
              ? "Honorários — 30% dos atrasados"
              : "Aluguel da sala — setembro"
          }
          settledLabel={isIncome ? "Já foi recebido?" : "Já foi paga?"}
          settledHintOn={isIncome ? "Sim, entrou no caixa" : "Sim, saiu do caixa"}
          settledHintOff={isIncome ? "Ainda a receber" : "Ainda a pagar"}
          settledDateLabel={
            isIncome ? "Data do recebimento" : "Data do pagamento"
          }
          paymentMethodLabel={
            isIncome ? "Forma de recebimento" : "Forma de pagamento"
          }
        />

      </div>
    </FormModal>
  );
}
