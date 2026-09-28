import type { SelectFieldOption } from "./Field";

/**
 * Converte as `Options` dos enums no formato do `SelectField`.
 *
 * O `id` passa a ser a **chave do enum** (`value`), não o índice posicional.
 * Isso importa: com `id` posicional, inserir um valor novo no meio do enum
 * reatribui silenciosamente o significado de toda seleção já gravada — é o
 * item 2 do `REVISAO_ARQUITETURA_2026`, resolvido aqui por construção.
 */
export const toSelectOptions = (
  options: readonly { value: string; label: string }[],
): SelectFieldOption[] =>
  options.map((option) => ({ id: option.value, label: option.label }));
