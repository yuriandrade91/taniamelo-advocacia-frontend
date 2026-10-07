"use client";

import { useState } from "react";

import FormModal from "@/components/ui/modals/FormModal/FormModal";
import {
  DatePickerField,
  Field,
  SwitchField,
  TextAreaField,
} from "@/components/ui/form/Field";
import { AmountField } from "@/components/ui/form/AmountField";
import { ClientSearchField } from "@/components/ui/form/ClientSearchField";
import { FieldGrid } from "@/components/ui/form/FieldGrid";
import { useFieldErrors } from "@/hooks/useFieldErrors";
import { createPayment, patchPayment } from "@/services/clientPaymentService";
import { notificationCenter } from "@/services/notificationService";
import {
  emptyBenefitPayment,
  hasErrors,
  toBenefitPaymentRequest,
  toBenefitReceivedPatch,
  validateBenefitPayment,
  type BenefitPaymentValues,
} from "./benefitPaymentForm";

/**
 * Lançar um valor que o cliente tem a receber do INSS.
 *
 * ## Duas requisições, e por quê
 *
 * `POST /clients/{id}/payments` cria a parcela sempre como PENDENTE — o DTO
 * não tem `paidDate`. Então "o cliente já recebeu" custa um `PATCH` depois. Se
 * o PATCH falhar, a parcela **existe** e está pendente; a mensagem diz isso em
 * vez de "erro ao salvar", porque a diferença decide o que a pessoa faz em
 * seguida — marcar como recebido, e não lançar de novo.
 *
 * ## Cliente obrigatório
 *
 * `client_payments` pendura em `clients` por FK: sem cliente não há URL para
 * onde postar.
 */

export type BenefitPaymentModalProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSaved: () => void;
};

export function BenefitPaymentModal({
  isOpen,
  onOpenChange,
  onSaved,
}: BenefitPaymentModalProps) {
  const [values, setValues] = useState<BenefitPaymentValues>(emptyBenefitPayment);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const errors = validateBenefitPayment(values);
  const fieldErrors = useFieldErrors(errors);
  const errorOf = (key: keyof BenefitPaymentValues) => fieldErrors.errorOf(key);

  const set = <K extends keyof BenefitPaymentValues>(key: K, value: BenefitPaymentValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    fieldErrors.touch(key);
  };

  const close = () => {
    setValues(emptyBenefitPayment());
    fieldErrors.reset();
    onOpenChange(false);
  };

  const handleConfirm = async () => {
    if (!fieldErrors.revealAll() || hasErrors(errors)) return;

    setIsSubmitting(true);
    try {
      const created = await createPayment(
        values.clientId,
        toBenefitPaymentRequest(values),
      );
      const paymentId = created?.data?.id;
      const patch = toBenefitReceivedPatch(values);

      if (patch && paymentId) {
        try {
          await patchPayment(values.clientId, paymentId, patch);
          notificationCenter.success("Valor lançado e marcado como recebido.");
        } catch {
          notificationCenter.warning(
            "Valor lançado, mas não foi possível marcá-lo como recebido. Ele ficou como a receber.",
          );
        }
      } else {
        notificationCenter.success("Valor a receber lançado.");
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
      title="Lançar valor a receber"
      description="Um valor que o INSS vai pagar ao cliente — atrasados, benefício mensal, parcela de acordo."
      size="lg"
      // O rodapé em cápsula da Carteira, como as outras modais de lançamento.
      actions="pill"
      confirmLabel="Lançar"
      onConfirm={handleConfirm}
      isSubmitting={isSubmitting}
    >
      <FieldGrid>
        <ClientSearchField
          className="col-span-full"
          value={{ clientId: values.clientId, clientName: values.clientName }}
          onChange={(next) => {
            set("clientId", next.clientId);
            set("clientName", next.clientName);
          }}
          isRequired
          isDisabled={isSubmitting}
          errorMessage={errorOf("clientName")}
        />

        <Field
          label="Descrição"
          className="col-span-full"
          value={values.description}
          onChange={(event) => set("description", event.target.value)}
          placeholder="Atrasados — aposentadoria por idade"
          isRequired
          isDisabled={isSubmitting}
          isInvalid={!!errorOf("description")}
          errorMessage={errorOf("description")}
        />

        <AmountField
          label="Valor"
          value={values.amount}
          onChange={(next) => set("amount", next)}
          isRequired
          isDisabled={isSubmitting}
          isInvalid={!!errorOf("amount")}
          errorMessage={errorOf("amount")}
        />
        <DatePickerField
          label="Previsão de crédito"
          value={values.expectedDate}
          onChange={(next) => set("expectedDate", next)}
          allowFuture
          isRequired
          isDisabled={isSubmitting}
          isInvalid={!!errorOf("expectedDate")}
          errorMessage={errorOf("expectedDate")}
        />

        {/* Atrasados costumam vir parcelados pelo próprio INSS. Os dois
            campos são irmãos na grade — o par divide a linha como valor e
            vencimento acima —, e a mensagem embaixo vale para os dois. */}
        <Field
          label="Parcela"
          value={values.installmentNumber}
          onChange={(event) => set("installmentNumber", event.target.value)}
          placeholder="1"
          isDisabled={isSubmitting}
          isInvalid={!!errorOf("installmentNumber")}
        />
        <Field
          label="De"
          value={values.installmentTotal}
          onChange={(event) => set("installmentTotal", event.target.value)}
          placeholder="6"
          isDisabled={isSubmitting}
          isInvalid={!!errorOf("installmentNumber")}
        />
        {errorOf("installmentNumber") ? (
          <p className="col-span-full -mt-2 text-sm text-danger">
            {errorOf("installmentNumber")}
          </p>
        ) : (
          <p className="col-span-full -mt-2 text-xs text-gray-100/60">
            Opcional. Deixe em branco para pagamento único.
          </p>
        )}

        <SwitchField
          label="O cliente já recebeu?"
          className="col-span-full"
          value={values.isReceived}
          onChange={(next) => {
            set("isReceived", next);
            if (!next) set("receivedDate", "");
          }}
          hint={values.isReceived ? "Sim, já foi creditado" : "Ainda a receber"}
          isDisabled={isSubmitting}
        />

        {values.isReceived && (
          <DatePickerField
            label="Data do crédito"
            className="col-span-full"
            value={values.receivedDate}
            onChange={(next) => set("receivedDate", next)}
            isRequired
            isDisabled={isSubmitting}
            isInvalid={!!errorOf("receivedDate")}
            errorMessage={errorOf("receivedDate")}
          />
        )}

        <TextAreaField
          label="Observações"
          className="col-span-full"
          value={values.notes}
          onChange={(next) => set("notes", next)}
          rows={3}
          placeholder="Nº do benefício, competência dos atrasados..."
          isDisabled={isSubmitting}
        />
      </FieldGrid>
    </FormModal>
  );
}
