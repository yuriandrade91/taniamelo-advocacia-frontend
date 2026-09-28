"use client";

import React from "react";
import { Button, Tooltip } from "@heroui/react";

/**
 * Botão de ação de linha de tabela, com tooltip.
 *
 * Extraído do `AppointmentsCard` para virar o padrão único do projeto — a
 * página de clientes tinha a própria versão, baseada em `<Image>` apontando
 * para SVGs de `public/`, o que impedia colorir o ícone por estado (um `<img>`
 * não herda `currentColor`) e trazia uma requisição por ícone.
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
export const ACTION_TONE_CLASSES = {
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

export type ActionTone = keyof typeof ACTION_TONE_CLASSES;

export type ActionButtonProps = {
  /** Vira o texto do tooltip e o `aria-label`. */
  label: string;
  onClick: () => void;
  isDisabled?: boolean;
  tone: ActionTone;
  children: React.ReactNode;
};

export default function ActionButton({
  label,
  onClick,
  isDisabled = false,
  tone,
  children,
}: ActionButtonProps) {
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
        className={`cursor-pointer rounded-md bg-transparent p-1 disabled:cursor-not-allowed disabled:opacity-50 ${ACTION_TONE_CLASSES[tone]}`}
      >
        {children}
      </Button>
    </Tooltip>
  );
}
