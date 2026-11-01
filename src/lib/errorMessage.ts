import { optionalText } from "@/lib/formValues";

/**
 * A mensagem de uma falha para a tela: a do backend (`response.data.message`)
 * quando houver, senão a do erro, senão `fallback`. A do erro só vale se foi o
 * app que o lançou: a do axios é técnica e em inglês ("timeout of 10000ms
 * exceeded", "Network Error").
 */
export function messageOf(reason: unknown, fallback: string): string {
  const e = reason as { isAxiosError?: boolean; message?: string; response?: { data?: { message?: string } } };
  return optionalText(e?.response?.data?.message) ?? (e?.isAxiosError ? null : optionalText(e?.message)) ?? fallback;
}
