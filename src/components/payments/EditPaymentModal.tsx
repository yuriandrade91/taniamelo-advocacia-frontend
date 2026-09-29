"use client";

import { useEffect, useState } from "react";

import FormModal from "@/components/ui/modals/FormModal/FormModal";
import { Field } from "@/components/ui/form/Field";
import { SharedEntryFields } from "@/components/wallet/SharedEntryFields";
import { patchPayment } from "@/services/clientPaymentService";
import { notificationCenter } from "@/services/notificationService";
import {
  paymentFormFrom,
  patchVazio,
  statusDaParcela,
  temErroDeParcela,
  toPaymentPatch,
  validatePaymentForm,
  type PaymentFormValues,
} from "./paymentForm";
import { PaymentStatusLabelByKey } from "@/enums/payment/Payment";
import type { SharedValues } from "@/components/wallet/entryForms";
import type { OfficePaymentResponse } from "@/interfaces/payment/OfficePayment.interface";

/**
 * Editar uma parcela a receber.
 *
 * Separado do `RegisterReceiptModal` de propósito. Aquele responde uma
 * pergunta só — "quando entrou?" — e é o que se usa dezenas de vezes por mês;
 * este mexe em valor, vencimento e parcela, que é raro e merece atrito. Juntar
 * os dois faria a ação comum passar por um formulário inteiro.
 *
 * Reaproveita `SharedEntryFields` da Carteira: descrição, valor, vencimento,
 * "já foi recebido", data, forma e observações são os mesmos sete campos com
 * os mesmos rótulos. O que é só daqui — número e total da parcela — fica
 * aqui.
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
  const [values, setValues] = useState<PaymentFormValues | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Depende do id, e não do objeto: a página remonta a linha a cada carga, e
  // depender da referência apagaria o que a pessoa está digitando.
  useEffect(() => {
    if (!payment) {
      setValues(null);
      return;
    }
    setValues(paymentFormFrom(payment));
    setRevealed(false);
  }, [payment?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!payment || !values) return null;

  const errors = validatePaymentForm(values);
  const errorOf = (key: string) =>
    revealed ? (errors as Record<string, string | undefined>)[key] : undefined;

  const setShared = <K extends keyof SharedValues>(
    key: K,
    value: SharedValues[K],
  ) => setValues((atual) => (atual ? { ...atual, [key]: value } : atual));

  const setCampo = (key: keyof PaymentFormValues, value: string) =>
    setValues((atual) => (atual ? { ...atual, [key]: value } : atual));

  const handleConfirm = async () => {
    setRevealed(true);
    if (temErroDeParcela(errors)) return;

    const patch = toPaymentPatch(values, payment);
    if (patchVazio(patch)) {
      // Sucesso sem mudança ensina a clicar em "Salvar" por reflexo só para
      // conferir se salvou.
      notificationCenter.info("Nada foi alterado.");
      onClose();
      return;
    }

    setIsSubmitting(true);
    try {
      await patchPayment(payment.clientId, payment.id, patch);
      notificationCenter.success("Parcela atualizada.");
      onSaved();
      onClose();
    } catch {
      // O axiosService já mostrou o erro da requisição.
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelada =
    statusDaParcela(values) === PaymentStatusLabelByKey.CANCELADO;

  return (
    <FormModal
      isOpen
      onOpenChange={(open) => {
        if (!open && !isSubmitting) onClose();
      }}
      title="Editar parcela"
      description={`${payment.clientName} — o que mudar aqui vale só para esta parcela.`}
      size="lg"
      confirmLabel="Salvar"
      onConfirm={handleConfirm}
      isSubmitting={isSubmitting}
    >
      <div className="flex flex-col gap-4">
        {cancelada && (
          <p
            role="status"
            className="rounded-xl border border-secondary/40 bg-light-secondary px-4 py-3 text-sm text-primary"
          >
            Esta parcela está <strong>cancelada</strong>. Salvar mantém o
            cancelamento; marcar que já foi recebida a reabre.
          </p>
        )}

        <SharedEntryFields
          values={values}
          onChange={setShared}
          errorOf={errorOf}
          isDisabled={isSubmitting}
          descriptionPlaceholder="Atrasados da concessão, benefício de março…"
          settledLabel="Já foi recebido"
          settledHintOn="O crédito caiu na conta do cliente."
          settledHintOff="Ainda a receber."
          settledDateLabel="Data do recebimento"
          paymentMethodLabel="Forma de recebimento"
        />

        {/* Só daqui: parcela é do contrato do cliente, não do caixa do
            escritório. Os dois campos andam juntos — "3/2" é o erro que passa
            despercebido porque parece plausível na tabela. */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Parcela"
            type="number"
            value={values.installmentNumber}
            onChange={(e) => setCampo("installmentNumber", e.target.value)}
            isInvalid={Boolean(errorOf("installmentNumber"))}
            errorMessage={errorOf("installmentNumber")}
            isDisabled={isSubmitting}
          />
          <Field
            label="Total de parcelas"
            type="number"
            value={values.installmentTotal}
            onChange={(e) => setCampo("installmentTotal", e.target.value)}
            isDisabled={isSubmitting}
          />
        </div>
      </div>
    </FormModal>
  );
}
