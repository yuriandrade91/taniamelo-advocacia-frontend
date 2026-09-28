"use client";

import { useState } from "react";
import { ComboBox, Input, Label, ListBox } from "@heroui/react";

import FormModal from "@/components/ui/modals/FormModal/FormModal";
import {
  DatePickerField,
  Field,
  SwitchField,
  TextAreaField,
} from "@/components/ui/form/Field";
import { AmountField } from "@/components/ui/form/AmountField";
import { useClientSearch } from "@/hooks/useClientSearch";
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
  const [revealed, setRevealed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const errors = validateBenefitPayment(values);
  const errorOf = (key: keyof BenefitPaymentValues) =>
    revealed ? errors[key] : undefined;

  const set = <K extends keyof BenefitPaymentValues>(
    key: K,
    value: BenefitPaymentValues[K],
  ) => setValues((current) => ({ ...current, [key]: value }));

  const { suggestions } = useClientSearch({
    query: values.clientName,
    linkedClientId: values.clientId,
    enabled: isOpen && !isSubmitting,
  });

  const close = () => {
    setValues(emptyBenefitPayment());
    setRevealed(false);
    onOpenChange(false);
  };

  const handleConfirm = async () => {
    setRevealed(true);
    if (hasErrors(errors)) return;

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
      confirmLabel="Lançar"
      onConfirm={handleConfirm}
      isSubmitting={isSubmitting}
    >
      <div className="flex flex-col gap-4">
        <div
          role="status"
          className="rounded-xl border border-black/5 bg-light-secondary/60 px-4 py-3 text-sm text-primary"
        >
          <p className="font-medium">O lançamento é gravado</p>
          <p className="mt-1 text-gray-100">
            Ele fica na ficha do cliente. A listagem desta tela só vai mostrá-lo
            depois que <code>/api/v1/payments</code> existir no backend.
          </p>
        </div>

        <div>
          <ComboBox
            inputValue={values.clientName}
            onInputChange={(text) => {
              setValues((current) => ({
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
                setValues((current) => ({
                  ...current,
                  clientId: match.id ?? "",
                  clientName: match.fullName,
                }));
              }
            }}
            allowsCustomValue
            allowsEmptyCollection
            isRequired
            isInvalid={!!errorOf("clientName")}
            isDisabled={isSubmitting}
          >
            <Label
              className="text-secondary"
              isRequired
              isInvalid={!!errorOf("clientName")}
            >
              Cliente
            </Label>
            <ComboBox.InputGroup>
              <Input placeholder="Nome da pessoa" className="form-border-style" />
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
            <p className="mt-1 text-sm text-danger">{errorOf("clientName")}</p>
          ) : null}
        </div>

        <Field
          label="Descrição"
          value={values.description}
          onChange={(event) => set("description", event.target.value)}
          placeholder="Atrasados — aposentadoria por idade"
          isRequired
          isDisabled={isSubmitting}
          isInvalid={!!errorOf("description")}
          errorMessage={errorOf("description")}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        </div>

        <div>
          {/* Atrasados costumam vir parcelados pelo próprio INSS. */}
          <div className="grid grid-cols-2 gap-4">
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
          </div>
          {errorOf("installmentNumber") ? (
            <p className="mt-1 text-sm text-danger">
              {errorOf("installmentNumber")}
            </p>
          ) : (
            <p className="mt-1 text-xs text-gray-100/60">
              Opcional. Deixe em branco para pagamento único.
            </p>
          )}
        </div>

        <SwitchField
          label="O cliente já recebeu?"
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
          value={values.notes}
          onChange={(next) => set("notes", next)}
          rows={3}
          placeholder="Nº do benefício, competência dos atrasados..."
          isDisabled={isSubmitting}
        />
      </div>
    </FormModal>
  );
}
