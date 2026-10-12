"use client";

import type { ReactNode } from "react";
import Drawer from "./Drawer";

/**
 * O painel de um registro (parcela, lançamento): o detalhe e, no mesmo
 * lugar, a edição.
 *
 * - Lendo, não há rodapé: as ações são do próprio detalhe.
 * - Editando, fechar (Esc, fundo, "Voltar") volta para o detalhe em vez de
 *   fechar o painel e perder o contexto; "Salvar alterações" grava.
 * - Carregando, o skeleton do detalhe; falhando, o aviso no lugar dele.
 */
export function RecordDrawer({
  onClose,
  onBack,
  isEditing,
  title,
  description,
  onSave,
  isSubmitting,
  failed,
  failedText,
  isLoading,
  skeleton,
  editor,
  dialogs,
  children,
}: {
  onClose: () => void;
  /** Sair da edição de volta para o detalhe. */
  onBack: () => void;
  isEditing: boolean;
  title: string;
  description?: string;
  onSave: () => void;
  isSubmitting: boolean;
  failed: boolean;
  /** "Não foi possível carregar esta parcela". */
  failedText: string;
  isLoading: boolean;
  skeleton: ReactNode;
  editor: ReactNode;
  /** Diálogos do painel (confirmar a edição) — montados em qualquer estado. */
  dialogs?: ReactNode;
  /** O detalhe, em leitura. */
  children: ReactNode;
}) {
  return (
    <Drawer
      isOpen
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      confirmClose={isEditing}
      onRequestClose={onBack}
      title={title}
      description={isEditing ? description : undefined}
      hideFooter={!isEditing}
      confirmLabel="Salvar alterações"
      cancelLabel="Voltar"
      onConfirm={onSave}
      isSubmitting={isSubmitting}
      dialogClassName="w-full sm:w-[520px]"
    >
      {failed ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-danger/20 bg-danger/5 px-6 py-10 text-center">
          <p className="text-sm font-medium text-primary">{failedText}</p>
          <p className="text-xs text-gray-100/70">Feche o painel e tente de novo.</p>
        </div>
      ) : isLoading ? (
        skeleton
      ) : isEditing ? (
        editor
      ) : (
        children
      )}
      {dialogs}
    </Drawer>
  );
}
