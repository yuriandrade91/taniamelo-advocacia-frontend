"use client";

import FormModal from "@/components/ui/modals/FormModal";
import { PaymentFormFields } from "./PaymentFormFields";
import { usePaymentForm } from "./usePaymentForm";
import type { OfficePaymentResponse } from "@/interfaces/payment/OfficePayment.interface";

/**
 * Editar uma parcela a receber.
 *
 * Separado do `RegisterReceiptModal` de propósito. Aquele responde uma
 * pergunta só — "quando entrou?" — e é o que se usa dezenas de vezes por mês;
 * este mexe em valor, vencimento e parcela, que é raro e merece atrito. Juntar
 * os dois faria a ação comum passar por um formulário inteiro.
 *
 * Estado e envio em `usePaymentForm`, campos em `PaymentFormFields` — os
 * mesmos da edição dentro do painel de detalhes.
 */

export type EditPaymentModalProps = {
  /** Parcela em edição. `null` mantém o modal fechado. */
  payment: OfficePaymentResponse | null;
  onClose: () => void;
  onSaved: () => void;
};

export function EditPaymentModal({
  payment,
  onClose,
  onSaved,
}: EditPaymentModalProps) {
  const form = usePaymentForm(
    payment ? { clientId: payment.clientId, payment } : null,
  );

  if (!payment) return null;

  const handleConfirm = async () => {
    const result = await form.submit();
    if (result === "saved") onSaved();
    if (result) onClose();
  };

  return (
    <FormModal
      isOpen
      onOpenChange={(open) => {
        if (!open && !form.isSubmitting) onClose();
      }}
      title="Editar parcela"
      description={`${payment.clientName} — o que mudar aqui vale só para esta parcela.`}
      size="lg"
      // O rodapé em cápsula da Carteira, como as outras modais de lançamento.
      actions="pill"
      confirmLabel="Salvar"
      onConfirm={handleConfirm}
      isSubmitting={form.isSubmitting}
    >
      <PaymentFormFields form={form} />
    </FormModal>
  );
}
