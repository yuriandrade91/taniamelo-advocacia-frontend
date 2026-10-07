"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import svgPaths from "@/constants/svg/paths";
import TableActionButton, { type ActionTone } from "./ActionButton";

/**
 * Ações de uma linha como dados: ordem, rótulo acessível (o que os e2e
 * procuram), ícone, tom e quando aparece. A ordem da lista é a da tela —
 * "ver" primeiro, "excluir" por último.
 */
export type RowAction<T> = {
  id: string;
  label: string;
  icon: ReactNode;
  tone: ActionTone;
  /** Sem isto, sempre visível. */
  visible?: (row: T) => boolean;
  onPress: (row: T) => void;
};

const svgIcon = (src: string) => (
  <Image src={src} alt="" height={20} width={20} className="h-5 w-5" />
);

/** Os ícones de sempre: ver, editar, excluir. */
export const ROW_ICONS = {
  view: svgIcon(svgPaths.ICONS.DETAILS),
  edit: svgIcon(svgPaths.ICONS.EDIT),
  delete: svgIcon(svgPaths.ICONS.TRASH),
} as const;

/** Factories das três ações comuns — o rótulo é da tela ("Editar despesa"). */
export const viewAction = <T,>(label: string, onPress: (row: T) => void): RowAction<T> => ({
  id: "view",
  label,
  icon: ROW_ICONS.view,
  tone: "neutral",
  onPress,
});
export const editAction = <T,>(label: string, onPress: (row: T) => void): RowAction<T> => ({
  id: "edit",
  label,
  icon: ROW_ICONS.edit,
  tone: "secondary",
  onPress,
});
export const deleteAction = <T,>(
  label: string,
  onPress: (row: T) => void,
  visible?: (row: T) => boolean,
): RowAction<T> => ({ id: "delete", label, icon: ROW_ICONS.delete, tone: "danger", onPress, visible });

export function RowActions<T>({
  row,
  actions,
  className = "",
}: {
  row: T;
  actions: readonly RowAction<T>[];
  className?: string;
}) {
  return (
    <span className={`flex shrink-0 items-center gap-0.5 ${className}`}>
      {actions
        .filter((action) => action.visible?.(row) ?? true)
        .map((action) => (
          <TableActionButton
            key={action.id}
            label={action.label}
            tone={action.tone}
            onClick={() => action.onPress(row)}
          >
            {action.icon}
          </TableActionButton>
        ))}
    </span>
  );
}
