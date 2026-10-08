/**
 * A mensagem de uma falha para a tela: a do backend (`response.data.message`)
 * quando houver, senão a do erro, senão `fallback`.
 */
export function messageOf(reason: unknown, fallback: string): string {
  const e = reason as { message?: string; response?: { data?: { message?: string } } };
  return e?.response?.data?.message || e?.message || fallback;
}
