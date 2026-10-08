"use client";

import ConfirmDialog from "@/components/ui/modals/ConfirmDialog/ConfirmDialog";

/**
 * Confirmação de exclusão de cliente — o `ConfirmDialog` com o texto do caso.
 * Rótulos que dizem o que acontece ("Excluir" / "Manter") em vez de
 * "Sim" / "Não", que só fazem sentido relidos junto com o título.
 */

interface DeleteClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  onConfirm?: () => void;
}

export default function DeleteClientModal({
  isOpen,
  onClose,
  clientName,
  onConfirm,
}: DeleteClientModalProps) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={() => onConfirm?.()}
      tone="danger"
      heading="Excluir cliente?"
      confirmLabel="Excluir"
      cancelLabel="Manter"
      description={
        <>
          <span className="font-medium">{clientName}</span> será removido da
          lista. Essa ação não pode ser desfeita.
        </>
      }
    />
  );
}
