"use client";

import type { ReactNode } from "react";
// O desenho viaja com a grade: quem põe campos numa `FieldGrid` ganha o
// rótulo dentro da caixa sem precisar lembrar de importar o estilo.
import "./formFields.css";

/**
 * A grade de campos — a mesma em toda a aplicação, do cadastro de cliente às
 * modais e aos painéis.
 *
 * - `4`: o cadastro, que ocupa a página inteira (uma coluna no celular, duas no
 *   tablet, quatro no desktop);
 * - `2` (padrão): modais e painéis largos;
 * - `1`: painel estreito, onde campos lado a lado ficariam espremidos.
 *
 * A âncora `data-form-fields` é o que põe o rótulo dentro da moldura
 * (`formFields.css`), e ela é uma só para qualquer número de colunas.
 *
 * Os campos precisam ser **filhos diretos**: o desenho posiciona o rótulo
 * sobre a caixa de cada célula. Quem ocupa a linha inteira pede
 * `col-span-full`, que vale em qualquer número de colunas — `col-span-2` numa
 * grade de uma coluna criaria uma segunda, invisível e torta.
 */

/** Classes literais: o Tailwind só gera o que encontra escrito. */
const COLUMNS = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
} as const;

export function FieldGrid({
  columns = 2,
  children,
}: {
  columns?: keyof typeof COLUMNS;
  children: ReactNode;
}) {
  return (
    <div data-form-fields="" className={`grid gap-4 ${COLUMNS[columns]}`}>
      {children}
    </div>
  );
}
