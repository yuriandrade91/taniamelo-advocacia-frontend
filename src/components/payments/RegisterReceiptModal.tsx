"use client";

import { useEffect, useState } from "react";

import FormModal from "@/components/ui/modals/FormModal/FormModal";
import { DatePickerField, TextAreaField } from "@/components/ui/form/Field";
import { patchPayment } from "@/services/clientPaymentService";
import { notificationCenter } from "@/services/notificationService";
import { formatBRL, formatDateBR, formatInstallment } from "@/lib/format";
import { todayIso } from "@/lib/period";
import { validatePaidDate } from "@/lib/validators/validators";
import type { OfficePaymentResponse } from "@/interfaces/payment/OfficePayment.interface";

/**
 * Confirmar que o **cliente** recebeu do INSS.
 *
 * Quem recebe aqui é o cliente, não o escritório: esta tela acompanha
 * atrasados e benefício, e o dinheiro vai do INSS para a conta dele.
 *
 * ## Por que é uma tela e não um botão que resolve sozinho
 *
 * Confirmar com um clique gravaria "hoje" como data do crédito. Na prática o
 * INSS creditou no dia 5, o cliente avisou na semana seguinte, e quem lança
 * lança depois. A data importa: é por ela que se sabe quanto tempo o
 * benefício levou para cair, e é o que a pessoa vai conferir contra o extrato
 * do cliente. Perguntar custa um campo; consertar depois custa descobrir
 * primeiro que está errado.
 *
 * ## O que acontece no servidor
 *
 * `PATCH /clients/{clientId}/payments/{paymentId}` com `status: PAGO`. O
 * service em Java preenche `paidDate` com hoje quando ela não vem — mandamos
 * mesmo assim, para o gravado ser exatamente o que a pessoa viu na tela.
 */

export type RegisterReceiptModalProps = {
  /** A parcela que o cliente tem a receber. `null` mantém o modal fechado. */
  payment: OfficePaymentResponse | null;
  onClose: () => void;
  onSaved: () => void;
};

export function RegisterReceiptModal({
  payment,
  onClose,
  onSaved,
}: RegisterReceiptModalProps) {
  const [paidDate, setPaidDate] = useState("");
  const [notes, setNotes] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Semeia a cada parcela aberta. Hoje é o padrão certo — é o caso comum — mas
   * o campo continua editável, que é o ponto todo do modal.
   *
   * O PATCH não toca em `paymentMethod`: crédito do INSS cai em conta, e as
   * opções do enum (Pix, boleto, cartão) são formas de alguém pagar. Reenviar
   * o valor que já estava lá só criaria a chance de sobrescrevê-lo por engano.
   */
  useEffect(() => {
    if (!payment) return;
    setPaidDate(todayIso());
    setNotes("");
    setRevealed(false);
  }, [payment]);

  const dateError = validatePaidDate(paidDate, true);
  const errorOf = (message: string | null) => (revealed ? message ?? undefined : undefined);

  const handleConfirm = async () => {
    setRevealed(true);
    if (!payment || dateError) return;

    setIsSubmitting(true);
    try {
      await patchPayment(payment.clientId, payment.id, {
        status: "PAGO",
        paidDate,
        notes: notes.trim() || undefined,
      });
      notificationCenter.success("Crédito confirmado.");
      onSaved();
      onClose();
    } catch {
      // O axiosService já mostrou o erro da requisição.
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormModal
      isOpen={payment !== null}
      onOpenChange={(open) => !open && onClose()}
      title="Confirmar crédito"
      confirmLabel="Confirmar"
      onConfirm={handleConfirm}
      isSubmitting={isSubmitting}
    >
      <div className="flex flex-col gap-4">
        {payment && (
          // O resumo não é enfeite: sem ele, quem abriu a linha errada na
          // tabela só descobre depois de gravar.
          <div className="rounded-xl border border-black/5 bg-light-gray/40 px-4 py-3 text-sm">
            <p className="font-medium text-primary">{payment.clientName}</p>
            <p className="mt-0.5 text-gray-100">{payment.description}</p>
            <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
              <div>
                <dt className="text-gray-100">Valor</dt>
                <dd className="font-medium text-primary tabular-nums">
                  {payment.amount === undefined ? "—" : formatBRL(payment.amount)}
                </dd>
              </div>
              <div>
                <dt className="text-gray-100">Previsão</dt>
                <dd className="text-primary">{formatDateBR(payment.dueDate)}</dd>
              </div>
              <div>
                <dt className="text-gray-100">Parcela</dt>
                <dd className="text-primary">
                  {formatInstallment(
                    payment.installmentNumber,
                    payment.installmentTotal,
                  )}
                </dd>
              </div>
            </dl>
          </div>
        )}

        <div>
          <DatePickerField
            label="Data do crédito"
            value={paidDate}
            onChange={setPaidDate}
            isRequired
            isDisabled={isSubmitting}
            isInvalid={!!errorOf(dateError)}
            errorMessage={errorOf(dateError)}
          />
        </div>

        <TextAreaField
          label="Observações"
          value={notes}
          onChange={setNotes}
          rows={3}
          placeholder="Nº do benefício, valor divergente do previsto..."
          isDisabled={isSubmitting}
        />
      </div>
    </FormModal>
  );
}
