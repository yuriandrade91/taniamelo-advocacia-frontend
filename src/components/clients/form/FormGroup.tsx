"use client";

import type { ReactNode } from "react";
import { FieldGrid } from "@/components/ui/form/FieldGrid";
import { PlusIcon } from "@/components/ui/icons/actions";

/**
 * Um bloco de campos com subtítulo — "Identificação", "Contato" — dentro de
 * uma seção longa. O subtítulo é um rótulo dourado seguido de um filete,
 * para separar sem pesar; a grade é a `FieldGrid` de quatro colunas. `action` fica na
 * ponta do filete (ex.: "Remover" de um período).
 *
 * Seções curtas (Atendimento) dispensam: grupo de um grupo só é ruído.
 */
export function FormGroup({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h3 className="shrink-0 text-xs font-semibold tracking-wider text-secondary uppercase">
          {title}
        </h3>
        <span aria-hidden="true" className="h-px flex-1 bg-light-gray" />
        {action}
      </div>
      <FieldGrid columns={4}>{children}</FieldGrid>
    </div>
  );
}

/** "+ Adicionar …" das listas do formulário (endereços, períodos): cápsula tracejada. */
export function AddItemButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex shrink-0 items-center gap-1.5 rounded-full border border-dashed border-secondary/50 px-3 py-1.5 text-xs font-medium text-secondary hover:bg-light-secondary"
    >
      <PlusIcon className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}
