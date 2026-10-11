"use client";

import FormModal from "@/components/ui/modals/FormModal";
import { EntryFormFields } from "./EntryFormFields";
import { useEntryForm, type EntryEditing } from "./useEntryForm";
import type { EntryKind } from "./entryForms";

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

/*
 * Estado e envio moram em `useEntryForm`, e os campos em `EntryFormFields` —
 * os mesmos que a edição dentro do painel de detalhes usa. Este componente só
 * põe a moldura de modal em volta.
 */

export type EntryFormModalProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  /** Chamado após gravar, para a página recarregar os números. */
  /** Recebe o tipo gravado, para a tela abrir na aba onde ele aparece. */
  onSaved: (kind: EntryKind) => void;
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
  editing?: EntryEditing | null;
};

export function EntryFormModal({
  isOpen,
  onOpenChange,
  onSaved,
  initialKind = "income",
  lockedKind,
  editing = null,
}: EntryFormModalProps) {
  const form = useEntryForm({
    initialKind,
    lockedKind,
    editing,
  });
  const { isEditing, isIncome, isSubmitting } = form;

  const close = () => {
    form.reset();
    onOpenChange(false);
  };

  const handleConfirm = async () => {
    const saved = await form.submit();
    if (!saved) return;
    onSaved(saved);
    close();
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
          : lockedKind === "income"
            ? "Lançar cobrança"
            : "Novo lançamento"
      }
      description={
        isEditing
          ? "O registro é substituído pelo que estiver aqui ao salvar."
          : lockedKind === "income"
            ? "Uma parcela de honorários. Nasce a vencer, a menos que já tenha sido recebida."
            : "O caixa do mês conta pelo que foi efetivamente pago ou recebido."
      }
      size="lg"
      // O modelo de botões do painel de detalhes, que a Carteira já usa na
      // lista — a modal fala a mesma língua da tela que a abre.
      actions="pill"
      confirmLabel={
        isEditing ? "Salvar" : isIncome ? "Lançar receita" : "Lançar saída"
      }
      onConfirm={handleConfirm}
      isSubmitting={isSubmitting}
    >
      <EntryFormFields form={form} />
    </FormModal>
  );
}
