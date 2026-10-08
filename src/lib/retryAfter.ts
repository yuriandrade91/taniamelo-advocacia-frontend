/**
 * Traduz o header `Retry-After` em "quando posso tentar de novo", em português.
 *
 * O backend freia o login depois de algumas senhas erradas e responde 429 com
 * esse header. Sem ele a tela só poderia dizer "tente mais tarde", e quem leu
 * isso tenta de novo imediatamente — que é exatamente o que o freio quer
 * evitar. Dizer o tempo transforma a recusa em instrução.
 *
 * O RFC permite segundos OU uma data HTTP. O backend manda segundos; a data é
 * aceita aqui porque um proxy no meio do caminho pode reescrever o header, e
 * nesse dia a mensagem continuaria certa.
 *
 * Ausente ou ilegível devolve `null` — quem chama mostra o texto genérico em
 * vez de inventar um número.
 */
export function waitSeconds(
  retryAfter: string | number | null | undefined,
  agora: Date = new Date(),
): number | null {
  if (retryAfter === null || retryAfter === undefined) return null;

  const text = String(retryAfter).trim();
  if (!text) return null;

  if (/^\d+$/.test(text)) {
    const seconds = Number(text);
    return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
  }

  const when = Date.parse(text);
  if (Number.isNaN(when)) return null;
  const seconds = Math.ceil((when - agora.getTime()) / 1000);
  return seconds > 0 ? seconds : null;
}

/**
 * "em 45 segundos", "em 2 minutos", "em 1 minuto".
 *
 * Arredonda para cima: prometer 1 minuto e ainda recusar aos 61 segundos faz a
 * pessoa achar que o sistema está quebrado.
 */
export function readableWait(
  retryAfter: string | number | null | undefined,
  agora: Date = new Date(),
): string | null {
  const seconds = waitSeconds(retryAfter, agora);
  if (seconds === null) return null;

  if (seconds < 60) return `em ${seconds} segundo${seconds === 1 ? "" : "s"}`;

  const minutes = Math.ceil(seconds / 60);
  return `em ${minutes} minuto${minutes === 1 ? "" : "s"}`;
}

/** A frase inteira mostrada no login quando o backend devolve 429. */
export function tooManyAttemptsMessage(
  retryAfter: string | number | null | undefined,
  agora: Date = new Date(),
): string {
  const wait = readableWait(retryAfter, agora);
  return wait
    ? `Muitas tentativas. Tente novamente ${wait}.`
    : "Muitas tentativas. Tente novamente em alguns minutos.";
}
