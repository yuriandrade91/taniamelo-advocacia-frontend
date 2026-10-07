"use client";

import { CheckCircleIcon } from "@/components/ui/icons/glyphs";
import {
  RowActions,
  deleteAction,
  editAction,
  viewAction,
  type RowAction,
} from "@/components/ui/table/RowActions";
import { canRegister, type Payment } from "../paymentDisplay";
import type { PaymentActions } from "./types";

/**
 * As ações de uma parcela, só em ícones, com os nomes acessíveis de sempre.
 * Registrar recebimento (check verde) vem primeiro — é o que a parcela em
 * aberto pede — e só aparece em atrasado e previsto.
 */
const paymentActions = (actions: PaymentActions): RowAction<Payment>[] => [
  {
    id: "register",
    label: "Registrar recebimento",
    icon: <CheckCircleIcon className="h-5 w-5" />,
    tone: "success",
    visible: canRegister,
    onPress: actions.onRegisterReceipt,
  },
  viewAction("Ver detalhes da parcela", actions.onView),
  editAction("Editar parcela", actions.onEdit),
  deleteAction("Excluir parcela", actions.onDelete),
];

export function PaymentRowActions({
  payment,
  actions,
  className = "",
}: {
  payment: Payment;
  actions: PaymentActions;
  className?: string;
}) {
  return <RowActions row={payment} actions={paymentActions(actions)} className={className} />;
}
