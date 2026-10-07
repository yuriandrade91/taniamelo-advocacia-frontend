"use client";

import { useState } from "react";
import { useSectionForm } from "@/hooks/useSectionForm";
import { patchPayment } from "@/services/clientPaymentService";
import { notificationCenter } from "@/services/notificationService";
import {
  emptyPaymentForm,
  paymentFormFrom,
  paymentRules,
  paymentSchema,
  patchVazio,
  toPaymentPatch,
  type PaymentFormValues,
} from "./paymentForm";
import type { ClientPaymentResponse } from "@/interfaces/client/ClientSubResources.interface";

/**
 * Estado, validação e envio da edição de uma parcela.
 *
 * Saiu do `EditPaymentModal` quando a edição passou a acontecer também
 * **dentro do painel de detalhes** — o mesmo caminho do `useEntryForm` na
 * Carteira. A regra do PATCH (mandar só o que mudou) existe uma vez, e o
 * modal e o painel só desenham.
 *
 * Os campos vêm de `paymentSchema`: rótulo, obrigatoriedade e validador são
 * declarados lá, não aqui.
 */

export type PaymentEditing = {
  clientId: string;
  /** O registro como está gravado — base do "só o que mudou". */
  payment: ClientPaymentResponse;
  /** Valores iniciais; ausente, saem do registro. */
  values?: PaymentFormValues;
};

export function usePaymentForm(editing: PaymentEditing | null) {
  const form = useSectionForm({
    schema: paymentSchema,
    initial: emptyPaymentForm(),
    // A data do recebimento só é exigida com a caixa marcada: é regra de par
    // de campos, não do campo sozinho.
    rules: paymentRules(),
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  /*
   * Semeia pelo id (e pela origem dos valores), e não pelo objeto: quem chama
   * monta `editing` a cada render, e depender da referência apagaria o que a
   * pessoa está digitando. Ajuste no render: a edição já abre preenchida.
   */
  const seedKey = editing
    ? `${editing.payment.id}:${editing.values ? "seeded" : "record"}`
    : null;
  const [seededKey, setSeededKey] = useState<string | null>(null);
  if (seedKey !== seededKey) {
    setSeededKey(seedKey);
    form.reset(
      editing ? (editing.values ?? paymentFormFrom(editing.payment)) : undefined,
    );
  }

  /**
   * Valida e grava. `"saved"` gravou; `"unchanged"` não havia o que mandar
   * (já avisou "Nada foi alterado."); `null` não gravou — erro de validação,
   * que fica revelado, ou da requisição, que o axiosService já mostrou.
   */
  const submit = async (): Promise<"saved" | "unchanged" | null> => {
    if (!form.revealErrors() || !editing) return null;

    const patch = toPaymentPatch(form.values, editing.payment);
    if (patchVazio(patch)) {
      // Sucesso sem mudança ensina a clicar em "Salvar" por reflexo só para
      // conferir se salvou.
      notificationCenter.info("Nada foi alterado.");
      return "unchanged";
    }

    setIsSubmitting(true);
    try {
      await patchPayment(editing.clientId, editing.payment.id, patch);
      notificationCenter.success("Parcela atualizada.");
      return "saved";
    } catch {
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { ...form, isSubmitting, submit };
}

export type PaymentForm = ReturnType<typeof usePaymentForm>;
