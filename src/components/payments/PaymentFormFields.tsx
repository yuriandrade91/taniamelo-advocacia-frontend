"use client";

import { FieldGrid } from "@/components/ui/form/FieldGrid";
import { SchemaField } from "@/components/ui/form/SchemaFields";
import { SharedEntryFields } from "@/components/wallet/SharedEntryFields";
import { PaymentStatusLabelByKey } from "@/enums/payment/Payment";
import { installmentStatus } from "./paymentForm";
import type { PaymentForm } from "./usePaymentForm";

/**
 * Os campos da parcela — o mesmo desenho no modal de edição e dentro do
 * painel de detalhes. Estado e envio ficam em `usePaymentForm`, e o que cada
 * campo é está em `paymentSchema`.
 *
 * Reaproveita `SharedEntryFields` da Carteira: descrição, valor, vencimento,
 * "já foi recebido", data, forma e observações são os mesmos sete campos, na
 * mesma ordem. O que é só daqui — número e total da parcela — fica aqui.
 */
export function PaymentFormFields({ form }: { form: PaymentForm }) {
  const { isSubmitting } = form;
  const cancelled =
    installmentStatus(form.values) === PaymentStatusLabelByKey.CANCELADO;

  return (
    <div className="flex flex-col gap-4">
      {cancelled && (
        <p
          role="status"
          className="rounded-xl border border-secondary/40 bg-light-secondary px-4 py-3 text-sm text-primary"
        >
          Esta parcela está <strong>cancelada</strong>. Salvar mantém o
          cancelamento; marcar que já foi recebida a reabre.
        </p>
      )}

      <FieldGrid>
        <SharedEntryFields
          form={form}
          isDisabled={isSubmitting}
          settledHintOn="O crédito caiu na conta do cliente."
          settledHintOff="Ainda a receber."
        />

        <SchemaField form={form} name="installmentNumber" isDisabled={isSubmitting} />
        <SchemaField form={form} name="installmentTotal" isDisabled={isSubmitting} />
      </FieldGrid>
    </div>
  );
}
