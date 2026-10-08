/**
 * Links de contato em um toque — WhatsApp, ligação, e-mail. Nulos quando o
 * dado não basta para montar o link (telefone incompleto, e-mail sem arroba):
 * quem desenha o botão (`ContactAction`) some em vez de virar link quebrado.
 *
 * Saíram da fila de leads quando o cartão de aniversariantes passou a
 * precisar do mesmo WhatsApp.
 */

/** Só os dígitos, com o 55 do Brasil na frente quando falta. */
export function toPhoneDigits(phone?: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  // 10 (fixo com DDD) ou 11 (celular com DDD) dígitos é número nacional.
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  // 12/13 já vem com o código do país.
  if (digits.length === 12 || digits.length === 13) return digits;
  return null;
}

/**
 * Link do WhatsApp, com a mensagem já escrita quando ela é passada.
 *
 * `wa.me` aceita `?text=` e abre a conversa com o texto pronto no campo de
 * envio — nada é enviado sozinho, a pessoa lê e decide.
 */
export const whatsappLink = (phone?: string, message?: string): string | null => {
  const digits = toPhoneDigits(phone);
  if (!digits) return null;
  return message
    ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${digits}`;
};

export const telLink = (phone?: string): string | null => {
  const digits = toPhoneDigits(phone);
  return digits ? `tel:+${digits}` : null;
};

export const mailtoLink = (email?: string): string | null =>
  email && email.includes("@") ? `mailto:${email}` : null;
