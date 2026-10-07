"use client";

import type { ReactNode } from "react";
import { Accordion } from "@heroui/react";
import { LoadingCircle } from "@/components/ui/feedback/Loading";
import { PlusIcon } from "@/components/ui/icons/actions";
// O desenho "rótulo dentro" viaja com a grade (ver `FieldGrid`).
import "@/components/ui/form/formFields.css";

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
  /** O selo ainda está sendo contado: círculo indeterminado no lugar do texto. */
  isStatusLoading?: boolean;
  children: ReactNode;
};

export const STATUS_STYLES: Record<FormSectionStatus, string> = {
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
  isStatusLoading = false,
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

            {isStatusLoading ? (
              <span className={`inline-flex h-6 w-12 shrink-0 items-center justify-center rounded-full ${STATUS_STYLES[status]}`}>
                <LoadingCircle size={12} />
              </span>
            ) : statusLabel && (
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
    // `data-form-fields`: âncora do desenho "rótulo dentro"
    // (`ui/form/formFields.css`) — ele mexe só nos campos desta grade.
    <div
      data-form-fields=""
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      {children}
    </div>
  );
}

/**
 * Um bloco de campos com subtítulo — "Identificação", "Contato" — dentro de
 * uma seção longa. O subtítulo é um rótulo dourado seguido de um filete,
 * para separar sem pesar; a grade é a mesma `FormGrid`. `action` fica na
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
      <FormGrid>{children}</FormGrid>
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
