/**
 * Justificativa de uma mudança de etapa fora do caminho normal (voltar ou
 * pular). Mesma regra do cancelamento de compromisso na agenda: obrigatória,
 * com um mínimo para não virar "ok".
 *
 * Por ora fica **só na tela**: o `PATCH /clients/{id}` ainda não tem campo
 * para ela. Quando tiver, é passar o texto que o diálogo já entrega.
 */

export const MIN_JUSTIFICATION_LENGTH = 10;

/** Mensagem do campo, ou `undefined` quando a justificativa serve. */
export function justificationError(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return "Informe a justificativa.";
  if (trimmed.length < MIN_JUSTIFICATION_LENGTH) {
    return `A justificativa precisa ter pelo menos ${MIN_JUSTIFICATION_LENGTH} caracteres.`;
  }
  return undefined;
}
