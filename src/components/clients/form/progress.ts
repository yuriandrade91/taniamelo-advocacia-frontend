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
 * Campos exigidos pelo `POST /clients`, na ordem em que aparecem no
 * formulário. `inssPassword` está aqui apesar de morar em "Dados
 * profissionais": é `@NotBlank` no payload de criação.
 */
export const REQUIRED_CREATE_KEYS = [
  "benefit",
  "situation",
  "fullName",
  "birthDate",
  "cpf",
  "motherName",
  "gender",
  "mobilePhone",
  "inssPassword",
] as const;
