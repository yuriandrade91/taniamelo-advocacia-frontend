"use client";

import { DetailBentoSkeleton } from "./DetailBento";
import { useState } from "react";
import { createInFlight } from "@/lib/requestCache";
import { useRecordDetail } from "@/hooks/useRecordDetail";

import { RecordDrawer } from "@/components/ui/drawer/RecordDrawer";
import { todayIso } from "@/lib/period";
import { getOfficeExpense } from "@/services/officeExpenseService";
import { getOfficeRevenue } from "@/services/officeRevenueService";
import type { OfficeExpenseResponse } from "@/interfaces/finance/OfficeExpense.interface";
import type { OfficeRevenueResponse } from "@/interfaces/finance/OfficeRevenue.interface";
import type { EntryKind } from "./entryForms";
import { EntryBentoView } from "./EntryBentoView";
import { EntryFormFields } from "./EntryFormFields";
import { useEntryForm, type EntryEditing } from "./useEntryForm";
import {
  expenseFormFrom,
  incomeFormFrom,
  type SharedValues,
} from "./entryForms";
import { editWarning } from "@/components/payments/editWarning";
import { useEditConfirmation } from "@/components/payments/useEditConfirmation";

/**
 * Detalhe de um lançamento da Carteira — entrada ou saída.
 *
 * ## Por que busca pelo id, e não usa a linha da tabela
 *
 * A linha é o que a lista trouxe quando a página carregou; o detalhe é o que
 * está gravado **agora**. Com o cache das listas, a linha pode ter minutos de
 * idade, e observação e datas de criação/alteração nem sempre vêm na lista.
 * Por isso o `GET /{id}` sai no clique — um por lançamento aberto, e não um
 * por linha da tabela: buscar as dez linhas de antemão seriam dez requisições
 * por página para detalhes que ninguém pediu.
 *
 * Drawer e não modal: "ver detalhe" é um aparte, e a convenção da casa (ver
 * `FormModal`) deixa a tabela à vista ao lado.
 *
 * Montado só com alvo: cada abertura é uma busca nova e um estado limpo, sem
 * o detalhe do lançamento anterior piscando antes do atual.
 *
 * ## Desenho
 *
 * Lido de cima para baixo na ordem das perguntas: **quanto e em que pé**
 * (valor grande, selo, frase de prazo), **quando** (linha do tempo lançado →
 * vencimento → pagamento), **com quem e como** (cartões), e só então o
 * texto livre. Editar e excluir ficam no rodapé, ao alcance de quem acabou
 * de conferir — os mesmos fluxos da tabela, não outros.
 */

export type EntryDetailsTarget = {
  kind: EntryKind;
  id: string;
  /** Mostrado no título enquanto o detalhe carrega. */
  description: string;
};

export type Detail =
  | { kind: "expense"; data: OfficeExpenseResponse }
  | { kind: "income"; data: OfficeRevenueResponse };

/**
 * O mesmo detalhe pedido duas vezes ao mesmo tempo (o StrictMode monta o
 * painel duas vezes no dev, e um duplo clique faz o mesmo) é uma requisição
 * só. Terminada, a próxima busca o valor atual — que é o motivo de buscar
 * pelo id.
 */
const inFlight = createInFlight<Detail | null>();

const fetchDetail = (target: EntryDetailsTarget): Promise<Detail | null> =>
  inFlight(`${target.kind}:${target.id}`, () =>
    target.kind === "expense"
      ? getOfficeExpense(target.id).then((envelope) =>
          envelope.data ? { kind: "expense" as const, data: envelope.data } : null,
        )
      : getOfficeRevenue(target.id).then((envelope) =>
          envelope.data ? { kind: "income" as const, data: envelope.data } : null,
        ),
  );

/**
 * Monta o `editing` do formulário a partir do detalhe carregado.
 *
 * Entrada e saída são tipos diferentes de valores, então a bifurcação é aqui:
 * o formulário recebe o lado já decidido, e não um objeto que serve para os
 * dois.
 */
function editingFrom(detail: Detail, mode: "edit" | "settle"): EntryEditing {
  // "Marcar como pago": a mesma edição, já com o pagamento marcado e a data
  // de hoje — a pessoa confere e salva; nada grava sozinho.
  const settled = <T extends SharedValues>(values: T): T =>
    mode === "settle" ? { ...values, isSettled: true, paidDate: todayIso() } : values;

  return detail.kind === "expense"
    ? {
        kind: "expense",
        id: detail.data.id,
        values: settled(expenseFormFrom(detail.data)),
        seed: mode,
      }
    : {
        kind: "income",
        id: detail.data.id,
        values: settled(incomeFormFrom(detail.data)),
        seed: mode,
      };
}

export function EntryDetailsDrawer({
  target,
  onClose,
  onSaved,
}: {
  target: EntryDetailsTarget;
  onClose: () => void;
  /** Depois de salvar uma edição: a página recarrega saldo e lista. */
  onSaved?: (kind: EntryKind) => void;
}) {
  const { detail, failed, reload } = useRecordDetail(
    `${target.kind}:${target.id}`,
    () => fetchDetail(target),
  );
  /**
   * Editar acontece aqui dentro, e não num modal por cima: o painel já está
   * mostrando o lançamento, e abrir outra camada para mudar o mesmo registro
   * tirava o sentido de ter aberto o detalhe.
   */
  const [mode, setMode] = useState<"view" | "edit" | "settle">("view");

  // `seed` leva o modo junto: sem ele, sair de "editar" e entrar em "marcar
  // como pago" reusaria os valores da primeira abertura — a chave (tipo + id)
  // seria a mesma.
  const editing = detail && mode !== "view" ? editingFrom(detail, mode) : null;
  const form = useEntryForm({ editing });

  const backToView = () => {
    form.reset();
    setMode("view");
  };

  const save = async () => {
    const saved = await form.submit();
    if (!saved) return;
    // Relê o registro: o painel mostra o que ficou gravado, não o que foi
    // digitado — o servidor recalcula status e atraso.
    await reload();
    backToView();
    onSaved?.(saved);
  };

  const isEditing = mode !== "view";
  // Recebido/pago ou cancelado: confirma antes de abrir a edição.
  const confirmEdit = useEditConfirmation();
  const isIncome = target.kind === "income";

  return (
    <RecordDrawer
      onClose={onClose}
      onBack={backToView}
      isEditing={isEditing}
      title={
        mode === "settle"
          ? isIncome
            ? "Registrar recebimento"
            : "Registrar pagamento"
          : isEditing
            ? isIncome
              ? "Editar entrada"
              : "Editar saída"
            : "Detalhes do lançamento"
      }
      description="O registro é substituído pelo que estiver aqui ao salvar."
      onSave={() => void save()}
      isSubmitting={form.isSubmitting}
      failed={failed}
      failedText="Não foi possível carregar este lançamento"
      isLoading={!detail}
      skeleton={
        <DetailBentoSkeleton
          eyebrow={isIncome ? "Entrada" : "Saída"}
          partyLabel={isIncome ? "Cliente" : "Fornecedor"}
          factLabels={["Vencimento", "Forma", isIncome ? "Lançado" : "Categoria"]}
        />
      }
      editor={<EntryFormFields form={form} compact />}
      dialogs={confirmEdit.dialog}
    >
      {detail && (
        <EntryBentoView
          detail={detail}
          onEdit={() =>
            confirmEdit.request(
              editWarning(
                detail.data,
                detail.kind === "income" ? "recebido" : "pago",
              ),
              () => setMode("edit"),
            )
          }
          onSettle={() => setMode("settle")}
        />
      )}
    </RecordDrawer>
  );
}
