"use client";

import type { ReactNode } from "react";
import { Accordion } from "@heroui/react";

/**
 * Uma seção do formulário de cliente: um `Accordion.Item` na variante
 * `surface`, com título, ícone e um selo de estado à direita.
 *
 * É puramente apresentacional — não conhece cliente, service nem validação.
 * Quem decide se a seção está travada, pendente ou salva é a página; aqui só
 * se desenha. Manter assim é o que permite reaproveitar a mesma seção na tela
 * de edição sem arrastar junto a orquestração da criação.
 */

export type FormSectionStatus =
  /** Ainda não existe cliente: a seção depende de `/clients/{id}`. */
  | "locked"
  /** Há campos obrigatórios por preencher. */
  | "pending"
  /** Preenchida e válida, ainda não enviada. */
  | "ready"
  /** Já gravada no servidor. */
  | "saved";

export type FormSectionProps = {
  id: string;
  title: string;
  icon?: ReactNode;
  status?: FormSectionStatus;
  /** Texto do selo. Sem isto, o selo some. */
  statusLabel?: string;
  /** Explicação de por que está travada — vira o subtítulo do cabeçalho. */
  lockedHint?: string;
  children: ReactNode;
};

const STATUS_STYLES: Record<FormSectionStatus, string> = {
  locked: "bg-light-gray/70 text-gray-100",
  pending: "bg-light-secondary text-secondary",
  ready: "bg-light-green text-success",
  saved: "bg-light-green text-success",
};

export function FormSection({
  id,
  title,
  icon,
  status = "pending",
  statusLabel,
  lockedHint,
  children,
}: FormSectionProps) {
  const isLocked = status === "locked";

  return (
    <Accordion.Item id={id} isDisabled={isLocked}>
      <Accordion.Heading>
        <Accordion.Trigger className="w-full">
          <span className="flex w-full items-center gap-3">
            {icon && (
              <span className="flex h-6 w-6 shrink-0 items-center justify-center text-secondary">
                {icon}
              </span>
            )}

            <span className="min-w-0 flex-1 text-left">
              {/* Dourado da marca, como no protótipo — o título da seção é o
                  único texto em `secondary` fora dos rótulos de campo. */}
              <span className="block truncate text-base font-medium text-secondary">
                {title}
              </span>
              {isLocked && lockedHint && (
                <span className="block truncate text-xs font-normal text-gray-100">
                  {lockedHint}
                </span>
              )}
            </span>

            {statusLabel && (
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[status]}`}
              >
                {statusLabel}
              </span>
            )}

            <Accordion.Indicator />
          </span>
        </Accordion.Trigger>
      </Accordion.Heading>

      <Accordion.Panel>
        <Accordion.Body>{children}</Accordion.Body>
      </Accordion.Panel>
    </Accordion.Item>
  );
}

/**
 * Grade padrão dos campos dentro de uma seção.
 *
 * Uma coluna no celular, duas no tablet, quatro no desktop — o mesmo ritmo do
 * print. Cada campo pode ocupar mais colunas com `className="sm:col-span-2"`,
 * o que evita ter que declarar uma grade nova a cada seção.
 */
export function FormGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {children}
    </div>
  );
}
