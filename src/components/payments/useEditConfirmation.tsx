"use client";

import { useState } from "react";
import ConfirmDialog from "@/components/ui/modals/ConfirmDialog/ConfirmDialog";
import type { EditWarning } from "./editWarning";

/**
 * Intercepta o "Editar" de algo que pode estar liquidado ou cancelado.
 *
 * `request(warning, proceed)`: sem aviso, segue direto; com aviso, abre a
 * confirmação e só segue se a pessoa confirmar. `dialog` é o modal — vai uma
 * vez no JSX de quem usa.
 *
 * Tom `primary`, não `danger`: editar não destrói nada, é uma decisão que
 * pede atenção.
 */
export function useEditConfirmation() {
  const [pending, setPending] = useState<{
    warning: EditWarning;
    proceed: () => void;
  } | null>(null);

  const request = (warning: EditWarning | null, proceed: () => void) => {
    if (!warning) {
      proceed();
      return;
    }
    setPending({ warning, proceed });
  };

  const dialog = (
    <ConfirmDialog
      isOpen={pending !== null}
      onClose={() => setPending(null)}
      tone="primary"
      heading={pending?.warning.heading ?? ""}
      description={pending?.warning.description}
      confirmLabel={pending?.warning.confirmLabel}
      cancelLabel="Voltar"
      onConfirm={() => {
        const next = pending;
        setPending(null);
        next?.proceed();
      }}
    />
  );

  return { request, dialog };
}
