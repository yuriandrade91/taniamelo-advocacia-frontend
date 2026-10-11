"use client";

import React from "react";
import { Button, Tooltip } from "@heroui/react";

/**
 * Botão só de ícone, com tooltip — as ações de linha (`RowActions`) e os
 * atalhos de um cartão.
 *
 * Não confundir com o `ActionButton` de `ActionGroup`, que tem texto e é o
 * botão das barras de ação. O ícone é de traço (`ui/icons`), herda
 * `currentColor` e por isso ganha a cor do tom.
 *
 * ⚠️ O trigger PRECISA ser o `Button` do HeroUI, não um `<button>` nativo: o
 * `TooltipTrigger` do React Aria injeta os handlers de hover/foco via contexto,
 * e só quem consome esse contexto internamente (o `useButton` por trás do
 * `Button`) os recebe — com `<button>` puro o tooltip nunca abre.
 * `Tooltip.Content` vem como irmão, ANTES do trigger.
 */

/**
 * Cor por intenção da ação: o ícone já nasce colorido (não só no hover) e o
 * hover é a mesma cor a 10% de fundo, no padrão de `StatusBadge`/`DeltaBadge`.
 * Um cinza único para todas as ações não diferencia "ler" de "destruir".
 */
const TONE_CLASSES = {
  /** Somente leitura — não altera nada. */
  neutral: "text-gray-100 hover:bg-gray-100/10",
  /** Azul da marca: abrir/entrar (detalhes, reunião). */
  primary: "text-primary hover:bg-primary/10",
  /** Dourado da marca: "isto modifica o registro" (editar, reagendar). */
  secondary: "text-secondary hover:bg-secondary/10",
  /** Concluir. */
  success: "text-success hover:bg-success/10",
  /** Chamativo, mas reversível — diferente do vermelho da exclusão. */
  warning: "text-orange-500 hover:bg-orange-500/10",
  /** A única ação realmente destrutiva. */
  danger: "text-danger hover:bg-danger/10",
} as const;

export type IconButtonTone = keyof typeof TONE_CLASSES;

export type IconButtonProps = {
  /** Vira o texto do tooltip e o `aria-label`. */
  label: string;
  onClick: () => void;
  isDisabled?: boolean;
  tone: IconButtonTone;
  children: React.ReactNode;
};

export function IconButton({
  label,
  onClick,
  isDisabled = false,
  tone,
  children,
}: IconButtonProps) {
  return (
    <Tooltip delay={0}>
      <Tooltip.Content showArrow placement="bottom">
        <Tooltip.Arrow />
        <p>{label}</p>
      </Tooltip.Content>
      <Button
        type="button"
        variant="ghost"
        aria-label={label}
        onClick={onClick}
        isDisabled={isDisabled}
        className={`cursor-pointer rounded-md bg-transparent p-1 disabled:cursor-not-allowed disabled:opacity-50 ${TONE_CLASSES[tone]}`}
      >
        {children}
      </Button>
    </Tooltip>
  );
}
