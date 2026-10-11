import { requiredKeysOf } from "@/components/ui/form/schema";
import { personalSchema, professionalSchema, serviceSchema } from "./schemas";

/**
 * Progresso de preenchimento do cadastro.
 *
 * Conta apenas os campos que o `POST /clients` exige — é o que o usuário
 * precisa vencer para o cliente existir. Contar campos opcionais faria o anel
 * marcar 40% num cadastro que já pode ser salvo, o que é pior que não ter anel.
 */

/** Um valor conta como preenchido quando tem texto não vazio. */
const isFilled = (value: unknown): boolean =>
  typeof value === "string" ? value.trim().length > 0 : Boolean(value);

export function computeProgress(
  values: Readonly<Record<string, unknown>>,
  requiredKeys: readonly string[],
): number {
  if (requiredKeys.length === 0) return 0;
  const filled = requiredKeys.filter((key) => isFilled(values[key])).length;
  return Math.round((filled / requiredKeys.length) * 100);
}

/**
 * Campos exigidos pelo `POST /clients`: os obrigatórios das três seções que
 * vão nele, lidos dos schemas — a mesma fonte da validação, para o anel e o
 * "Salvar" nunca discordarem. `inssPassword` entra por ser `@NotBlank` na
 * criação, apesar de morar em "Dados profissionais".
 */
export const REQUIRED_CREATE_KEYS = requiredKeysOf(serviceSchema, personalSchema, professionalSchema);
