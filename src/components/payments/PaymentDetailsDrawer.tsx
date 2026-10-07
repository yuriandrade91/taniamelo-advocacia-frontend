"use client";

import { useState } from "react";

import Drawer from "@/components/ui/Drawer/Drawer";
import { DetailBento, DetailBentoSkeleton } from "@/components/wallet/DetailBento";
import { formatDateBR, formatInstallment } from "@/lib/format";
import { todayIso } from "@/lib/period";
import { createInFlight } from "@/lib/requestCache";
import { useRecordDetail } from "@/hooks/useRecordDetail";
import { getPayment } from "@/services/clientPaymentService";
import type { ClientPaymentResponse } from "@/interfaces/client/ClientSubResources.interface";
import { AgreementTotal } from "./AgreementTotal";
import { editWarning } from "./editWarning";
import { paymentFormFrom } from "./paymentForm";
import { PaymentFormFields } from "./PaymentFormFields";
import { useEditConfirmation } from "./useEditConfirmation";
import { usePaymentForm, type PaymentEditing } from "./usePaymentForm";

/**
 * Detalhe de uma parcela a receber do INSS — o mesmo painel da Carteira
 * (`EntryDetailsDrawer`), com o mesmo desenho bento.
 *
 * ## Por que busca pelo id, e não usa a linha da tabela
 *
 * A linha é o que a lista trouxe quando a página carregou; o detalhe é o que
 * está gravado **agora** — observação, quem lançou e quando nem sempre vêm na
 * lista. Por isso o `GET /clients/{clientId}/payments/{id}` sai no clique, um
 * por parcela aberta, e não um por linha da tabela.
 *
 * O `clientId` vai junto do id porque a parcela pertence ao cliente: a rota
 * de leitura avulsa é a do cliente, não a consolidada (`/payments`, que só
 * lista).
 *
 * Montado só com alvo: cada abertura é uma busca nova e um estado limpo.
 *
 * ## Editar acontece aqui dentro
 *
 * Como na Carteira: o painel já mostra a parcela, e abrir outra camada para
 * mudar o mesmo registro tirava o sentido de ter aberto o detalhe. "Marcar
 * como recebido" abre a mesma edição já com o recebimento marcado e a data de
 * hoje — a pessoa confere e salva; nada grava sozinho.
 */

export type PaymentDetailsTarget = {
  clientId: string;
  id: string;
  /** O payload por id não traz o nome do cliente; vem da linha. */
  clientName: string;
  /** Mostrado enquanto o detalhe carrega. */
  descricao: string;
};

/**
 * A mesma parcela pedida duas vezes ao mesmo tempo (o StrictMode monta o
 * painel duas vezes no dev, e um duplo clique faz o mesmo) é uma requisição
 * só. Terminada, a próxima busca o valor atual.
 */
const inFlight = createInFlight<ClientPaymentResponse | null>();

const fetchDetail = (
  target: PaymentDetailsTarget,
): Promise<ClientPaymentResponse | null> =>
  inFlight(`${target.clientId}:${target.id}`, () =>
    getPayment(target.clientId, target.id).then((envelope) => envelope.data ?? null),
  );

export function PaymentDetailsDrawer({
  target,
  onClose,
  onSaved,
  onViewClient,
}: {
  target: PaymentDetailsTarget;
  onClose: () => void;
  /** Depois de salvar uma edição: a página recarrega totais e lista. */
  onSaved?: () => void;
  /** Abre a ficha do cliente — a ação que antes era um botão na linha. */
  onViewClient?: () => void;
}) {
  const { detail, failed, reload } = useRecordDetail(
    `${target.clientId}:${target.id}`,
    () => fetchDetail(target),
  );
  const [mode, setMode] = useState<"view" | "edit" | "settle">("view");

  const editing: PaymentEditing | null =
    detail && mode !== "view"
      ? {
          clientId: target.clientId,
          payment: detail,
          values:
            mode === "settle"
              ? {
                  ...paymentFormFrom(detail),
                  isSettled: true,
                  paidDate: todayIso(),
                }
              : undefined,
        }
      : null;
  const form = usePaymentForm(editing);
  // Recebido ou cancelado: confirma antes de abrir a edição.
  const confirmEdit = useEditConfirmation();

  const save = async () => {
    const result = await form.submit();
    if (!result) return;
    if (result === "saved") {
      // Relê o registro: o painel mostra o que ficou gravado, não o que foi
      // digitado — o servidor recalcula status e atraso.
      await reload();
      onSaved?.();
    }
    setMode("view");
  };

  const isEditing = mode !== "view";

  return (
    <Drawer
      isOpen
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      // Editando, fechar (Esc, fundo, "Voltar") volta para o detalhe em vez
      // de fechar o painel e perder o contexto.
      confirmClose={isEditing}
      onRequestClose={() => setMode("view")}
      title={
        mode === "settle"
          ? "Registrar recebimento"
          : isEditing
            ? "Editar parcela"
            : "Detalhes da parcela"
      }
      description={
        isEditing
          ? `${target.clientName} — o que mudar aqui vale só para esta parcela.`
          : undefined
      }
      hideFooter={!isEditing}
      confirmLabel="Salvar alterações"
      cancelLabel="Voltar"
      onConfirm={() => void save()}
      isSubmitting={form.isSubmitting}
      dialogClassName="w-full sm:w-[520px]"
    >
      {failed ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-danger/20 bg-danger/5 px-6 py-10 text-center">
          <p className="text-sm font-medium text-primary">
            Não foi possível carregar esta parcela
          </p>
          <p className="text-xs text-gray-100/70">
            Feche o painel e tente de novo.
          </p>
        </div>
      ) : !detail ? (
        <DetailBentoSkeleton eyebrow="Parcela" partyLabel="Cliente" factLabels={["Vencimento", "Forma", "Lançado"]} />
      ) : isEditing ? (
        <PaymentFormFields form={form} />
      ) : (
        <DetailBento
          entry={detail}
          eyebrow={
            detail.installmentNumber && detail.installmentTotal
              ? `Parcela ${formatInstallment(detail.installmentNumber, detail.installmentTotal)}`
              : "Parcela"
          }
          party={{
            label: "Cliente",
            name: target.clientName || null,
            emptyText: "Sem cliente",
            action: onViewClient
              ? { label: "Ver ficha", onPress: onViewClient }
              : undefined,
          }}
          facts={[
            { label: "Vencimento", value: formatDateBR(detail.dueDate) },
            { label: "Forma", value: detail.paymentMethod ?? "—" },
            { label: "Lançado", value: formatDateBR(detail.createdAt) },
          ]}
          summary={
            // O valor grande é o desta parcela; aqui, o do acordo inteiro.
            <AgreementTotal
              clientId={target.clientId}
              payment={detail}
              size="md"
            />
          }
          settledStep="Recebido"
          settleLabel="Marcar como recebido"
          onEdit={() =>
            confirmEdit.request(editWarning(detail, "recebido"), () =>
              setMode("edit"),
            )
          }
          onSettle={() => setMode("settle")}
        />
      )}
      {confirmEdit.dialog}
    </Drawer>
  );
}
