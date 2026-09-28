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
export function segundosDeEspera(
  retryAfter: string | number | null | undefined,
  agora: Date = new Date(),
): number | null {
  if (retryAfter === null || retryAfter === undefined) return null;

  const texto = String(retryAfter).trim();
  if (!texto) return null;

  if (/^\d+$/.test(texto)) {
    const segundos = Number(texto);
    return Number.isFinite(segundos) && segundos > 0 ? segundos : null;
  }

  const quando = Date.parse(texto);
  if (Number.isNaN(quando)) return null;
  const segundos = Math.ceil((quando - agora.getTime()) / 1000);
  return segundos > 0 ? segundos : null;
}

/**
 * "em 45 segundos", "em 2 minutos", "em 1 minuto".
 *
 * Arredonda para cima: prometer 1 minuto e ainda recusar aos 61 segundos faz a
 * pessoa achar que o sistema está quebrado.
 */
export function esperaLegivel(
  retryAfter: string | number | null | undefined,
  agora: Date = new Date(),
): string | null {
  const segundos = segundosDeEspera(retryAfter, agora);
  if (segundos === null) return null;

  if (segundos < 60) return `em ${segundos} segundo${segundos === 1 ? "" : "s"}`;

  const minutos = Math.ceil(segundos / 60);
  return `em ${minutos} minuto${minutos === 1 ? "" : "s"}`;
}

/** A frase inteira mostrada no login quando o backend devolve 429. */
export function mensagemDeMuitasTentativas(
  retryAfter: string | number | null | undefined,
  agora: Date = new Date(),
): string {
  const espera = esperaLegivel(retryAfter, agora);
  return espera
    ? `Muitas tentativas. Tente novamente ${espera}.`
    : "Muitas tentativas. Tente novamente em alguns minutos.";
}
