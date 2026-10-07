"use client";

import type { ReactNode } from "react";
// O desenho viaja com a grade: quem põe campos numa `FieldGrid` ganha o
// rótulo dentro da caixa sem precisar lembrar de importar o estilo.
import "./formFields.css";

/**
 * A grade de campos de uma modal ou de um painel: duas colunas, uma só quando
 * o espaço é estreito (`compact`).
 *
 * É a irmã menor da `FormGrid` do cadastro, que tem quatro colunas porque
 * ocupa a página inteira. As duas declaram a mesma âncora,
 * `data-form-fields` — é ela que põe o rótulo dentro da moldura
 * (`formFields.css`).
 *
 * Os campos precisam ser **filhos diretos**: o desenho posiciona o rótulo
 * sobre a caixa de cada célula. Quem ocupa a linha inteira pede
 * `col-span-full`, que vale em qualquer número de colunas — `col-span-2` numa
 * grade de uma coluna criaria uma segunda, invisível e torta.
 */
export function FieldGrid({
  compact = false,
  children,
}: {
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      data-form-fields=""
      className={`grid gap-4 ${compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}
    >
      {children}
    </div>
  );
}
